
import { runCommandOnServer } from '@/services/ssh';
import { appendLiveSessionLog, executeQuickCommand } from '@/services/saved-commands/logic';
import { createServerLog, updateServerLog } from '@/services/server-logs/data';
import { getServerForRunner } from '@/services/servers/logic';
import { createLiveSession, getLiveSessionById, updateLiveSession } from '@/services/live-sessions/data';

// Removed cookies usage: Not allowed in this context (App Router restriction)

export async function initLiveSession(sessionId: string, serverId: string | undefined) {
  const session = await getLiveSessionById(sessionId);
  if (session) {
    return session;
  }

  let serverLogId: string | null = null;

  if (serverId) {
    const log = await createServerLog({
      serverId,
      command: `Live Session ${sessionId}`,
      commandName: 'Live Session (Active)',
      output: '',
      status: 'Running',
    });
    serverLogId = log.id;
  }

  return createLiveSession({
    id: sessionId,
    serverLogId,
    serverId: serverId ?? null,
  });
}

export async function endLiveSession(sessionId: string) {
	const session = await getLiveSessionById(sessionId);
	if (!session) {
		return;
	}

	if (session.serverLogId) {
		await updateServerLog(session.serverLogId, {
			status: 'Discontinued',
			commandName: 'Live Session (Ended)',
		});
	}

	await updateLiveSession(sessionId, { status: 'ended' });
}

export async function executeLiveCommand(sessionId: string, serverId: string | undefined, command: string) {
	let session = await getLiveSessionById(sessionId);

	if (!session) {
		session = await initLiveSession(sessionId, serverId);
	}
	// ...rest of the logic from live-sessions/logic.ts as needed
}
