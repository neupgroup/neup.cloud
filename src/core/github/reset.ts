
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
