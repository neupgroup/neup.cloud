// DDoS vulnerability testing service
// Tests load bearing capacity of servers by sending concurrent HTTP requests

export interface DDoSTestConfig {
  url: string;
  requestCount: number;
  waitForResponse: boolean;
  maxConcurrentRequests?: number;
  onProgress?: (progress: DDoSTestProgress) => void;
  signal?: AbortSignal;
}

export interface DDoSTestProgress {
  completedRequests: number;
  totalRequests: number;
  failedRequests: number;
  blockedRequests: number;
  timeoutRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastResponseTime: number;
}

export interface DDoSTestResult {
  success: boolean;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  blockedRequests: number;
  timeoutRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  statusCodes: Record<number, number>;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
}

class DDoSTestManager {
  private isRunning = false;
  private abortController: AbortController | null = null;

  async runTest(config: DDoSTestConfig): Promise<DDoSTestResult> {
    if (this.isRunning) {
      throw new Error('A test is already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      // If external abort signal provided, link it
      if (config.signal) {
        config.signal.addEventListener('abort', () => {
          this.abortController?.abort();
        });
      }

      return await this.performAttackTest(config);
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  private async performAttackTest(config: DDoSTestConfig): Promise<DDoSTestResult> {
    const startTime = new Date();
    let responseTimeSum = 0;
    let responseTimeCount = 0;
    let minResponseTime = Number.POSITIVE_INFINITY;
    let maxResponseTime = 0;
    let lastResponseTime = 0;
    const statusCodes: Record<number, number> = {};
    const errors: string[] = [];
    let completedRequests = 0;
    let failedRequests = 0;
    let blockedRequests = 0;
    let timeoutRequests = 0;

    // Validate URL
    try {
      new URL(config.url);
    } catch (err) {
      throw new Error('Invalid URL provided');
    }

    const maxConcurrent = config.waitForResponse ? (config.maxConcurrentRequests || 10) : 100;

    if (config.waitForResponse) {
      // Controlled concurrency - wait for responses
      let activeRequests = 0;

      const sendRequest = async () => {
        while (activeRequests >= maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        if (this.abortController?.signal.aborted) {
          return;
        }

        activeRequests++;

        try {
          const { classification, responseTime } = await this.makeRequest(config.url, statusCodes, errors);
          if (classification === 'blocked') {
            blockedRequests++;
          } else if (classification === 'timeout') {
            timeoutRequests++;
          }

          if (responseTime !== null) {
            responseTimeSum += responseTime;
            responseTimeCount += 1;
            minResponseTime = Math.min(minResponseTime, responseTime);
            maxResponseTime = Math.max(maxResponseTime, responseTime);
            lastResponseTime = responseTime;
          }

          completedRequests++;
        } catch (error) {
          failedRequests++;
        } finally {
          activeRequests--;
          
          // Report progress
          if (config.onProgress) {
            const average = responseTimeCount > 0 ? responseTimeSum / responseTimeCount : 0;
            config.onProgress({
              completedRequests: completedRequests + failedRequests,
              totalRequests: config.requestCount,
              failedRequests,
              blockedRequests,
              timeoutRequests,
              averageResponseTime: Math.round(average * 100) / 100,
              minResponseTime: responseTimeCount > 0 ? Math.round(minResponseTime) : 0,
              maxResponseTime: responseTimeCount > 0 ? Math.round(maxResponseTime) : 0,
              lastResponseTime: responseTimeCount > 0 ? Math.round(lastResponseTime) : 0,
            });
          }
        }
      };

      // Queue all requests
      const promises = [];
      for (let i = 0; i < config.requestCount; i++) {
        promises.push(sendRequest());
      }

      await Promise.all(promises);
    } else {
      // Fire all requests without waiting (for comparison testing)
      const promises = [];

      for (let i = 0; i < config.requestCount; i++) {
        if (this.abortController?.signal.aborted) {
          break;
        }

        promises.push(
          this.makeRequestNoWait(config.url, statusCodes, errors)
            .then((classification) => {
              if (classification === 'blocked') {
                blockedRequests++;
              } else if (classification === 'timeout') {
                timeoutRequests++;
              }
              completedRequests++;
            })
            .catch(() => {
              failedRequests++;
            })
            .finally(() => {
              if (config.onProgress) {
                const average = responseTimeCount > 0 ? responseTimeSum / responseTimeCount : 0;
                config.onProgress({
                  completedRequests: completedRequests + failedRequests,
                  totalRequests: config.requestCount,
                  failedRequests,
                  blockedRequests,
                  timeoutRequests,
                  averageResponseTime: Math.round(average * 100) / 100,
                  minResponseTime: responseTimeCount > 0 ? Math.round(minResponseTime) : 0,
                  maxResponseTime: responseTimeCount > 0 ? Math.round(maxResponseTime) : 0,
                  lastResponseTime: responseTimeCount > 0 ? Math.round(lastResponseTime) : 0,
                });
              }
            })
        );

        // Keep max 100 concurrent even in non-wait mode
        if ((i + 1) % 100 === 0) {
          await Promise.race(promises.slice(-100));
        }
      }

      await Promise.all(promises);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Calculate statistics
    const averageResponseTime = responseTimeCount > 0
      ? responseTimeSum / responseTimeCount
      : 0;

    return {
      success: failedRequests === 0,
      totalRequests: config.requestCount,
      completedRequests,
      failedRequests,
      blockedRequests,
      timeoutRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      minResponseTime: responseTimeCount > 0 ? Math.round(minResponseTime) : 0,
      maxResponseTime: responseTimeCount > 0 ? Math.round(maxResponseTime) : 0,
      statusCodes,
      errors: errors.slice(0, 10), // Keep first 10 errors
      startTime,
      endTime,
      duration,
    };
  }

  private async makeRequest(
    url: string,
    statusCodes: Record<number, number>,
    errors: string[]
  ): Promise<{ classification: 'ok' | 'blocked' | 'timeout'; responseTime: number | null }> {
    const startTime = performance.now();
    let wasAborted = false;
    let classification: 'ok' | 'blocked' | 'timeout' = 'ok';
    let responseTime: number | null = null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: this.abortController?.signal,
        headers: {
          'User-Agent': 'Neup-Cloud-Load-Tester/1.0',
        },
      });

      // Actually consume the response body to measure full roundtrip
      await response.arrayBuffer();

      // Track status code
      if (!statusCodes[response.status]) {
        statusCodes[response.status] = 0;
      }
      statusCodes[response.status]++;

      if (!response.ok) {
        errors.push(`Request failed: ${response.status} ${response.statusText || 'HTTP error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Don't track abort errors as real errors
      if (errorMsg !== 'The operation was aborted.') {
        classification = this.classifyError(errorMsg);
        errors.push(`Request failed: ${errorMsg}`);
      } else {
        wasAborted = true;
      }
    } finally {
      if (!wasAborted) {
        const endTime = performance.now();
        responseTime = endTime - startTime;
      }
    }

    return { classification, responseTime };
  }

  private async makeRequestNoWait(
    url: string,
    statusCodes: Record<number, number>,
    errors: string[]
  ): Promise<'ok' | 'blocked' | 'timeout'> {
    let classification: 'ok' | 'blocked' | 'timeout' = 'ok';

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: this.abortController?.signal,
        headers: {
          'User-Agent': 'Neup-Cloud-Load-Tester/1.0',
        },
      });

      // Track status code without consuming body
      if (!statusCodes[response.status]) {
        statusCodes[response.status] = 0;
      }
      statusCodes[response.status]++;

      if (!response.ok) {
        errors.push(`Request failed: ${response.status} ${response.statusText || 'HTTP error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Don't track abort errors as real errors
      if (errorMsg !== 'The operation was aborted.') {
        classification = this.classifyError(errorMsg);
        errors.push(`Request failed: ${errorMsg}`);
      }
    }

    return classification;
  }

  private classifyError(message: string): 'blocked' | 'timeout' | 'ok' {
    const normalized = message.toLowerCase();

    if (normalized.includes('timeout') || normalized.includes('timed out')) {
      return 'timeout';
    }

    if (
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('blocked') ||
      normalized.includes('cors')
    ) {
      return 'blocked';
    }

    return 'ok';
  }
}

export const ddosTestManager = new DDoSTestManager();

// Utility function to format test results for display
export function formatTestResults(result: DDoSTestResult): string {
  return `
Test Results:
- Total Requests: ${result.totalRequests}
- Completed: ${result.completedRequests}
- Failed: ${result.failedRequests}
- Success Rate: ${((result.completedRequests / result.totalRequests) * 100).toFixed(2)}%
- Average Response Time: ${result.averageResponseTime.toFixed(2)}ms
- Min Response Time: ${result.minResponseTime}ms
- Max Response Time: ${result.maxResponseTime}ms
- Total Duration: ${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)
- Status Codes: ${Object.entries(result.statusCodes).map(([code, count]) => `${code}: ${count}`).join(', ')}
  `.trim();
}
