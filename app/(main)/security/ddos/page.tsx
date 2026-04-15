'use client';

import { useState, useRef } from 'react';
import { PageTitleBack } from '@/components/page-header';
import { ddosTestManager, type DDoSTestProgress, type DDoSTestResult } from '@/services/security/ddos-test';
import { DdosTestCards } from '@/components/security/ddos-test-cards';

// Note: This would be metadata on the server component
// export const metadata: Metadata = {
//   title: 'DDoS Protection, Neup.Cloud',
// };

export default function SecurityDdosPage() {
  const [url, setUrl] = useState('');
  const [requestCount, setRequestCount] = useState(100);
  const [waitForResponse, setWaitForResponse] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [completedRequests, setCompletedRequests] = useState(0);
  const [testResults, setTestResults] = useState<DDoSTestResult | null>(null);
  const [liveProgress, setLiveProgress] = useState<DDoSTestProgress | null>(null);
  const [error, setError] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStartTest = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    if (requestCount < 1 || requestCount > 10000) {
      setError('Request count must be between 1 and 10,000');
      return;
    }

    setError('');
    setIsRunning(true);
    setCompletedRequests(0);
    setTestResults(null);
    setLiveProgress(null);
    abortControllerRef.current = new AbortController();

    try {
      const result = await ddosTestManager.runTest({
        url: url.trim(),
        requestCount,
        waitForResponse,
        onProgress: (progress) => {
          setCompletedRequests(progress.completedRequests);
          setLiveProgress(progress);
        },
        signal: abortControllerRef.current.signal,
      });

      setTestResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopTest = () => {
    if (abortControllerRef.current) {
      ddosTestManager.stop();
      abortControllerRef.current.abort();
      setIsRunning(false);
      setLiveProgress(null);
    }
  };

  const progressPercentage = requestCount > 0 ? (completedRequests / requestCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageTitleBack
        title="DDoS Protection"
        description="Configure rate limiting and traffic defense settings"
        backHref="/security"
      />

      <DdosTestCards
        url={url}
        requestCount={requestCount}
        waitForResponse={waitForResponse}
        isRunning={isRunning}
        completedRequests={completedRequests}
        progressPercentage={progressPercentage}
        error={error}
        testResults={testResults}
        liveProgress={liveProgress}
        onUrlChange={setUrl}
        onRequestCountChange={setRequestCount}
        onWaitForResponseChange={setWaitForResponse}
        onStart={handleStartTest}
        onStop={handleStopTest}
        onClearResults={() => setTestResults(null)}
      />
    </div>
  );
}
