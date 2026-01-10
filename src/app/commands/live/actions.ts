'use server';

import { cookies } from 'next/headers';
import { getServerForRunner } from '@/app/servers/actions';
import { initializeFirebase } from '@/firebase';
import { runCommandOnServer } from '@/services/ssh';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

/**
 * Ensures a live session document exists and initializes a server log for it.
 * Also refreshes the session cookie.
 */
export async function initLiveSession(sessionId: string, serverId: string | undefined) {
    // 1. Refresh/Set Cookie immediately
    const cookieStore = await cookies();
    cookieStore.set('live_session_id', sessionId, {
        maxAge: 15 * 60, // 15 minutes
        path: '/',
        // httpOnly: true, // Optional depending on if client needs to read it, keeping it simple/secure by default
    });

    const sessionRef = doc(firestore, 'liveSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
        let serverLogId = null;

        // If a server is connected, create a log entry immediately
        if (serverId) {
            const logRef = await addDoc(collection(firestore, 'serverLogs'), {
                serverId: serverId,
                command: `Live Session ${sessionId}`,
                commandName: 'Live Session (Active)',
                output: '', // Will be appended to incrementally
                status: 'Running', // Indicates active session
                runAt: serverTimestamp(),
            });
            serverLogId = logRef.id;
            revalidatePath(`/servers/${serverId}`);
        }

        await setDoc(sessionRef, {
            createdAt: serverTimestamp(),
            cwd: '~', // Default home directory
            status: 'active',
            history: [], // Keep for client state if needed
            serverLogId: serverLogId,
            serverId: serverId // Store logic association
        });
    }
}

/**
 * Marks the live session as 'Discontinued' in the server logs.
 */
export async function endLiveSession(sessionId: string, serverId: string | undefined) {
    const sessionRef = doc(firestore, 'liveSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) return;

    const data = sessionDoc.data();
    const serverLogId = data.serverLogId;

    if (serverLogId) {
        await updateDoc(doc(firestore, 'serverLogs', serverLogId), {
            status: 'Discontinued', // Defined final status
            commandName: 'Live Session (Ended)'
        });
        if (serverId) {
            revalidatePath(`/servers/${serverId}`);
        }
    }

    // Mark session ended locally
    await updateDoc(sessionRef, { status: 'ended' });
}

/**
 * Executes a command in the context of the live session.
 * Appends output to the Server Log immediately.
 */
export async function executeLiveCommand(sessionId: string, serverId: string | undefined, command: string) {
    // 1. Get Session State
    const sessionRef = doc(firestore, 'liveSessions', sessionId);
    let sessionDoc = await getDoc(sessionRef);

    // If missing, initialize
    if (!sessionDoc.exists()) {
        await initLiveSession(sessionId, serverId);
        sessionDoc = await getDoc(sessionRef);
    }

    const sessionData = sessionDoc.data();
    let currentCwd = sessionData?.cwd || '~';
    const serverLogId = sessionData?.serverLogId;

    // Fallback if log ID missing but should exist (rare edge case recovery)
    if (!serverLogId && serverId) {
        // Just proceed without logging or lazy create? 
        // For now, assume initialized correctly.
    }

    let output = '';
    let newCwd = currentCwd;
    const timestamp = new Date().toISOString();

    if (!serverId) {
        // === MOCK MODE ===
        const parts = command.trim().split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        if (cmd === 'cd') {
            const target = args[0] || '~';
            if (target === '..') {
                const pathParts = currentCwd.split('/').filter(Boolean);
                pathParts.pop();
                newCwd = '/' + pathParts.join('/');
                if (newCwd === '//') newCwd = '/';
                if (newCwd === '') newCwd = '/';
            } else if (target === '~') {
                newCwd = '~';
            } else if (target.startsWith('/')) {
                newCwd = target;
            } else {
                newCwd = (currentCwd === '~' ? '/home/user' : currentCwd) + '/' + target;
            }
            output = '';
        } else if (cmd === 'ls') {
            output = 'file1.txt  file2.js  folder/';
        } else if (cmd === 'pwd') {
            output = currentCwd;
        } else if (cmd === 'echo') {
            output = args.join(' ');
        } else {
            output = `Command not found: ${cmd} (Mock Mode)`;
        }

    } else {
        // === REAL SSH MODE ===
        try {
            const server = await getServerForRunner(serverId);
            if (!server || !server.username || !server.privateKey) {
                output = 'Error: Server not configured correctly for SSH.';
            } else {
                let connectionCmd = '';
                if (currentCwd !== '~') {
                    connectionCmd = `cd "${currentCwd}" && `;
                }

                const pwdMarker = '___PWD_MARKER___';
                const fullCommand = `export TERM=xterm-256color; ${connectionCmd}${command}; echo "${pwdMarker}"; pwd`;

                const result = await runCommandOnServer(
                    server.publicIp,
                    server.username,
                    server.privateKey,
                    fullCommand,
                    undefined,
                    undefined,
                    true // skipSwap
                );

                const fullOutput = result.stdout + (result.stderr ? '\n' + result.stderr : '');

                const parts = fullOutput.split(pwdMarker);
                if (parts.length >= 2) {
                    output = parts[0].trim();
                    newCwd = parts[1].trim();
                } else {
                    output = fullOutput;
                }

                if (result.code !== 0) {
                    output += `\n(Exit code: ${result.code})`;
                }
            }
        } catch (e: any) {
            output = `Execution Error: ${e.message}`;
        }
    }

    // 2. Append to Server Log (if exists)
    if (serverLogId) {
        // We append the new interaction to the existing output block
        // We need to read the current output to append? Or can we just use arrayUnion if it was an array? 
        // The implementation uses a string for 'output'. We have to read-modify-write or use a transform if firestore supported string append (it doesn't naturally).
        // However, for efficiency in a "live" system, usually we might store lines in a subcollection.
        // But the requirement is "shown as a single command".
        // We will read the doc and update it. Note: this has race conditions if typing extremely fast, but for a single user terminal it is acceptable.

        try {
            const logRef = doc(firestore, 'serverLogs', serverLogId);
            const logSnap = await getDoc(logRef);
            if (logSnap.exists()) {
                const currentOutput = logSnap.data().output || '';
                const newEntry = `\n${timestamp} [COMMAND]: ${command}\n${timestamp} [OUTPUT]: ${output}`;
                await updateDoc(logRef, {
                    output: currentOutput + newEntry
                });
            }
        } catch (err) {
            console.error("Failed to append to log:", err);
        }
    }

    // 3. Update Session State (CWD)
    await updateDoc(sessionRef, {
        cwd: newCwd,
        // We don't necessarily need to store heavy history in the session doc anymore if it's in logs, 
        // but we keep it for client-side hydration if they reload and we want to recover (optional, but user said "if i reload... start a new command").
        // User said: "if i reload the page, i will see a new command (instance)".
        // So we don't need to persist history for reload.
        // But we might want it for the current session view if we used Firestore subscription, but we use local React state for view.
    });

    return { output, cwd: newCwd };
}
