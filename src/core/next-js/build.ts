
export const getBuildCommand = (appLocation: string) => {
    // Calculate 80% of total RAM (in MB) for Node.js process
    // {{NEUP_SERVER_RAM_TOTAL}} returns KB, so divide by 1024 to get MB, then multiply by 0.8
    const maxRamVar = "$(echo \"$(({{NEUP_SERVER_RAM_TOTAL}} / 1024 * 8 / 10))\")";

    return `
cd ${appLocation} && \
rm -rf .next && \
NODE_OPTIONS="--max-old-space-size=2048" npm run build
`;
};
