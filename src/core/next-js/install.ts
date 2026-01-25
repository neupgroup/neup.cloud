
export const getInstallCommand = (appLocation: string) => {
    return `
cd ${appLocation} && \
npm install
`;
};
