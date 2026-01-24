
export const getStatus = (appName: string) => {
    return `pm2 describe ${appName}`;
};
