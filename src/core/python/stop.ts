
export const getStopCommand = (appName: string) => {
    return `pm2 stop ${appName}`;
};
