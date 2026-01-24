
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
