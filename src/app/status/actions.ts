
'use server';

import { getServerForRunner } from '../servers/actions';
import { runCommandOnServer } from '@/services/ssh';
import { revalidatePath } from 'next/cache';

const STATUS_DIR = ".status";
const PID_FILE = `${STATUS_DIR}/status.pid`;
const CPU_LOG = `${STATUS_DIR}/cpu.usage`;
const RAM_LOG = `${STATUS_DIR}/ram.usage`;

const SCRIPT_CONTENT = `
mkdir -p ~/${STATUS_DIR}
echo $$ > ~/${PID_FILE}

cleanup() {
    echo "Stopping status tracking..."
    rm -f ~/${PID_FILE}
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting status tracking in the background..."
while true; do
    # CPU usage: user, system, idle
    cpu_info=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')
    echo "$(date +%s) $cpu_info" >> ~/${CPU_LOG}

    # RAM usage: total, used, free
    ram_info=$(free -m | grep Mem | awk '{print $2, $3, $4}')
    echo "$(date +%s) $ram_info" >> ~/${RAM_LOG}
    
    sleep 60
done
`;

export async function startStatusTracking(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server || server.type !== 'Linux') {
        return { error: 'This feature is only for Linux servers.' };
    }
    if (!server.username || !server.privateKey) {
        return { error: 'Server SSH configuration is missing.' };
    }

    const command = `nohup bash -c '${SCRIPT_CONTENT.replace(/'/g, "'\\''")}' > /dev/null 2>&1 &`;

    try {
        await runCommandOnServer(server.publicIp, server.username, server.privateKey, command);
        revalidatePath('/status');
        return { success: true };
    } catch (e: any) {
        return { error: `Failed to start tracking: ${e.message}` };
    }
}

export async function stopStatusTracking(serverId: string) {
    const server = await getServerForRunner(serverId);
    if (!server) return { error: 'Server not found.' };
    if (!server.username || !server.privateKey) return { error: 'Server SSH configuration is missing.' };

    const command = `
        if [ -f ~/${PID_FILE} ]; then
            kill $(cat ~/${PID_FILE}) && rm ~/${PID_FILE}
            echo "Process stopped."
        else
            echo "PID file not found."
        fi
    `;

    try {
        const result = await runCommandOnServer(server.publicIp, server.username, server.privateKey, command);
        revalidatePath('/status');
        if (result.code !== 0 && !result.stdout.includes("Process stopped")) {
            return { error: result.stderr || 'Failed to stop the process.' };
        }
        return { success: true, message: result.stdout };
    } catch (e: any) {
        return { error: `Failed to stop tracking: ${e.message}` };
    }
}


export type StatusData = {
    isTracking: boolean;
    cpuHistory: { timestamp: number; usage: number }[];
    ramHistory: { timestamp: number; used: number; total: number }[];
};

export async function getStatus(
    serverId: string,
    endTime?: number,
    durationMinutes: number = 60
): Promise<{ data?: StatusData; error?: string }> {
    const server = await getServerForRunner(serverId);
    if (!server) return { error: 'Server not found.' };
    if (!server.username || !server.privateKey) return { error: 'Server SSH configuration is missing.' };

    const endTs = endTime || Date.now();
    const startTs = endTs - (durationMinutes * 60 * 1000);

    // Convert to seconds for comparison with log timestamps
    const startSec = Math.floor(startTs / 1000);
    const endSec = Math.floor(endTs / 1000);

    const checkPidCmd = `if [ -f ~/${PID_FILE} ]; then cat ~/${PID_FILE}; else echo "not_found"; fi`;


    let intervalSec = 0;
    if (durationMinutes <= 60) {
        intervalSec = 0;
    } else if (durationMinutes <= 360) { // 6h -> 15m
        intervalSec = 15 * 60;
    } else if (durationMinutes <= 720) { // 12h -> 30m
        intervalSec = 30 * 60;
    } else if (durationMinutes <= 1440) { // 24h -> 30m (approx 48 points)
        intervalSec = 30 * 60;
    } else if (durationMinutes <= 10080) { // 7d -> 4h (42 points)
        intervalSec = 240 * 60;
    } else { // 30d -> 12h (60 points)
        intervalSec = 720 * 60;
    }

    // Use awk to filter and aggregate by timestamp range
    const readCpuCmd = intervalSec === 0
        ? `awk -v start=${startSec} -v end=${endSec} '$1 >= start && $1 <= end' ~/${CPU_LOG} 2>/dev/null`
        : `awk -v start=${startSec} -v end=${endSec} -v interval=${intervalSec} '
            $1 >= start && $1 <= end {
                bin = int($1 / interval) * interval;
                sum[bin] += $2;
                count[bin]++;
            }
            END {
                for (b in sum) print b, sum[b]/count[b]
            }
           ' ~/${CPU_LOG} 2>/dev/null | sort -n`;

    const readRamCmd = intervalSec === 0
        ? `awk -v start=${startSec} -v end=${endSec} '$1 >= start && $1 <= end' ~/${RAM_LOG} 2>/dev/null`
        : `awk -v start=${startSec} -v end=${endSec} -v interval=${intervalSec} '
            $1 >= start && $1 <= end {
                bin = int($1 / interval) * interval;
                sumTotal[bin] += $2;
                sumUsed[bin] += $3;
                count[bin]++;
            }
            END {
                for (b in sumUsed) print b, int(sumTotal[b]/count[b]), int(sumUsed[b]/count[b])
            }
           ' ~/${RAM_LOG} 2>/dev/null | sort -n`;

    try {
        const [pidResult, cpuResult, ramResult] = await Promise.all([
            runCommandOnServer(server.publicIp, server.username, server.privateKey, checkPidCmd),
            runCommandOnServer(server.publicIp, server.username, server.privateKey, readCpuCmd),
            runCommandOnServer(server.publicIp, server.username, server.privateKey, readRamCmd),
        ]);

        const isTracking = pidResult.stdout.trim() !== 'not_found';

        const cpuHistory = cpuResult.stdout.trim().split('\n').filter(Boolean).map(line => {
            const [timestamp, usage] = line.split(' ');
            return { timestamp: parseInt(timestamp) * 1000, usage: parseFloat(usage) };
        });

        const ramHistory = ramResult.stdout.trim().split('\n').filter(Boolean).map(line => {
            const [timestamp, total, used] = line.split(' ');
            return { timestamp: parseInt(timestamp) * 1000, used: parseInt(used), total: parseInt(total) };
        });

        return { data: { isTracking, cpuHistory, ramHistory } };

    } catch (e: any) {
        return { error: `Failed to get status: ${e.message}` };
    }
}
