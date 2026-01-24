
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
