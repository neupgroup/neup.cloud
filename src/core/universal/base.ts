
export type Executor = (command: string) => Promise<{ stdout: string; stderr: string; code: number | null }>;

export interface UniversalContext {
    variables: Record<string, string | number | boolean>;
}

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