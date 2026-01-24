
'use server';

import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { executeCommand, executeQuickCommand } from '../commands/actions';
import { cookies } from 'next/headers';
import * as NextJsStop from '@/core/next-js/stop';
import * as NodeJsStop from '@/core/node/stop';
import * as PythonStop from '@/core/python/stop';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import * as GitClone from '@/core/github/clone';
import * as GitPull from '@/core/github/pull';
import * as GitPullForce from '@/core/github/pull-force';
import * as GitReset from '@/core/github/reset';

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
                        stopCommand = NextJsStop.getStopCommand(app.name);
                        break;
                    case 'node':
                        stopCommand = NodeJsStop.getStopCommand(app.name);
                        break;
                    case 'python':
                        stopCommand = PythonStop.getStopCommand(app.name);
                        break;
                    default:
                        // Generic fallback if PM2 is used
                        stopCommand = `pm2 stop "${app.name}"`;
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
# SWAP CREATION LOGIC
# ==========================================
echo "-->>-->>swap_space_create.starts<<--<<--"

SWAP_FILE="/swapfile_$(date +%s)_$RANDOM"
CREATED_SWAP_FILE=""

create_swap() {
    local size_gb=$1
    local size_mb=$2
    
    echo "Attempting to create swap space: $size_gb..."
    
    # Try fallocate first
    if fallocate -l "$size_gb" "$SWAP_FILE" 2>/dev/null; then
        echo "Allocated $size_gb using fallocate."
    else
        echo "fallocate failed, trying dd..."
        # Calculate blocks for dd (MB)
        if ! dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$size_mb 2>/dev/null; then
             echo "dd failed."
             rm -f "$SWAP_FILE"
             return 1
        fi
    fi

    chmod 600 "$SWAP_FILE"
    if ! mkswap "$SWAP_FILE" >/dev/null 2>&1; then
        echo "mkswap failed."
        rm -f "$SWAP_FILE"
        return 1
    fi

    if ! swapon "$SWAP_FILE" >/dev/null 2>&1; then
        echo "swapon failed."
        rm -f "$SWAP_FILE"
        return 1
    fi

    echo "Successfully enabled $size_gb swap space."
    CREATED_SWAP_FILE="$SWAP_FILE"
    return 0
}

# Get Total RAM in MB
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
TARGET_SWAP_MB=$((TOTAL_RAM_MB * 2))

# Convert to GB (roughly) for display text, maintain precise MB for dd
TARGET_SWAP_GB_INT=$((TARGET_SWAP_MB / 1024))
TARGET_SWAP_STR="\${TARGET_SWAP_GB_INT}G"

# If calculated target is < 1G (e.g. 512MB RAM -> 1GB swap), format properly
if [ $TARGET_SWAP_MB -lt 1024 ]; then
     TARGET_SWAP_STR="\${TARGET_SWAP_MB}M"
fi

# Attempt sequence
SWAP_CREATED="false"

# 1. Try 2x RAM
if create_swap "$TARGET_SWAP_STR" "$TARGET_SWAP_MB"; then
    SWAP_CREATED="true"
else
    # 2. Try 4GB
    if create_swap "4G" "4096"; then
        SWAP_CREATED="true"
    else
        # 3. Try 2GB
        if create_swap "2G" "2048"; then
            SWAP_CREATED="true"
        else
            # 4. Try 1GB
            if create_swap "1G" "1024"; then
                SWAP_CREATED="true"
            else
                # 5. Try 500MB
                if create_swap "500M" "500"; then
                    SWAP_CREATED="true"
                else
                    echo "Failed to create any swap space. Proceeding without swap."
                fi
            fi
        fi
    fi
fi

echo "-->>-->>swap_space_create.ends<<--<<--"


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
# SWAP DELETION LOGIC
# ==========================================
echo "-->>-->>swap_space_delete.starts<<--<<--"

if [ -n "$CREATED_SWAP_FILE" ]; then
    echo "removing swap space: $CREATED_SWAP_FILE"
    swapoff "$CREATED_SWAP_FILE" 2>/dev/null
    rm -f "$CREATED_SWAP_FILE"
    echo "Swap space removed."
else
    echo "No swap space to remove."
fi

echo "-->>-->>swap_space_delete.ends<<--<<--"


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
                command = wrapWithKey((path) => GitClone.getPrivateCloneCommand(location, repoUrl, path));
            } else {
                command = GitClone.getPublicCloneCommand(location, repoUrl);
            }
            break;
        case 'pull':
            description = `Pulling Repository`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => GitPull.getPrivatePullCommand(location, path, 'main'));
            } else {
                command = GitPull.getPullCommand(location, 'main');
            }
            break;
        case 'pull-force':
            description = `Force Pulling Repository`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => GitPullForce.getPrivatePullForceCommand(location, path, 'main'));
            } else {
                command = GitPullForce.getPullForceCommand(location, 'main');
            }
            break;
        case 'reset-main':
            description = `Resetting to Main`;
            if (isPrivate && privateKey) {
                command = wrapWithKey((path) => GitReset.getPrivateResetCommand(location, path, 'origin/main'));
            } else {
                command = GitReset.getResetCommand(location, 'origin/main');
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

    const result = await executeQuickCommand(serverId, "pm2 jlist");

    if (result.error) {
        console.warn("Error fetching pm2 list:", result.error);
        return [];
    }

    try {
        return JSON.parse(result.output);
    } catch (e) {
        console.error("Failed to parse pm2 jlist output:", result.output);
        return [];
    }
}
