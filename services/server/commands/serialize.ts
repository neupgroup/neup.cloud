export interface CommandStep {
  id: string;
  title: string;
  command: string;
  description: string;
  isSkippable?: boolean;
  isRepeatable?: boolean;
}

export function serializeCommandSetCommands(commands: CommandStep[]) {
  return commands.map((step, index) => {
    const lines = [`# Step ${index + 1}: ${step.title}`];

    if (step.description?.trim()) {
      lines.push(...step.description.split('\n').map((line) => `# ${line}`));
    }

    if (step.isSkippable) {
      lines.push('# Optional step');
    }

    if (step.isRepeatable) {
      lines.push('# Repeatable step');
    }

    lines.push(step.command.trim());
    return lines.join('\n');
  }).join('\n\n');
}