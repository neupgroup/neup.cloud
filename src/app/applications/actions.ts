'use server';

import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { executeCommand, executeQuickCommand } from '../commands/actions';
import { cookies } from 'next/headers';
import * as NextJs from '@/core/nextjs';
import * as NodeJs from '@/core/nodejs';
import * as Python from '@/core/python';
import * as Go from '@/core/go';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import * as Git from '@/core/github';
import { sanitizeAppName } from '@/core/universal';

const execAsync = promisify(exec);

const { firestore } = initializeFirebase();

export async function getApplications() {
    const querySnapshot = await getDocs(collection(firestore, "applications"));
    const appsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return appsData;
}

export async function getApplication(id: string) {
    const docRef = doc(firestore, "applications", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
}

export async function createApplication(appData: {
    name: string;
    location: string;
    language: string;
    repository?: string;
    networkAccess?: string[]; // Array of ports or empty
    commands?: Record<string, string>; // { 'start': 'npm start', 'stop': 'npm stop' }
    information?: Record<string, any>; // Additional JSON information
    owner: string; // User ID of the owner
}) {
    // Sanitize command keys to ensure they only contain a-z, A-Z, 0-9, -
    const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9-.]/g, '-');

    const sanitizedCommands = appData.commands
        ? Object.fromEntries(
            Object.entries(appData.commands).map(([key, value]) => [sanitizeKey(key), value])
        )
        : undefined;

    const sanitizedSyncedInfo = appData.information
        ? {
            ...appData.information,
            commandsList: appData.information.commandsList?.map((cmd: any) => ({
                ...cmd,
                name: sanitizeKey(cmd.name)
            }))
        }
        : undefined;

    const docRef = await addDoc(collection(firestore, 'applications'), {
        ...appData,
        commands: sanitizedCommands,
        information: sanitizedSyncedInfo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    revalidatePath('/applications');
    return docRef.id;
}

export async function deleteApplication(id: string) {
    const app = await getApplication(id) as any;
    if (app) {
        try {
            // Attempt to stop the application
            let stopCommand = '';

            // 1. Check for custom lifecycle command
            // We look for 'lifecycle.stop' or just 'stop'
            // The command value in app.commands is base64 encoded if created via new deploy page
            // But here we need the shell command to run on server. 
            // Actually, if we use the core modules, they return the shell command.
            // If it's a custom command stored in DB, we need to decode and use it.

            const commands = app.commands || {};
            // Keys are sanitized, so 'lifecycle.stop' or 'stop'
            const customStopKey = Object.keys(commands).find(k => k === 'lifecycle.stop' || k === 'stop');

            if (customStopKey) {
                const encodedCmd = commands[customStopKey];
                // Try decoding, if fails assume it's plain text (legacy)
                try {
                    stopCommand = Buffer.from(encodedCmd, 'base64').toString('utf-8');
                } catch {
                    stopCommand = encodedCmd;
                }
            } else {
                // 2. Use Core Modules based on language
                switch (app.language) {
                    case 'next':
                        stopCommand = NextJs.getStopCommand(app.name);
                        break;
                    case 'node':
                        stopCommand = NodeJs.getStopCommand(app.name);
                        break;
                    case 'python':
                        stopCommand = Python.getStopCommand(app.name);
                        break;
                    case 'go':
                        stopCommand = Go.getStopCommand(app.name);
                        break;
                    default:
                        // Generic fallback if PM2 is used
                        stopCommand = `pm2 stop "${sanitizeAppName(app.name)}"`;
                        break;
                }
            }

            if (stopCommand) {
                const cookieStore = await cookies();
                const serverId = cookieStore.get('selected_server')?.value;
                if (serverId) {
                    // We execute it but don't fail deletion if stop fails (e.g. app not running)
                    // We use a "fire and forget" or tolerant approach, or we wrap in try/catch specific to execution
                    try {
                        // Format command to name it "Stopping {app.name}" for history
                        const formattedName = `Stopping ${app.name}`;
                        // We can use executeCommand directly. 
                        // Note: executeApplicationCommand wraps this but also does .status file updates. 
                        // For deletion, maybe we don't care about .status file since we are deleting the app?
                        // Or maybe we do to show it stopped. 
                        // Getting complex. Let's just run the command.
                        await executeCommand(serverId, stopCommand, formattedName, stopCommand);
                    } catch (cmdErr) {
                        console.warn("Failed to stop application before deletion:", cmdErr);
                    }
                }
            }

        } catch (e) {
            console.error("Error setting up stop command:", e);
        }
    }

    await deleteDoc(doc(firestore, "applications", id));
    revalidatePath('/applications');
}

export async function updateApplication(id: string, data: any) {
    await updateDoc(doc(firestore, "applications", id), data);
    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);
}

// Helper function to sanitize stage name
function sanitizeStageName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_');
}

export async function executeApplicationCommand(
    applicationId: string,
    command: string,
    commandName?: string
) {
    const app = await getApplication(applicationId) as any;
    if (!app) throw new Error("Application not found");

    // Get the selected server from cookies
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;

    if (!serverId) {
        throw new Error("No server selected. Please select a server first.");
    }

    // Create a formatted command name for history
    const formattedCommandName = commandName
        ? `${app.name} ${commandName}`
        : `${app.name} Custom Command`;

    // Sanitize the stage name
    const stageName = sanitizeStageName(commandName || 'custom_command');
    const statusFilePath = `${app.applicationLocation}/.status`;
    const timestamp = new Date().toISOString();

    // Create command to update .status file
    // First, read existing status or create new one
    const updateStatusCommand = `
# Update or create .status file
STATUS_FILE="${statusFilePath}"
STAGE_NAME="${stageName}"
TIMESTAMP="${timestamp}"

# Create directory if it doesn't exist
mkdir -p "$(dirname "$STATUS_FILE")"

# Read existing status or create empty array
if [ -f "$STATUS_FILE" ]; then
    EXISTING_STATUS=$(cat "$STATUS_FILE")
else
    EXISTING_STATUS="[]"
fi

# Create new status entry
NEW_ENTRY="{\\"stage_name\\":\\"$STAGE_NAME\\",\\"status\\":\\"ongoing\\",\\"started_on\\":\\"$TIMESTAMP\\"}"

# Use jq to update or append the status (if jq is available)
if command -v jq &> /dev/null; then
    # Check if stage exists and update it, otherwise append
    echo "$EXISTING_STATUS" | jq \\
        --arg stage "$STAGE_NAME" \\
        --arg status "ongoing" \\
        --arg time "$TIMESTAMP" \\
        'map(if .stage_name == $stage then .status = $status | .started_on = $time else . end) | 
         if any(.stage_name == $stage) then . else . + [{"stage_name": $stage, "status": $status, "started_on": $time}] end' \\
        > "$STATUS_FILE"
else
    # Fallback: simple append (not ideal but works)
    echo "$EXISTING_STATUS" | sed 's/]$//' | sed 's/^\\\\[//' > /tmp/status_temp
    if [ -s /tmp/status_temp ]; then
        echo "[$NEW_ENTRY," >> "$STATUS_FILE.new"
        cat /tmp/status_temp >> "$STATUS_FILE.new"
        echo "]" >> "$STATUS_FILE.new"
    else
        echo "[$NEW_ENTRY]" > "$STATUS_FILE.new"
    fi
    mv "$STATUS_FILE.new" "$STATUS_FILE"
    rm -f /tmp/status_temp
fi

# ==========================================
# MAIN COMMAND EXECUTION
# ==========================================

# Print command start marker
echo "-->>-->>${stageName}.starts<<--<<--"

# Now run the actual command
${command}

# Capture exit code
COMMAND_EXIT_CODE=$?

# Print command end marker
echo "-->>-->>${stageName}.ends<<--<<--"

# ==========================================
# STATUS UPDATE & EXIT
# ==========================================

# Update status to completed on success
if [ $COMMAND_EXIT_CODE -eq 0 ]; then
    if command -v jq &> /dev/null; then
        TEMP_FILE=$(mktemp)
        cat "$STATUS_FILE" | jq \\
            --arg stage "$STAGE_NAME" \\
            'map(if .stage_name == $stage then .status = "completed" else . end)' \\
            > "$TEMP_FILE"
        mv "$TEMP_FILE" "$STATUS_FILE"
    fi
fi

# Exit with the original command's exit code
exit $COMMAND_EXIT_CODE
`.trim();

    // Execute the wrapped command, but log execute the original "command"
    return await executeCommand(serverId, updateStatusCommand, formattedCommandName, command);
}

export async function generateRepositoryKeys() {
    const keyPath = `/tmp/key_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
        // Generate Ed25519 key
        // -t ed25519: Type
        // -C "neup.cloud-deploy": Comment
        // -f keyPath: Output file
        // -N "": No passphrase
        await execAsync(`ssh-keygen -t ed25519 -C "neup.cloud-deploy" -f "${keyPath}" -N ""`);

        // Read keys
        const privateKey = await readFile(keyPath, 'utf8');
        const publicKey = await readFile(`${keyPath}.pub`, 'utf8');

        // Clean up
        await unlink(keyPath).catch(() => { });
        await unlink(`${keyPath}.pub`).catch(() => { });

        return { privateKey, publicKey };
    } catch (error) {
        console.error("Error generating keys:", error);
        // Try cleaning up if failed
        await unlink(keyPath).catch(() => { });
        await unlink(`${keyPath}.pub`).catch(() => { });
        throw new Error("Failed to generate repository keys");
    }
}

export async function performGitOperation(
    applicationId: string,
    operation: 'clone' | 'pull' | 'pull-force' | 'reset-main'
) {
    const app = await getApplication(applicationId) as any;
    if (!app) throw new Error("Application not found");

    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    if (!serverId) throw new Error("No server selected");

    let repoUrl = app.repository;
    if (!repoUrl) throw new Error("No repository configured");

    const location = app.location;
    const repoInfo = app.information?.repoInfo || {};
    const isPrivate = repoInfo.isPrivate;
    const privateKey = repoInfo.accessKey;

    // Helper to convert HTTPS to SSH if needed
    // git clone over SSH requires git@... URL, even if user provided https://...
    if (isPrivate && privateKey && (repoUrl.startsWith('https://') || repoUrl.startsWith('http://'))) {
        try {
            // Check for common providers
            if (repoUrl.includes('github.com')) {
                // https://github.com/user/repo => git@github.com:user/repo.git
                const url = new URL(repoUrl);
                const pathName = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
                repoUrl = `git@github.com:${pathName}`;
            } else if (repoUrl.includes('gitlab.com')) {
                // https://gitlab.com/user/repo => git@gitlab.com:user/repo.git
                const url = new URL(repoUrl);
                const pathName = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
                repoUrl = `git@gitlab.com:${pathName}`;
            }
            // Ensure it ends with .git? usually not strictly required for github/gitlab SSH but good practice
            if (!repoUrl.endsWith('.git')) {
                repoUrl += '.git';
            }
        } catch (e) {
            console.warn("Failed to convert HTTPS URL to SSH, proceeding with original:", e);
        }
    }

    let command = '';
    let description = '';
    let keyFilePath = '';

    // If private and has key, we need to handle key placement strategy
    // Since we run command via executeCommand (which runs on server), 
    // we need to create the key file on the remote server temporarily.
    // However, `executeCommand` takes a string. 
    // We can embed the key creation in the script if it's small enough (PEM keys are ~1.5KB).

    if (isPrivate && privateKey) {
        // Generate a random path for the key on remote server
        keyFilePath = `/tmp/git_key_${Math.random().toString(36).substring(7)}`;
    }

    // Helper to wrap command with key creation and cleanup
    const wrapWithKey = (cmdGenerator: (keyPath: string) => string) => {
        if (!keyFilePath || !privateKey) return cmdGenerator(''); // Should fail if private but no key, but maybe user set up agent

        // Escape newlines in private key for echo
        // Ensure we preserve newlines in the key file
        const echoKey = `cat <<EOF > "${keyFilePath}"
${privateKey}
EOF
chmod 600 "${keyFilePath}"
`;

        const coreCmd = cmdGenerator(keyFilePath);

        return `
${echoKey}

${coreCmd}

rm -f "${keyFilePath}"
`;
    };

    switch (operation) {
        case 'clone':
            description = `Cloning Repository`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => Git.getPrivateCloneCommand(location, repoUrl, path));
            } else {
                command = Git.getPublicCloneCommand(location, repoUrl);
            }
            break;
        case 'pull':
            description = `Pulling Repository`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => Git.getPrivatePullCommand(location, path, 'main'));
            } else {
                command = Git.getPullCommand(location, 'main');
            }
            break;
        case 'pull-force':
            description = `Force Pulling Repository`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => Git.getPrivatePullForceCommand(location, path, 'main'));
            } else {
                command = Git.getPullForceCommand(location, 'main');
            }
            break;
        case 'reset-main':
            description = `Resetting to Main`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => Git.getPrivateResetCommand(location, path, 'origin/main'));
            } else {
                command = Git.getResetCommand(location, 'origin/main');
            }
            break;
    }

    if (!command) throw new Error("Could not generate command");

    // We use executeApplicationCommand to get the proper wrapping logic (logging, status file etc)
    // But executeApplicationCommand expects a direct command string or we can use executeCommand directly.
    // Since this is a "maintenance" task, showing it in history is good. 
    // We can use executeCommand directly to avoid 'custom command' logic wrapping if desired, 
    // BUT executeApplicationCommand handles stage naming and .status file updates which might be useful?
    // User didn't specify, but better to reuse executeCommand directly for cleaner logs 
    // or wrap it so it shows up in history.

    return await executeCommand(serverId, command, `${app.name}: ${description}`, command);
}

export async function getRunningProcesses() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    if (!serverId) throw new Error("No server selected");

    const delimiter = "---NEUP_CLOUD_SPLIT---";
    // Check if dump file exists and has content (-s).
    // Use || echo "[]" as absolute fallback.
    const command = `
        if command -v pm2 &> /dev/null; then
            pm2 jlist && echo "${delimiter}" && (if [ -s ~/.pm2/dump.pm2 ]; then cat ~/.pm2/dump.pm2; else echo "[]"; fi)
        else
            echo "[]${delimiter}[]"
        fi
    `;

    const result = await executeQuickCommand(serverId, command);

    if (result.error) {
        console.warn("Error fetching pm2 list:", result.error);
        return [];
    }

    try {
        const parts = (result.output || "").split(delimiter);
        const runningListRaw = parts[0]?.trim();
        const savedListRaw = parts[1]?.trim();

        // Parse running processes
        let runningList = [];
        try {
            runningList = JSON.parse(runningListRaw || "[]");
        } catch (e) {
            console.error("Failed to parse running list:", e, runningListRaw);
            return [];
        }

        // Parse saved processes
        let savedList = [];
        try {
            savedList = JSON.parse(savedListRaw || "[]");
        } catch (e) {
            // It's possible the dump file is empty or corrupted, simply assume no saved processes.
            console.warn("Failed to parse saved list:", e);
            savedList = [];
        }

        // Create a set of saved process names for lookup
        const savedNames = new Set(savedList.map((p: any) => p.name));

        return runningList.map((proc: any) => ({
            ...proc,
            isPermanent: savedNames.has(proc.name)
        }));

    } catch (e) {
        console.error("Failed to process pm2 output:", e);
        return [];
    }
}

// Get Supervisor Processes
export async function getSupervisorProcesses() {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    if (!serverId) throw new Error("No server selected");

    // Command to list supervisor processes
    // Check multiple locations for supervisorctl
    const command = `
    if command -v supervisorctl &> /dev/null; then 
        sudo supervisorctl status
    elif [ -f /usr/bin/supervisorctl ]; then
        sudo /usr/bin/supervisorctl status
    elif [ -f /usr/local/bin/supervisorctl ]; then
        sudo /usr/local/bin/supervisorctl status
    else
        echo "SUPERVISORCTL_NOT_FOUND"
    fi`;

    const result = await executeQuickCommand(serverId, command);

    if (result.error) {
        console.warn("Error fetching supervisor list:", result.error);
        return [];
    }

    try {
        const output = (result.output || "").trim();
        if (output === "SUPERVISORCTL_NOT_FOUND") return { error: "SUPERVISOR_NOT_INSTALLED" };

        const lines = output.split('\n');
        const processes = [];

        for (const line of lines) {
            if (!line) continue;

            // Robust parsing: Name (no spaces) + Spaces + State (no spaces) + Optional Spaces + Optional Description
            const match = line.match(/^(\S+)\s+(\S+)(?:\s+(.*))?$/);

            if (match) {
                const name = match[1];
                const state = match[2];
                const description = match[3] || "";

                // Parse PID and Uptime from description if possible
                let pid = null;
                let uptime = null;

                const pidMatch = description.match(/pid (\d+)/);
                if (pidMatch) {
                    pid = parseInt(pidMatch[1], 10);
                }

                const uptimeMatch = description.match(/uptime (\S+)/);
                if (uptimeMatch) {
                    uptime = uptimeMatch[1];
                }

                processes.push({
                    name,
                    state,
                    description,
                    pid,
                    uptime,
                    source: 'supervisor',
                    isPermanent: true
                });
            }
        }

        return processes;

    } catch (e) {
        console.error("Failed to process supervisor output:", e);
        return [];
    }
}

export async function restartApplicationProcess(serverId: string, pmId: string | number) {
    if (!serverId) return { error: "Server not selected" };

    // Using executeQuickCommand to avoid full DB logging overhead for simple process management, 
    // or use executeCommand if we want history. PM2 management is usually ephemeral.
    const result = await executeQuickCommand(serverId, `pm2 restart ${pmId}`);

    if (result.error) {
        return { error: result.error };
    }

    // Re-fetch list to verify? The UI will likely re-fetch.
    return { success: true, output: result.output };
}

export async function restartSupervisorProcess(serverId: string, name: string) {
    if (!serverId) return { error: "Server not selected" };

    const result = await executeQuickCommand(serverId, `sudo supervisorctl restart ${name}`);

    if (result.error) {
        return { error: result.error };
    }

    return { success: true, output: result.output };
}

export async function resetSupervisorConfiguration(serverId: string) {
    if (!serverId) return { error: "Server not selected" };

    const result = await executeQuickCommand(serverId, `sudo supervisorctl reread && sudo supervisorctl update`);

    if (result.error) {
        return { error: result.error };
    }

    return { success: true, output: result.output };
}

export async function purgeSupervisor(serverId: string) {
    if (!serverId) return { error: "Server not selected" };

    const command = `
sudo systemctl stop supervisor || true
sudo systemctl disable supervisor || true
sudo apt-get purge -y supervisor
sudo rm -rf /etc/supervisor
sudo rm -rf /var/log/supervisor
sudo rm -rf /var/run/supervisor*
sudo rm -rf /usr/lib/systemd/system/supervisor.service
sudo rm -rf /lib/systemd/system/supervisor.service
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
which supervisord || echo "Supervisor removed"
    `.trim();

    // Using executeCommand instead of QuickCommand because this is a major operation
    // and we want to see it in history/logs, and it might take a moment.
    const result = await executeCommand(serverId, command, "Purge Supervisor", command);

    if (result.error) {
        return { error: result.error };
    }

    return { success: true, output: result.output };
}

export async function saveRunningProcesses(serverId: string) {
    if (!serverId) return { error: "Server not selected" };

    // 1. Save current process list to dump file
    const saveResult = await executeQuickCommand(serverId, `pm2 save --force`);
    if (saveResult.error) {
        return { error: saveResult.error };
    }

    // 2. Ensure startup hook is present for reboot persistence
    // Running 'pm2 startup' checks the init system and prints a command to run (starting with sudo) if needed.
    const startupResult = await executeQuickCommand(serverId, `pm2 startup`);
    const output = startupResult.output || "";

    // Regex to find the suggested command: "sudo env PATH=..."
    // We look for a line starting with sudo env PATH
    const commandMatch = output.match(/sudo env PATH=[^\n]+/);

    if (commandMatch) {
        const setupCommand = commandMatch[0];
        // Execute the generated startup command
        await executeQuickCommand(serverId, setupCommand);
    }

    revalidatePath('/applications/running');
    return { success: true, output: saveResult.output };
}

export async function rebootSystem(serverId: string) {
    if (!serverId) return { error: "Server not selected" };

    // Reboot command with sudo. 
    // Ideally use 'shutdown -r now'
    const result = await executeQuickCommand(serverId, `sudo reboot`);

    // Connection drop is expected.
    if (result.error && !result.error.toLowerCase().includes('closed') && !result.error.toLowerCase().includes('timeout') && !result.error.toLowerCase().includes('reset')) {
        // It's hard to catch exactly as SSH client might throw various network errors on instant reboot.
        // Pass for now?
        // Actually if we get an error let's return it, but UI should handle it gracefully if it looks like a network drop.
        return { error: result.error };
    }

    return { success: true, message: "Reboot initiated." };
}

export async function getProcessDetails(provider: string, name: string) {
    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    if (!serverId) throw new Error("No server selected");

    if (provider === 'supervisor') {
        // 1. Get Status
        const statusCmd = `sudo supervisorctl status ${name}`;
        const statusRes = await executeQuickCommand(serverId, statusCmd);
        if (statusRes.error || !statusRes.output) return null;

        const line = statusRes.output.trim();
        // Match: "name state description"
        // e.g. "worker RUNNING pid 123, uptime..."
        const match = line.match(/^(\S+)\s+(\S+)\s+(.*)$/);
        if (!match) return null;

        const state = match[2]; // RUNNING, STOPPED, FATAL, etc.
        const description = match[3];
        let pid = 0;

        const pidMatch = description.match(/pid (\d+)/);
        if (pidMatch) pid = parseInt(pidMatch[1], 10);

        // 2. Get Resource Usage (if running)
        let cpu = 0;
        let memory = 0;
        let startTime = 0;

        if (pid > 0) {
            // %cpu, rss (in KB), lstart (start time)
            const psCmd = `ps -p ${pid} -o %cpu,rss,lstart --no-headers`;
            const psRes = await executeQuickCommand(serverId, psCmd);

            if (!psRes.error && psRes.output) {
                // Output format: " 0.0  1234 Mon Jan 1 10:00:00 2024"
                // Trim and split by whitespace
                // First 2 parts are numbers, rest is date
                const trimmed = psRes.output.trim();
                const firstSpace = trimmed.indexOf(' ');
                const secondSpace = trimmed.indexOf(' ', firstSpace + 1);

                if (firstSpace > -1 && secondSpace > -1) {
                    const cpuStr = trimmed.substring(0, firstSpace);
                    const memStr = trimmed.substring(firstSpace + 1, secondSpace);
                    const dateStr = trimmed.substring(secondSpace + 1);

                    cpu = parseFloat(cpuStr) || 0;
                    memory = (parseInt(memStr) || 0) * 1024; // KB to Bytes
                    startTime = new Date(dateStr).getTime();
                }
            }
        }

        // 3. Get Config Details
        // We try to grep the config file that defines this program
        // Pattern: [program:name]
        // If name has group (group:name), search for program:name
        const cleanName = name.includes(':') ? name.split(':')[1] : name;

        // Command to find file and read relevant lines
        // We look for command, directory, user, stdout_logfile, stderr_logfile
        // We search in /etc/supervisor/conf.d/ and /etc/supervisor/supervisord.conf
        // We use grep to find the file containing the section, then cat it.
        // We use 'head -n 1' to just take the first matching file.
        const configCmd = `grep -r -l "\\[program:${cleanName}\\]" /etc/supervisor/conf.d/ /etc/supervisor/supervisord.conf 2>/dev/null | head -n 1 | xargs -I {} cat {}`;

        const configRes = await executeQuickCommand(serverId, configCmd);
        const config = {
            command: '',
            directory: '',
            user: '',
            stdout_logfile: '',
            stderr_logfile: ''
        };

        if (!configRes.error && configRes.output) {
            // Parse the ini-like content loosely
            // We only care about the section for our program
            const lines = configRes.output.split('\n');
            let inSection = false;
            for (const l of lines) {
                const trimmed = l.trim();
                if (trimmed.startsWith(`[program:${cleanName}]`)) {
                    inSection = true;
                    continue;
                }
                if (trimmed.startsWith('[') && trimmed !== `[program:${cleanName}]`) {
                    inSection = false;
                }
                if (inSection) {
                    if (trimmed.startsWith('command=')) config.command = trimmed.substring(8).trim();
                    if (trimmed.startsWith('directory=')) config.directory = trimmed.substring(10).trim();
                    if (trimmed.startsWith('user=')) config.user = trimmed.substring(5).trim();
                    if (trimmed.startsWith('stdout_logfile=')) config.stdout_logfile = trimmed.substring(15).trim();
                    if (trimmed.startsWith('stderr_logfile=')) config.stderr_logfile = trimmed.substring(15).trim();
                }
            }
        }

        // Map status to PM2-like status for UI compatibility
        let pmStatus = 'stopped';
        if (state === 'RUNNING') pmStatus = 'online';
        else if (state === 'FATAL' || state === 'BACKOFF') pmStatus = 'errored';
        else if (state === 'STARTING') pmStatus = 'launching';

        return {
            name: name,
            pm_id: name, // Use name as ID
            pm2_env: {
                status: pmStatus,
                pm_uptime: startTime,
                restart_time: 0, // Hard to get without parsing logs
                pm_exec_path: config.command || 'N/A',
                pm_cwd: config.directory || 'N/A',
                exec_interpreter: 'supervisor',
                instances: 1,
                node_version: 'N/A',
                pm_out_log_path: config.stdout_logfile || 'N/A',
                pm_err_log_path: config.stderr_logfile || 'N/A'
            },
            monit: {
                cpu: cpu,
                memory: memory
            }
        };
    }

    if (provider !== 'pm2') {
        throw new Error(`Provider ${provider} not supported`);
    }

    // pm2 describe returns details including env vars, paths, etc.
    const result = await executeQuickCommand(serverId, `pm2 describe "${name}" --json`);

    if (result.error) {
        console.warn("Error fetching process details:", result.error);
        return null; // Or throw
    }

    try {
        const list = JSON.parse(result.output || "[]");
        if (Array.isArray(list) && list.length > 0) {
            return list[0];
        }
        return null;
    } catch (e) {
        console.error("Failed to parse pm2 describe output:", e);
        return null;
    }
}

export async function deployConfiguration(applicationId: string) {
    const app = await getApplication(applicationId) as any;
    if (!app) throw new Error("Application not found");

    const cookieStore = await cookies();
    const serverId = cookieStore.get('selected_server')?.value;
    if (!serverId) throw new Error("No server selected. Please select a server first.");

    const location = app.location;
    if (!location) throw new Error("Application location not defined");

    // 1. Prepare Environment Variables
    let envContent = "";
    if (app.environments) {
        envContent = Object.entries(app.environments)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');
    }


    const cmdEnv = `cat <<'EOF' > "${location}/.env"
${envContent}
EOF
`;

    await executeCommand(serverId, cmdEnv, `Deploying .env for ${app.name}`, cmdEnv);

    // 2. Handle Config (Next.js) - REMOVED


    // 3. Handle Custom File Overrides
    if (app.files && Object.keys(app.files).length > 0) {
        let fileOpsScript = `echo "Starting Custom File Deployment..."\n`;

        for (const [filePath, content] of Object.entries(app.files as Record<string, string>)) {
            // Create unique delimiter to avoid conflicts with file content
            const delimiter = `EOF_${Math.random().toString(36).substring(7).toUpperCase()}`;
            const targetPath = `${location}/${filePath}`;

            fileOpsScript += `
mkdir -p "$(dirname "${targetPath}")"
cat <<'${delimiter}' > "${targetPath}"
${content}
${delimiter}
echo "Deployed ${filePath}"
`;
        }

        await executeCommand(serverId, fileOpsScript, `Deploying ${Object.keys(app.files).length} custom files for ${app.name}`, fileOpsScript);
    }

    revalidatePath(`/applications/${applicationId}`);
    return { success: true };
}
