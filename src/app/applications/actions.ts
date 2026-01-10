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
    echo "$EXISTING_STATUS" | jq \\
        --arg stage "$STAGE_NAME" \\
        --arg status "ongoing" \\
        --arg time "$TIMESTAMP" \\
        'map(if .stage_name == $stage then .status = $status | .started_on = $time else . end) | 
         if any(.stage_name == $stage) then . else . + [{"stage_name": $stage, "status": $status, "started_on": $time}] end' \\
        > "$STATUS_FILE"
else
    # Fallback: simple append (not ideal but works)
    echo "$EXISTING_STATUS" | sed 's/]$//' | sed 's/^\\[//' > /tmp/status_temp
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

# Print command start marker
echo "-->>-->>${stageName}.starts<<--<<--"

# Now run the actual command
${command}

# Capture exit code
COMMAND_EXIT_CODE=$?

# Print command end marker
echo "-->>-->>${stageName}.ends<<--<<--"

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

    // Execute the wrapped command
    return await executeCommand(serverId, updateStatusCommand, formattedCommandName);
}

