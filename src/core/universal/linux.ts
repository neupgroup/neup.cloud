
import { UniversalBase } from './base';

export class UniversalLinux extends UniversalBase {
    async resolveDynamicVariable(variableName: string): Promise<string | undefined> {
        if (!this.executor) return undefined;

        switch (variableName) {
            case 'os.availableNetworkPort_random':
                return this.executeCommand(`while :; do port=$(shuf -i 1024-65535 -n 1); ss -lpn | grep -q ":$port " || { echo $port; break; }; done`);
            case 'os.availableNetworkPort_first':
                return this.executeCommand(`for port in $(seq 1024 65535); do ss -lpn | grep -q ":$port " || { echo $port; break; }; done`);
            case 'os.availableNetworkPort_last':
                return this.executeCommand(`for port in $(seq 65535 -1 1024); do ss -lpn | grep -q ":$port " || { echo $port; break; }; done`);
            case 'os.ramUsed':
                return this.executeCommand(`free -m | awk 'NR==2 {print $3}'`);
            case 'os.ramFree':
                return this.executeCommand(`free -m | awk 'NR==2 {print $4}'`);
            default:
                return undefined;
        }
    }

    private async executeCommand(command: string): Promise<string | undefined> {
        if (!this.executor) return undefined;
        try {
            const result = await this.executor(command);
            if (result.code === 0 && result.stdout) {
                return result.stdout.trim();
            }
        } catch (error) {
            console.error('Error resolving dynamic variable:', error);
        }
        return undefined;
    }
}
