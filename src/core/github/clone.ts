
export const getPublicCloneCommand = (appLocation: string, repoUrl: string) => {
    return `
# Public Clone Strategy
mkdir -p "${appLocation}"
cd "${appLocation}"

# Clone into a temporary directory
git clone "${repoUrl}" temp_clone_dir

# Move contents to app location (hidden files included)
# We use find to avoid errors if dir is empty, but git clone ensures it's not.
shopt -s dotglob
mv temp_clone_dir/* .
shopt -u dotglob

# Clean up
rm -rf temp_clone_dir
`;
};

export const getPrivateCloneCommand = (appLocation: string, repoUrl: string, keyPath: string = '/root/.ssh/id_ed25519') => {
    // Assumes key is already placed at keyPath (e.g. via prior setup or passed in env)
    // Actually, for better security/isolation, we often use GIT_SSH_COMMAND
    // But keeping it simple as a script generation.
    return `
# Private Clone Strategy using SSH Key
# Ensure Key Permissions
chmod 600 "${keyPath}"

mkdir -p "${appLocation}"
cd "${appLocation}"

# Use GIT_SSH_COMMAND to force using the specific key
export GIT_SSH_COMMAND="ssh -i ${keyPath} -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"

# Clone
git clone "${repoUrl}" temp_clone_dir

# Move contents
shopt -s dotglob
mv temp_clone_dir/* .
shopt -u dotglob

# Clean up
rm -rf temp_clone_dir
`;
};
