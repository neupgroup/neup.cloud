'use server';

import { getServerForRunner } from '@/app/servers/actions';
import { initializeFirebase } from '@/firebase';
import { runCommandOnServer } from '@/services/ssh';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

/**
 * Ensures a live session document exists.
 * If not, creates one with default state.
 */
export async function initLiveSession(sessionId: string) {
    const sessionRef = doc(firestore, 'liveSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
        await setDoc(sessionRef, {
            createdAt: serverTimestamp(),
            cwd: '~', // Default home directory
            status: 'active',
            history: [], // [{ time, type, content }]
        });
    }
}

/**
 * Ends a live session and logs it as a single entry in serverLogs.
 */
export async function endLiveSession(sessionId: string, serverId: string | undefined) {
    const sessionRef = doc(firestore, 'liveSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) return;

    const data = sessionDoc.data();
    const history = data?.history || [];

    // Format the transcript
    const transcript = history.map((entry: any) => {
        return `${entry.time} [${entry.type.toUpperCase()}]: ${entry.content}`;
    }).join('\n');

    // Save to serverLogs
    if (serverId) {
        await addDoc(collection(firestore, 'serverLogs'), {
            serverId: serverId,
            command: `Live Session ${sessionId}`,
            commandName: 'Live Session',
            output: transcript,
            status: 'Success',
            runAt: serverTimestamp(),
        });

        revalidatePath(`/servers/${serverId}`);
    }

    // Mark session ended
    await updateDoc(sessionRef, { status: 'ended' });
}

/**
 * Executes a command in the context of the live session.
 */
export async function executeLiveCommand(sessionId: string, serverId: string | undefined, command: string) {
    // 1. Get Session State
    const sessionRef = doc(firestore, 'liveSessions', sessionId);
    let sessionDoc = await getDoc(sessionRef);

    // If missing (shouldn't happen if init called, but for safety)
    if (!sessionDoc.exists()) {
        await initLiveSession(sessionId);
        sessionDoc = await getDoc(sessionRef);
    }

    const sessionData = sessionDoc.data();
    let currentCwd = sessionData?.cwd || '~';
    const history = sessionData?.history || [];

    const timestamp = new Date().toISOString();

    // 2. Add Command to History (Optimistic or Real? We do it here)
    const newHistory = [...history, { time: timestamp, type: 'command', content: command }];
    await updateDoc(sessionRef, { history: newHistory });

    let output = '';
    let newCwd = currentCwd;

    if (!serverId) {
        // === MOCK MODE ===
        // Simple basic commands simulation
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
                if (newCwd === '') newCwd = '/'; // slightly buggy mock but ok
            } else if (target === '~') {
                newCwd = '~';
            } else if (target.startsWith('/')) {
                newCwd = target;
            } else {
                // relative
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
                // Construct the wrapper command
                // Note: 'cd ~' might not work in sh if strictly quoted, but usually ok.
                // Better: use direct paths. If cwd is '~', usually we don't cd.
                let connectionCmd = '';
                if (currentCwd !== '~') {
                    connectionCmd = `cd "${currentCwd}" && `;
                }

                const pwdMarker = '___PWD_MARKER___';
                const fullCommand = `${connectionCmd}${command}; echo "${pwdMarker}"; pwd`;

                const result = await runCommandOnServer(
                    server.publicIp,
                    server.username,
                    server.privateKey,
                    fullCommand
                );

                const fullOutput = result.stdout + (result.stderr ? '\n' + result.stderr : '');

                // Parse Output
                // Expected format: <command_output> \n ___PWD_MARKER___ \n <new_cwd>
                const parts = fullOutput.split(pwdMarker);
                if (parts.length >= 2) {
                    output = parts[0].trim();
                    newCwd = parts[1].trim();
                } else {
                    // Something went wrong (maybe command failed catastrophically or didn't echo)
                    // Fallback: keep old cwd
                    output = fullOutput;
                }

                // If exit code non-zero, maybe show it?
                if (result.code !== 0) {
                    output += `\n(Exit code: ${result.code})`;
                }
            }
        } catch (e: any) {
            output = `Execution Error: ${e.message}`;
        }
    }

    // 3. Update Session with Output and New CWD
    const outputTimestamp = new Date().toISOString();
    // Determine if history is "grouped" logic? User said: "time: command \n time: output \n ... we show in this way but as a single command [in history log]".
    // Here we just store individual entries.
    const finalHistory = [...newHistory, { time: outputTimestamp, type: 'output', content: output }];

    await updateDoc(sessionRef, {
        cwd: newCwd,
        history: finalHistory
    });

    return { output, cwd: newCwd };
}
