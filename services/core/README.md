# Core Command Modules

This directory contains unified command definitions for different application types and operations.

## Structure

Each application type or operation has a single unified file:
- `nextjs.ts` - Next.js applications
- `nodejs.ts` - Node.js applications  
- `python.ts` - Python applications
- `github.ts` - Git/GitHub operations (clone, pull, reset)
- `nginx.ts` - Nginx configuration generator
- `universal.ts` - Universal system abstractions (Linux, Windows)

## Command Definition Format

Each command follows this structure:

```typescript
interface CommandDefinition {
    title: string;              // Display name (e.g., "Start", "Build")
    description: string;        // User-friendly description
    icon: string;              // Lucide icon name (e.g., "PlayCircle", "Hammer")
    status: 'published' | 'unpublished';  // Controls visibility in UI
    type: 'normal' | 'destructive' | 'success';  // Visual styling
    command: {
        preCommand?: string;    // Runs before main command (e.g., port finding)
        mainCommand: string;    // Main command (logged in console)
        postCommand?: string;   // Cleanup/maintenance after main command
    };
}
```

## Command Types

- **normal**: Default styling (e.g., Build, Restart)
- **destructive**: Red styling for dangerous operations (e.g., Stop, Delete)
- **success**: Green styling for positive actions (e.g., Start, Deploy)

## Adding New Commands

1. Open the appropriate core file (e.g., `nextjs.ts`)
2. Create a new command function:

```typescript
export const myCommand = (context: CommandContext): CommandDefinition => ({
    title: 'My Command',
    description: 'What this command does',
    icon: 'IconName',
    status: 'published',
    type: 'normal',
    command: {
        preCommand: 'optional setup',
        mainCommand: 'main command here',
        postCommand: 'optional cleanup'
    }
});
```

3. Add it to `getAllCommands()`:

```typescript
export const getAllCommands = (context: CommandContext): Record<string, CommandDefinition> => ({
    // ... existing commands
    myCommand: myCommand(context),
});
```

The command will automatically appear in the UI!

## Benefits

✅ **Single Source of Truth**: One file per app type  
✅ **Auto-Discovery**: Commands automatically show in UI  
✅ **Rich Metadata**: Icons, colors, descriptions built-in  
✅ **Status Control**: Show/hide commands with `status` field  
✅ **Type Safety**: TypeScript interfaces ensure consistency  
✅ **Pre/Post Hooks**: Separate concerns (setup, execution, cleanup)

## Migration

Old structure (deprecated):
```
/core/next-js/start.ts
/core/next-js/stop.ts
/core/next-js/build.ts
/core/node/start.ts
/core/node/stop.ts
/core/github/clone.ts
/core/github/pull.ts
/core/github/reset.ts
/core/nginx/generator.ts
/core/universal/base.ts
/core/universal/linux.ts
/core/universal/windows.ts
/core/universal/index.ts
```

New structure:
```
/core/nextjs.ts (contains all Next.js commands)
/core/nodejs.ts (contains all Node.js commands)
/core/github.ts (contains all Git operations)
/core/nginx.ts (contains Nginx config generator)
/core/universal.ts (contains all system abstractions)
```

Legacy compatibility functions are maintained for backward compatibility.
