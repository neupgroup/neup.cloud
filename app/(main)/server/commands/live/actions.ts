'use server';

import {
  executeLiveCommand as executeLiveCommandLogic,
  endLiveSession as endLiveSessionLogic,
  initLiveSession as initLiveSessionLogic,
} from '@/services/server/commands/live/actions';

export async function initLiveSession(sessionId: string, serverId?: string) {
  return initLiveSessionLogic(sessionId, serverId);
}

export async function endLiveSession(sessionId: string, _serverId?: string) {
  return endLiveSessionLogic(sessionId);
}

export async function executeLiveCommand(sessionId: string, serverId: string | undefined, command: string) {
  return executeLiveCommandLogic(sessionId, serverId, command);
}
