export const SUPERVISOR_SERVICE_SEPARATOR = '_serving_';
export const SUPERVISOR_SERVICE_TOKEN_LENGTH = 8;

const supervisorServiceTokenPattern = `[0-9A-Za-z]{${SUPERVISOR_SERVICE_TOKEN_LENGTH}}`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSupervisorStateRank(state?: string) {
  const normalizedState = (state || '').toUpperCase();

  if (normalizedState === 'RUNNING') return 0;
  if (normalizedState === 'STARTING') return 1;
  if (normalizedState === 'FATAL' || normalizedState === 'BACKOFF' || normalizedState === 'ERRORED') return 2;
  if (normalizedState === 'STOPPED' || normalizedState === 'EXITED') return 3;
  return 4;
}

export function buildSupervisorServiceName(applicationId: string, token: string) {
  return `${applicationId}${SUPERVISOR_SERVICE_SEPARATOR}${token}`;
}

export function getSupervisorServiceNameMatcher(applicationId: string) {
  return new RegExp(`^${escapeRegExp(applicationId)}${escapeRegExp(SUPERVISOR_SERVICE_SEPARATOR)}${supervisorServiceTokenPattern}$`);
}

export function isSupervisorServiceNameForApplication(processName: string, applicationId: string) {
  return getSupervisorServiceNameMatcher(applicationId).test(processName);
}

export function extractApplicationIdFromSupervisorServiceName(processName: string) {
  const match = processName.match(new RegExp(`^(.+)${escapeRegExp(SUPERVISOR_SERVICE_SEPARATOR)}${supervisorServiceTokenPattern}$`));
  return match?.[1] ?? null;
}

export function findBestSupervisorProcessForApplication<T extends { name: string; state?: string }>(
  applicationId: string,
  processes: T[],
  expectedServiceName?: string
) {
  if (expectedServiceName) {
    const exactMatch = processes.find((process) => process.name === expectedServiceName);
    if (exactMatch) {
      return exactMatch;
    }
  }

  return processes
    .filter((process) => isSupervisorServiceNameForApplication(process.name, applicationId))
    .sort((left, right) => {
      const rankDiff = getSupervisorStateRank(left.state) - getSupervisorStateRank(right.state);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return left.name.localeCompare(right.name);
    })[0] ?? null;
}
