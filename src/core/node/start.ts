
export const getStartCommand = (appName: string, appLocation: string, entryFile: string = 'index.js', preferredPorts: number[] = []) => {
    const portsStr = preferredPorts.join(' ');

    const portFinderScript = `
find_port() {
    local PORTS="$1"
    for port in $PORTS; do
        if ! (echo >/dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    # Fallback to random port
    while true; do
        local rand=$(( ( RANDOM % 10000 ) + 3000 ))
        if ! (echo >/dev/tcp/127.0.0.1/$rand) >/dev/null 2>&1; then
            echo $rand
            return 0
        fi
    done
}
CHOSEN_PORT=$(find_port "${portsStr}")
echo "Selected Port: $CHOSEN_PORT"
`;

    return `
${portFinderScript}
cd ${appLocation} && \
npm install && \
PORT=$CHOSEN_PORT pm2 start ${entryFile} --name "${appName}"
`;
};
