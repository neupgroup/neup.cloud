
export const getBuildCommand = (appLocation: string) => {
    return `
cd ${appLocation} && \
rm -rf .next && \
NODE_OPTIONS="--max-old-space-size=1500" npm run build
`;
};
