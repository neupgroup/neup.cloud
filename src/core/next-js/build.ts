
export const getBuildCommand = (appLocation: string) => {
    return `
cd ${appLocation} && \
npm install && \
npm run build
`;
};
