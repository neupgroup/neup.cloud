
'use server';

import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { runCommandOnServer } from '@/services/ssh';
import { getServerForRunner } from '../actions';

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
