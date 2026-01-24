
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
