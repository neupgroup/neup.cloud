/**
 * Universal System Abstractions
 * Cross-platform utilities for Linux and Windows
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type Executor = (command: string) => Promise<{ stdout: string; stderr: string; code: number | null }>;

export interface UniversalContext {
    variables: Record<string, string | number | boolean>;
}

// ============================================================================
// Base Class
// ============================================================================

export abstract class UniversalBase {
    protected context: UniversalContext;
    protected executor?: Executor;

    constructor(context: UniversalContext, executor?: Executor) {
        this.context = context;
        this.executor = executor;
    }

    abstract resolveDynamicVariable(variableName: string): Promise<string | undefined>;

    async process(template: string): Promise<string> {
        // Regex for {{any.variable_name}}
        // Matches {{os.port}}, {{server.ip}}, {{custom.var}}
        const regex = /\{\{([a-zA-Z0-9_\.]+)\}\}/g;
        const matches = Array.from(template.matchAll(regex));

        if (matches.length === 0) return template;

        const uniqueKeys = new Set(matches.map(m => m[1]));
        const replacements = new Map<string, string>();

        for (const key of uniqueKeys) {
            // 1. Check Context Variables first
            if (key in this.context.variables) {
                replacements.set(key, String(this.context.variables[key]));
                continue;
            }

            // 2. Check Dynamic OS Variables
            if (this.executor) {
                const dynamicValue = await this.resolveDynamicVariable(key);
                if (dynamicValue !== undefined) {
                    replacements.set(key, dynamicValue);
                }
            }
        }

        let result = template;
        result = result.replace(regex, (match, p1) => {
            return replacements.get(p1) || match;
        });

        return result;
    }
}

// ============================================================================
// Linux Implementation
// ============================================================================

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

// ============================================================================
// Windows Implementation
// ============================================================================

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

/**
 * Sanitize application name for use in Linux commands (Supervisor, PM2, etc.)
 * - Take first 16 characters
 * - Replace spaces with underscores
 * - Convert to lowercase
 * - Remove illegal characters (anything not a-z, 0-9, or _)
 */
export function sanitizeAppName(name: string): string {
    if (!name) return 'app';

    return name
        .slice(0, 16)
        .replace(/ /g, '_')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
}
