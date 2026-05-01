function escapeShellSingleQuoted(value: string) {
    return value.replace(/'/g, `'\\''`);
}

export function getPortCheckScript(portsStr: string) {
    if (!portsStr) return '';
    return `
find_port() {
    local PORTS="${portsStr}"
    for port in $PORTS; do
        if ! (echo >/dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    echo ""
    return 1
}
CHOSEN_PORT=$(find_port)
if [ -z "$CHOSEN_PORT" ]; then
    echo "ERROR: None of the configured ports (${portsStr}) are available. Stop the process using those ports and try again."
    exit 1
fi
echo "Selected Port: $CHOSEN_PORT"
`.trim();
}

export function getStopMatchingSupervisorServicesScript(applicationId?: string) {
    if (!applicationId) {
        return 'true';
    }

    const servicePrefix = `${applicationId}_serving_`;
    const escapedPrefix = escapeShellSingleQuoted(servicePrefix);

    return `
SERVICE_PREFIX='${escapedPrefix}'
MATCHING_SERVICES=$(sudo supervisorctl status 2>/dev/null | awk -v prefix="$SERVICE_PREFIX" '
index($1, prefix) == 1 && length($1) == length(prefix) + 8 {
    suffix = substr($1, length(prefix) + 1)
    if (suffix ~ /^[0-9A-Za-z]{8}$/) {
        print $1
    }
}' || true)

if [ -n "$MATCHING_SERVICES" ]; then
    while IFS= read -r service; do
        [ -n "$service" ] || continue
        sudo supervisorctl stop "$service" >/dev/null 2>&1 || true
        sudo rm -f "/etc/supervisor/conf.d/$service.conf" || true
    done <<EOF
$MATCHING_SERVICES
EOF

    sudo supervisorctl reread >/dev/null 2>&1 || true
    sudo supervisorctl update >/dev/null 2>&1 || true
fi
`.trim();
}

export function getStartOrRestartSupervisorServiceScript(supervisorServiceName: string) {
    const escapedServiceName = escapeShellSingleQuoted(supervisorServiceName);

    return `
SERVICE_NAME='${escapedServiceName}'
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start "$SERVICE_NAME" 2>/dev/null || sudo supervisorctl restart "$SERVICE_NAME"
`.trim();
}
