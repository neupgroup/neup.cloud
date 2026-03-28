import * as Go from '@/core/go';
import * as NextJs from '@/core/nextjs';
import * as NodeJs from '@/core/nodejs';
import * as Python from '@/core/python';
import { sanitizeAppName } from '@/core/universal';
import type { Application, CreateApplicationData, UpdateApplicationData } from '@/app/applications/types';

function sanitizeCommandKey(key: string) {
  return key.replace(/[^a-zA-Z0-9-.]/g, '-');
}

function sanitizeCommands(commands?: Record<string, string>) {
  if (!commands) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(commands).map(([key, value]) => [sanitizeCommandKey(key), value])
  );
}

function sanitizeInformation(information?: Record<string, any>) {
  if (!information) {
    return undefined;
  }

  return {
    ...information,
    commandsList: information.commandsList?.map((command: any) => ({
      ...command,
      name: sanitizeCommandKey(command.name),
    })),
  };
}

export function prepareApplicationCreateData(data: CreateApplicationData): CreateApplicationData {
  return {
    ...data,
    commands: sanitizeCommands(data.commands),
    information: sanitizeInformation(data.information),
  };
}

export function prepareApplicationUpdateData(data: UpdateApplicationData): UpdateApplicationData {
  return {
    ...data,
    ...(data.commands !== undefined ? { commands: sanitizeCommands(data.commands) } : {}),
    ...(data.information !== undefined ? { information: sanitizeInformation(data.information) } : {}),
  };
}

export function getApplicationStopCommand(application: Application) {
  const commands = application.commands || {};
  const customStopKey = Object.keys(commands).find((key) => key === 'lifecycle.stop' || key === 'stop');

  if (customStopKey) {
    const encodedCommand = commands[customStopKey];

    try {
      return Buffer.from(encodedCommand, 'base64').toString('utf-8');
    } catch {
      return encodedCommand;
    }
  }

  switch (application.language) {
    case 'next':
      return NextJs.getStopCommand(application.name);
    case 'node':
      return NodeJs.getStopCommand(application.name);
    case 'python':
      return Python.getStopCommand(application.name);
    case 'go':
      return Go.getStopCommand(application.name);
    default:
      return `pm2 stop "${sanitizeAppName(application.name)}"`;
  }
}

export function sanitizeStageName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
