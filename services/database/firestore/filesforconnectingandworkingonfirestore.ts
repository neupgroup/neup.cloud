import { createSign } from 'crypto';
import type { FirestoreAuthConfig } from '@/services/database/types';

type TokenResponse = {
  access_token: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, '\n');
}

function createServiceAccountJwt(auth: FirestoreAuthConfig) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;

  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: auth.clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: issuedAt,
      exp: expiresAt,
    })
  );

  const unsignedToken = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(normalizePrivateKey(auth.privateKey), 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsignedToken}.${signature}`;
}

async function getFirestoreAccessToken(auth: FirestoreAuthConfig) {
  const assertion = createServiceAccountJwt(auth);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with Firestore.');
  }

  const token = (await response.json()) as TokenResponse;
  return token.access_token;
}

async function fetchFirestoreJson<T>(auth: FirestoreAuthConfig, url: string, init?: RequestInit): Promise<T> {
  const accessToken = await getFirestoreAccessToken(auth);

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Firestore request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function getDatabaseId(auth: FirestoreAuthConfig) {
  return auth.databaseId?.trim() || '(default)';
}

export async function testFirestoreConnection(auth: FirestoreAuthConfig) {
  const databaseId = getDatabaseId(auth);

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(auth.projectId)}/databases/${encodeURIComponent(databaseId)}/documents:listCollectionIds`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: `projects/${auth.projectId}/databases/${databaseId}/documents`,
        pageSize: 1,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to connect to Firestore with provided credentials.');
  }
}

export async function readFirestoreDocument(
  auth: FirestoreAuthConfig,
  collection: string,
  documentId: string
) {
  const accessToken = await getFirestoreAccessToken(auth);
  const databaseId = getDatabaseId(auth);

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(auth.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error('Unable to read Firestore document.');
  }

  return response.json();
}

export async function listFirestoreCollections(auth: FirestoreAuthConfig) {
  const databaseId = getDatabaseId(auth);

  const data = await fetchFirestoreJson<{ collectionIds?: string[] }>(
    auth,
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(auth.projectId)}/databases/${encodeURIComponent(databaseId)}/documents:listCollectionIds`,
    {
      method: 'POST',
      body: JSON.stringify({
        parent: `projects/${auth.projectId}/databases/${databaseId}/documents`,
        pageSize: 100,
      }),
    }
  );

  return (data.collectionIds || []).map((collectionId) => ({
    name: collectionId,
    type: 'collection' as const,
  }));
}

type FirestoreDocumentResponse = {
  name: string;
  fields?: Record<string, any>;
  createTime?: string;
  updateTime?: string;
};

function firestoreValueToJs(value: any): unknown {
  if (!value || typeof value !== 'object') {
    return value ?? null;
  }

  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) {
    return (value.arrayValue?.values || []).map((item: any) => firestoreValueToJs(item));
  }
  if ('mapValue' in value) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, child]) => [key, firestoreValueToJs(child)])
    );
  }

  return value;
}

function flattenFirestoreDocument(doc: FirestoreDocumentResponse) {
  const data = doc.fields || {};
  const flattened: Record<string, unknown> = {
    __name__: doc.name.split('/').pop() || doc.name,
    __createTime: doc.createTime,
    __updateTime: doc.updateTime,
  };

  for (const [key, value] of Object.entries(data)) {
    flattened[key] = firestoreValueToJs(value);
  }

  return flattened;
}

export async function listFirestoreCollectionDocuments(
  auth: FirestoreAuthConfig,
  collection: string,
  page: number,
  perPage: 10 | 25 | 50
) {
  const databaseId = getDatabaseId(auth);
  const offset = (page - 1) * perPage;

  const payload = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      offset,
      limit: perPage + 1,
    },
  };

  const rows = await fetchFirestoreJson<Array<{ document?: FirestoreDocumentResponse }>>(
    auth,
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(auth.projectId)}/databases/${encodeURIComponent(databaseId)}/documents:runQuery`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );

  const documents = rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocumentResponse => Boolean(document))
    .map(flattenFirestoreDocument);

  const hasNextPage = documents.length > perPage;
  const pageDocuments = hasNextPage ? documents.slice(0, perPage) : documents;

  const columns = pageDocuments.length > 0
    ? Array.from(
        new Set(pageDocuments.flatMap((document) => Object.keys(document)))
      )
    : ['__name__', '__createTime', '__updateTime'];

  return {
    columns,
    rows: pageDocuments,
    page,
    perPage,
    hasNextPage,
  };
}
