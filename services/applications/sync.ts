import { getApplications } from './data';
import { getSupervisorProcesses } from './processes';
import type { Application } from './types';
import { updateApplication } from './update';
import { findBestSupervisorProcessForApplication } from './utils';

function getSyncPayload(application: Application, matchedProcess: any) {
  if (!matchedProcess) {
    return {
      status: 'missing_on_server' as const,
    };
  }

  return {
    status: 'matched' as const,
    matchedProcessName: matchedProcess.name,
    matchedProcessState: matchedProcess.state,
    matchedProcessSource: matchedProcess.source,
  };
}

export async function syncApplicationsWithServer(serverId: string) {
  const [applications, supervisorProcesses] = await Promise.all([
    getApplications(),
    getSupervisorProcesses(serverId),
  ]);

  const matchedNames = new Set<string>();
  const syncedApplications: Application[] = [];

  for (const application of applications) {
    const matchedProcess = findBestSupervisorProcessForApplication(
      application.id,
      supervisorProcesses,
      application.information?.supervisorServiceName
    );

    if (matchedProcess?.name) {
      matchedNames.add(matchedProcess.name);
    }

    const serverSync = getSyncPayload(application, matchedProcess);
    const currentSync = application.information?.serverSync;
    const syncChanged =
      JSON.stringify(currentSync || null) !== JSON.stringify(serverSync);

    let nextApplication: Application = {
      ...application,
      information: {
        ...(application.information ?? {}),
        serverSync,
      },
    };

    if (syncChanged) {
      nextApplication = await updateApplication(application.id, {
        information: nextApplication.information,
      });
    }

    syncedApplications.push(nextApplication);
  }

  const serverOnlyApplications = supervisorProcesses.filter(
    (process) => !matchedNames.has(process.name)
  );

  return {
    applications: syncedApplications,
    serverOnlyApplications,
  };
}
