import { getProcessCardStatus, ServerProcess } from '@/app/(main)/server/applications/status';
import type { Application } from '@/app/(main)/server/applications/types';

export function getStoredStatus(application: Application) {
  const syncInfo = application.information?.serverSync;

  if (!syncInfo || syncInfo.status !== 'matched') {
    return getProcessCardStatus(null);
  }

  return getProcessCardStatus({
    name: syncInfo.matchedProcessName || application.information?.supervisorServiceName || application.name,
    state: syncInfo.matchedProcessState || 'UNKNOWN',
    source: 'supervisor',
  });
}
