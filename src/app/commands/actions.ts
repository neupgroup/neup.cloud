
'use server';

import { runCommandOnServer } from '@/services/ssh';
import { getServerForRunner } from '../servers/actions';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';

const { firestore } = initializeFirebase();

export async function getSavedCommands() {
    const querySnapshot = await getDocs(collection(firestore, "savedCommands"));
    const commandsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return commandsData;
}

export async function createSavedCommand(data: { name: string, command: string, description?: string, nextCommands?: string[], variables?: any[] }) {
    await addDoc(collection(firestore, 'savedCommands'), data);
    revalidatePath('/commands');
}

export async function updateSavedCommand(id: string, data: { name: string, command: string, description?: string, nextCommands?: string[], variables?: any[] }) {
    await updateDoc(doc(firestore, 'savedCommands', id), data);
    revalidatePath('/commands');
}

export async function deleteSavedCommand(id: string) {
    await deleteDoc(doc(firestore, 'savedCommands', id));
    revalidatePath('/commands');
}

async function executeSingleCommand(
    serverId: string,
    command: string,
    originalCommandTemplate: string,
    commandName?: string,
    variables: Record<string, any> = {}
): Promise<{ logId: string; status: 'Success' | 'Error'; output: string }> {
    const server = await getServerForRunner(serverId);
    if (!server) {
        throw new Error('Server not found.');
    }
    if (!server.username || !server.privateKey) {
        throw new Error('No username or private key configured for this server.');
    }

    const logRef = await addDoc(collection(firestore, 'serverLogs'), {
        serverId: serverId,
        command: originalCommandTemplate, // Log the actual command
        commandName: commandName, // Optional display name
        output: 'Executing command...',
        status: 'pending',
        runAt: serverTimestamp(),
    });

    let finalOutput = '';
    let finalStatus: 'Success' | 'Error' = 'Error';

    try {
        // Add server context variables
        const serverVariables = {
            'server.name': server.name,
            'server.publicIp': server.publicIp,
            'server.os': server.type || 'linux',
            ...variables
        };

        const result = await runCommandOnServer(
            server.publicIp,
            server.username,
            server.privateKey,
            command, // Execute the processed command
            (chunk) => {
                finalOutput += chunk;
                updateDoc(logRef, { output: finalOutput });
            },
            (chunk) => {
                finalOutput += chunk;
                updateDoc(logRef, { output: finalOutput });
            },
            false, // skipSwap
            serverVariables
        );

        if (result.code === 0) {
            finalStatus = 'Success';
            finalOutput = result.stdout;
        } else {
            finalOutput = result.stderr || `Command exited with code ${result.code}`;
        }

        await updateDoc(logRef, { status: finalStatus, output: finalOutput });
        revalidatePath(`/servers/${serverId}`);

        return { logId: logRef.id, status: finalStatus, output: finalOutput };
    } catch (e: any) {
        finalOutput = `Failed to execute command: ${e.message}`;
        await updateDoc(logRef, { status: 'Error', output: finalOutput });
        revalidatePath(`/servers/${serverId}`);
        return { logId: logRef.id, status: 'Error', output: finalOutput };
    }
}

export async function executeCommand(serverId: string, command: string, commandName?: string, displayCommand?: string) {
    if (!serverId) {
        return { error: "Server not selected" };
    }
    try {
        // executeSingleCommand(serverId, actualCommand, logCommand, commandName)
        // If displayCommand is provided, use it for logging (originalCommandTemplate). 
        // Otherwise use the actual command.
        const result = await executeSingleCommand(serverId, command, displayCommand || command, commandName);
        return { output: result.output, error: result.status === 'Error' ? result.output : undefined };
    } catch (e: any) {
        return { error: e.message };
    }
}


export async function executeSavedCommand(serverId: string, savedCommandId: string, variables: Record<string, string> = {}) {
    const savedCommandDoc = await getDoc(doc(firestore, "savedCommands", savedCommandId));
    if (!savedCommandDoc.exists()) {
        throw new Error("Saved command not found.");
    }
    const savedCommand = savedCommandDoc.data();
    const commandTemplate = savedCommand.command;

    const server = await getServerForRunner(serverId);
    if (!server) {
        throw new Error("Target server not found.");
    }

    const os = server.type.toLowerCase(); // 'linux' or 'windows'
    const osBlockRegex = new RegExp(`<<\\{\\{start\\.${os}\\}\\}\\>>([\\s\\S]*?)<<\\{\\{end\\.${os}\\}\\}\\>>`, 'g');
    const match = osBlockRegex.exec(commandTemplate);

    if (!match || !match[1]) {
        throw new Error(`No command block found for OS "${server.type}" in the saved command.`);
    }

    let processedCommand = match[1].trim();

    // 1. Replace user-provided variables: {{[[variableName]]}}
    for (const key in variables) {
        processedCommand = processedCommand.replace(new RegExp(`\\{\\{\\[\\[${key}\\]\\]\\}\\}`, 'g'), variables[key]);
    }

    // 2. Replace universal variables: <<{{[universal.variableName]}}>>
    const universalVars: Record<string, string> = {
        'universal.serverIp': server.publicIp,
        'universal.serverName': server.name,
        'universal.serverUsername': server.username,
    };

    for (const key in universalVars) {
        processedCommand = processedCommand.replace(new RegExp(`<<\\{\\{\\[${key}\\]\\}\\}\\}>>`, 'g'), universalVars[key]);
    }

    // Check if there are any un-replaced variables left
    if (/\{\{\[\[.*\]\]\}\}/.test(processedCommand) || /<<\{\{\[.*\]\}\}>>/.test(processedCommand)) {
        throw new Error("One or more variables were not provided or could not be resolved.");
    }

    const combinedVariables = { ...variables, ...universalVars };
    const mainResult = await executeSingleCommand(serverId, processedCommand, commandTemplate, undefined, combinedVariables);

    if (mainResult.status === 'Success' && savedCommand.nextCommands && savedCommand.nextCommands.length > 0) {
        for (const nextCommandId of savedCommand.nextCommands) {
            // Note: Chained commands do not currently support dynamic variables from the parent.
            await executeSavedCommand(serverId, nextCommandId, variables);
        }
    }

    return mainResult;
}
