'use client';

import { useEffect, useState } from 'react';

export type PipelineProviderKey = 'whatsapp' | 'google' | 'github' | 'linkedin';

export type StoredPipelineProviderConnection = {
  provider: PipelineProviderKey;
  connectionName: string;
  status: 'connected' | 'draft';
  values: Record<string, string>;
  updatedAt: string;
};

const STORAGE_KEY = 'neup.pipeline.provider-connections.v1';
const CONNECTION_EVENT = 'pipeline-provider-connection-changed';

function isProviderKey(value: string): value is PipelineProviderKey {
  return value === 'whatsapp' || value === 'google' || value === 'github' || value === 'linkedin';
}

function readConnectionMap(): Partial<Record<PipelineProviderKey, StoredPipelineProviderConnection>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, StoredPipelineProviderConnection>;

    return Object.fromEntries(
      Object.entries(parsed).filter(([provider, value]) => {
        return isProviderKey(provider) && value && typeof value === 'object';
      })
    ) as Partial<Record<PipelineProviderKey, StoredPipelineProviderConnection>>;
  } catch {
    return {};
  }
}

function writeConnectionMap(connections: Partial<Record<PipelineProviderKey, StoredPipelineProviderConnection>>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

function notifyConnectionChange(provider: PipelineProviderKey) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CONNECTION_EVENT, {
      detail: { provider },
    })
  );
}

export function getStoredProviderConnection(provider: PipelineProviderKey) {
  return readConnectionMap()[provider] ?? null;
}

export function saveStoredProviderConnection(connection: StoredPipelineProviderConnection) {
  const currentConnections = readConnectionMap();

  writeConnectionMap({
    ...currentConnections,
    [connection.provider]: connection,
  });

  notifyConnectionChange(connection.provider);
}

export function clearStoredProviderConnection(provider: PipelineProviderKey) {
  const currentConnections = readConnectionMap();
  const nextConnections = { ...currentConnections };

  delete nextConnections[provider];
  writeConnectionMap(nextConnections);
  notifyConnectionChange(provider);
}

export function useProviderConnection(provider: PipelineProviderKey) {
  const [connection, setConnection] = useState<StoredPipelineProviderConnection | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setConnection(getStoredProviderConnection(provider));
      setIsLoaded(true);
    };

    const handleConnectionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ provider?: PipelineProviderKey }>).detail;

      if (!detail?.provider || detail.provider === provider) {
        sync();
      }
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(CONNECTION_EVENT, handleConnectionChange);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CONNECTION_EVENT, handleConnectionChange);
    };
  }, [provider]);

  return {
    connection,
    isLoaded,
  };
}
