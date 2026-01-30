/**
 * GitHub/Git Repository Commands
 * Unified command definitions for Git operations
 */

export interface CommandDefinition {
    title: string;
    description: string;
    icon: string;
    status: 'published' | 'unpublished';
    type: 'normal' | 'destructive' | 'success';
    command: {
        preCommand?: string;
        mainCommand: string;
        postCommand?: string;
    };
}

export interface GitCommandContext {
    appLocation: string;
    repoUrl?: string;
    branch?: string;
    targetRef?: string;
    keyPath?: string;
    isPrivate?: boolean;
}

/**
 * Clone Command (Public)
 */
export const clonePublic = (context: GitCommandContext): CommandDefinition => ({
    title: 'Clone Repository',
    description: 'Clone the repository from GitHub',
    icon: 'GitBranch',
    status: 'published',
    type: 'normal',
    command: {
        mainCommand: getPublicCloneCommand(context.appLocation, context.repoUrl || '')
    }
});

/**
 * Clone Command (Private)
 */
export const clonePrivate = (context: GitCommandContext): CommandDefinition => ({
    title: 'Clone Repository',
    description: 'Clone the private repository using SSH key',
    icon: 'GitBranch',
    status: 'published',
    type: 'normal',
    command: {
        mainCommand: getPrivateCloneCommand(context.appLocation, context.repoUrl || '', context.keyPath || '')
    }
});

/**
 * Pull Command (Public)
 */
export const pull = (context: GitCommandContext): CommandDefinition => ({
    title: 'Pull Changes',
    description: 'Pull latest changes from the repository',
    icon: 'Download',
    status: 'published',
    type: 'normal',
    command: {
        mainCommand: getPullCommand(context.appLocation, context.branch || 'main')
    }
});

/**
 * Pull Command (Private)
 */
export const pullPrivate = (context: GitCommandContext): CommandDefinition => ({
    title: 'Pull Changes',
    description: 'Pull latest changes from private repository',
    icon: 'Download',
    status: 'published',
    type: 'normal',
    command: {
        mainCommand: getPrivatePullCommand(context.appLocation, context.keyPath || '', context.branch || 'main')
    }
});

/**
 * Pull Force Command (Public)
 */
export const pullForce = (context: GitCommandContext): CommandDefinition => ({
    title: 'Force Pull',
    description: 'Force pull and overwrite local changes',
    icon: 'Download',
    status: 'published',
    type: 'destructive',
    command: {
        mainCommand: getPullForceCommand(context.appLocation, context.branch || 'main')
    }
});

/**
 * Pull Force Command (Private)
 */
export const pullForcePrivate = (context: GitCommandContext): CommandDefinition => ({
    title: 'Force Pull',
    description: 'Force pull from private repository and overwrite local changes',
    icon: 'Download',
    status: 'published',
    type: 'destructive',
    command: {
        mainCommand: getPrivatePullForceCommand(context.appLocation, context.keyPath || '', context.branch || 'main')
    }
});

/**
 * Reset Command (Public)
 */
export const reset = (context: GitCommandContext): CommandDefinition => ({
    title: 'Reset',
    description: 'Reset to a specific commit or branch',
    icon: 'RotateCcw',
    status: 'published',
    type: 'destructive',
    command: {
        mainCommand: getResetCommand(context.appLocation, context.targetRef || 'origin/main')
    }
});

/**
 * Reset Command (Private)
 */
export const resetPrivate = (context: GitCommandContext): CommandDefinition => ({
    title: 'Reset',
    description: 'Reset private repository to a specific commit or branch',
    icon: 'RotateCcw',
    status: 'published',
    type: 'destructive',
    command: {
        mainCommand: getPrivateResetCommand(context.appLocation, context.keyPath || '', context.targetRef || 'origin/main')
    }
});

// ============================================================================
// Legacy Command Generators (for backward compatibility)
// ============================================================================

export const getPublicCloneCommand = (appLocation: string, repoUrl: string) => {
    return `
# Public Clone Strategy
# Ensure directory exists
mkdir -p "${appLocation}"

# Check if directory is empty
if [ "$(ls -A ${appLocation})" ]; then
    echo "Warning: Directory ${appLocation} is not empty."
    # We proceed anyway as requested to "clone right there", effectively merging/overwriting
    # But standard git clone fails if target dir not empty.
    # Hence our "clone to temp and move" strategy is actually robust for this.
    # But let's refine to be explicit about the workflow asked.
fi

cd "${appLocation}"

# 1. Clone into a temporary unique directory inside the app location to avoid cross-device move errors
TEMP_DIR="temp_clone_$(date +%s)"
git clone "${repoUrl}" "$TEMP_DIR"

# 2. Move all contents from temp dir to current dir (appLocation)
# shopt -s dotglob enables matching hidden files with *
shopt -s dotglob
cp -rf "$TEMP_DIR"/* .
shopt -u dotglob

# 3. Clean up the temp directory
rm -rf "$TEMP_DIR"
`;
};

export const getPrivateCloneCommand = (appLocation: string, repoUrl: string, keyPath: string = '/root/.ssh/id_ed25519') => {
    return `
# Private Clone Strategy using SSH Key
# Ensure Key Permissions
chmod 600 "${keyPath}"

# Ensure directory exists
mkdir -p "${appLocation}"

cd "${appLocation}"

# Use GIT_SSH_COMMAND to force using the specific key
export GIT_SSH_COMMAND="ssh -i ${keyPath} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"

# 1. Clone into a temporary unique directory inside
TEMP_DIR="temp_clone_$(date +%s)"
git clone "${repoUrl}" "$TEMP_DIR"

# 2. Move contents
shopt -s dotglob
cp -rf "$TEMP_DIR"/* .
shopt -u dotglob

# 3. Clean up
rm -rf "$TEMP_DIR"
`;
};

export const getPullCommand = (appLocation: string, branch: string = 'main') => {
    return `
cd "${appLocation}"
git pull origin "${branch}"
`;
};

export const getPrivatePullCommand = (appLocation: string, keyPath: string, branch: string = 'main') => {
    return `
cd "${appLocation}"
# Set SSH command for this operation
export GIT_SSH_COMMAND="ssh -i ${keyPath} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
git pull origin "${branch}"
`;
};

export const getPullForceCommand = (appLocation: string, branch: string = 'main') => {
    return `
cd "${appLocation}"
git fetch --all
git reset --hard "origin/${branch}"
git pull origin "${branch}" --force
`;
};

export const getPrivatePullForceCommand = (appLocation: string, keyPath: string, branch: string = 'main') => {
    return `
cd "${appLocation}"
export GIT_SSH_COMMAND="ssh -i ${keyPath} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
git fetch --all
git reset --hard "origin/${branch}"
git pull origin "${branch}" --force
`;
};

export const getResetCommand = (appLocation: string, targetRef: string) => {
    // targetRef should be like 'origin/main' or 'HEAD' or a commit hash
    return `
cd "${appLocation}"
git fetch --all
git reset --hard "${targetRef}"
`;
};

export const getPrivateResetCommand = (appLocation: string, keyPath: string, targetRef: string) => {
    return `
cd "${appLocation}"
export GIT_SSH_COMMAND="ssh -i ${keyPath} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
git fetch --all
git reset --hard "${targetRef}"
`;
};
