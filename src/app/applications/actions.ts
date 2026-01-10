'use server';

import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { executeCommand } from '../commands/actions';
import { cookies } from 'next/headers';

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
    repo: string;
    language: string;
    status: string;
    applicationLocation: string;
    commands: {
        start: string;
        stop: string;
        restart: string;
    };
    customCommands?: { name: string; command: string; }[];
    allowNetwork: boolean;
    allowedPorts: number[];
    url?: string;
}) {
    await addDoc(collection(firestore, 'applications'), appData);
    revalidatePath('/applications');
}

export async function deleteApplication(id: string) {
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
    echo "$EXISTING_STATUS" | jq \\\\
        --arg stage "$STAGE_NAME" \\\\
        --arg status "ongoing" \\\\
        --arg time "$TIMESTAMP" \\\\
        'map(if .stage_name == $stage then .status = $status | .started_on = $time else . end) | 
         if any(.stage_name == $stage) then . else . + [{"stage_name": $stage, "status": $status, "started_on": $time}] end' \\\\
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
        cat "$STATUS_FILE" | jq \\\\
            --arg stage "$STAGE_NAME" \\\\
            'map(if .stage_name == $stage then .status = "completed" else . end)' \\\\
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
