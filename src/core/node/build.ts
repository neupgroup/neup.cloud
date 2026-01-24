
export const getBuildCommand = (appLocation: string) => {
    return `
cd ${appLocation} && \
npm install && \
if grep -q "\"build\":" "package.json"; then npm run build; fi
`;
};
