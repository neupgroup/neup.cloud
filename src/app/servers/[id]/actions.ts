
'use server';

import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { runCommandOnServer, uploadFileToServer } from '@/services/ssh';
import { getServerForRunner } from '../actions';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';


const { firestore } = initializeFirebase();

export async function runCustomCommandOnServer(serverId: string, command: string) {
  if (!serverId || !command) {
    return { error: "Server and command are required." };
  }

  const server = await getServerForRunner(serverId);

  if (!server) {
    return { error: 'Server not found.' };
  }
  
  if (!server.username || !server.privateKey) {
    return { error: 'No username or private key configured for this server.' };
  }

  let result;
  try {
    result = await runCommandOnServer(
      server.publicIp,
      server.username,
      server.privateKey,
      command
    );
  } catch (e: any) {
     await addDoc(collection(firestore, 'serverLogs'), {
        serverId: serverId,
        command: command,
        output: e.message,
        status: 'Error',
        runAt: serverTimestamp(),
    });
    return { error: `Failed to execute command: ${e.message}` };
  }
  
  const output = result.code === 0 ? result.stdout : result.stderr;
  const status = result.code === 0 ? 'Success' : 'Error';

  await addDoc(collection(firestore, 'serverLogs'), {
    serverId: serverId,
    command: command,
    output: output,
    status: status,
    runAt: serverTimestamp(),
  });
  
  revalidatePath(`/servers/${serverId}`);

  return { output: output || `Command executed with status code ${result.code}.` };
}

export async function rebootServer(serverId: string) {
    return await runCustomCommandOnServer(serverId, 'sudo reboot');
}

export async function getServerLogs(serverId: string) {
    const logsQuery = query(
        collection(firestore, "serverLogs"), 
        where("serverId", "==", serverId), 
        orderBy("runAt", "desc")
    );
    const querySnapshot = await getDocs(logsQuery);
    const logsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            runAt: data.runAt.toDate().toISOString(),
        };
    });
    return logsData;
}


export type FileOrFolder = {
    name: string;
    type: 'file' | 'directory' | 'symlink';
    size: number;
    lastModified: string;
    permissions: string;
    linkTarget?: string;
};

function parseLsOutput(output: string): FileOrFolder[] {
  if (!output) return [];
  const lines = output.trim().split('\n');
  
  return lines.slice(1).map(line => {
    const parts = line.split(/\s+/);
    if (parts.length < 9) return null;

    const permissions = parts[0];
    const type = permissions.startsWith('d') ? 'directory' : permissions.startsWith('l') ? 'symlink' : 'file';
    const size = parseInt(parts[4], 10);
    
    const lastModified = `${parts[5]} ${parts[6]} ${parts[7]}`;
    
    const nameIndex = 8;
    let name = parts.slice(nameIndex).join(' ');
    let linkTarget: string | undefined = undefined;

    if (type === 'symlink') {
        const arrowIndex = name.indexOf(' -> ');
        if (arrowIndex !== -1) {
            linkTarget = name.substring(arrowIndex + 4);
            name = name.substring(0, arrowIndex);
        }
    }

    return {
      name,
      type,
      size,
      lastModified,
      permissions,
      linkTarget,
    };
  }).filter((item): item is FileOrFolder => item !== null);
}

export async function browseDirectory(serverId: string, path: string): Promise<{ files: FileOrFolder[], error?: string }> {
  const server = await getServerForRunner(serverId);
  if (!server) {
    return { files: [], error: 'Server not found.' };
  }
   if (!server.username || !server.privateKey) {
    return { files: [], error: 'No username or private key configured for this server.' };
  }

  try {
    // Use ls -lA to include hidden files except . and ..
    const result = await runCommandOnServer(server.publicIp, server.username, server.privateKey, `ls -lA --full-time ${path}`);

    if (result.code !== 0) {
      return { files: [], error: result.stderr || `Failed to list directory contents. Exit code: ${result.code}` };
    }

    const files = parseLsOutput(result.stdout);
    return { files };
  } catch (e: any) {
    return { files: [], error: `Failed to browse directory: ${e.message}` };
  }
}

export async function uploadFile(serverId: string, remotePath: string, formData: FormData) {
  const server = await getServerForRunner(serverId);
  if (!server) {
    return { error: 'Server not found.' };
  }
  if (!server.username || !server.privateKey) {
    return { error: 'No username or private key configured for this server.' };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { error: 'No file provided.' };
  }
  
  const tempDir = path.join(os.tmpdir(), 'neup-uploads');
  await fs.mkdir(tempDir, { recursive: true });
  const tempFilePath = path.join(tempDir, file.name);

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, fileBuffer);

    const remoteFilePath = path.join(remotePath, file.name);

    await uploadFileToServer(
      server.publicIp,
      server.username,
      server.privateKey,
      tempFilePath,
      remoteFilePath
    );

    revalidatePath(`/servers/${serverId}/files`);
    return { success: true };
  } catch (e: any) {
    return { error: `Failed to upload file: ${e.message}` };
  } finally {
    // Clean up the temporary file
    await fs.unlink(tempFilePath).catch(console.error);
  }
}
