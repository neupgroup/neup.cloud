
import { UniversalBase } from './base';

export class UniversalWindows extends UniversalBase {
    async resolveDynamicVariable(variableName: string): Promise<string | undefined> {
        if (!this.executor) return undefined;

        switch (variableName) {
            case 'os.availableNetworkPort_random':
                return this.executeCommand(`
                $start = 1024; $end = 65535;
                do {
                    $port = Get-Random -Minimum $start -Maximum ($end + 1);
                    $used = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue;
                } while ($used);
                Write-Output $port
                `);
            case 'os.availableNetworkPort_first':
                return this.executeCommand(`
                $start = 1024; $end = 65535;
                for ($port = $start; $port -le $end; $port++) {
                    $used = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue;
                    if (-not $used) { Write-Output $port; break; }
                }
                `);
            case 'os.availableNetworkPort_last':
                return this.executeCommand(`
                $start = 1024; $end = 65535;
                for ($port = $end; $port -ge $start; $port--) {
                    $used = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue;
                    if (-not $used) { Write-Output $port; break; }
                }
                `);
            case 'os.ramUsed':
                return this.executeCommand(`
                $os = Get-CimInstance Win32_OperatingSystem;
                $usedMB = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1024);
                Write-Output $usedMB
                `);
            case 'os.ramFree':
                return this.executeCommand(`
                $os = Get-CimInstance Win32_OperatingSystem;
                $freeMB = [math]::Round($os.FreePhysicalMemory / 1024);
                Write-Output $freeMB
                `);
            default:
                return undefined;
        }
    }

    private async executeCommand(command: string): Promise<string | undefined> {
        if (!this.executor) return undefined;
        try {
            // Encode command for PowerShell execution if needed, or just pass to executor expecting it handles shell
            // Assuming executor runs via SSH which invokes default shell (CMD or PowerShell).
            // Usually Windows SSH defaults to CMD, so we wrap in powershell.
            const wrapped = `powershell -Command "${command.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`;
            const result = await this.executor(wrapped);
            if (result.code === 0 && result.stdout) {
                return result.stdout.trim();
            }
        } catch (error) {
            console.error('Error resolving variable on Windows:', error);
        }
        return undefined;
    }
}
