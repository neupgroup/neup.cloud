# Clean App Directory Rule

- The `/app` directory must only contain:
	- `page.tsx`, `route.ts`, and layout files
	- UI-only client/server components (no direct DB, server, or business logic)
- All business logic, database access, and server-side actions must be in `/services`.
- All UI widgets, dashboards, and reusable UI elements must be in `/components`.
- Any file in `/app` that contains business logic, direct DB/server access, or is not a UI/page/layout/route must be moved to `/services` or `/components`.
- `/app/(main)/server/applications/[id]/` should contain at most `page.tsx` and minimal UI helpers. All other logic/UI should be in `/components` or `/services`.

**Enforcement:**
- If you see more than 2-3 files in a route folder, refactor and move logic/UI widgets out.
- No action files, logics, or business logic in `/app`.


# Rules
- Every push is live and not shadow database.
## File Naming

- All files must have a short, self-explanatory name that clearly describes their purpose or contents.
- When renaming files, record the change in `changelog.md` with both the previous and new name. This changelog is used to fix import issues and track refactors.

### Example changelog entry
- `old/path/oldName.ts` → `new/path/newName.ts`

## Code Location

- **UI Components**: Place all reusable UI components in the `/components` folder. This includes buttons, cards, dialogs, forms, and any presentational or layout components.
	- Example: `/components/ui/button.tsx`, `/components/dashboard/recommendation-client.tsx`
- **Services**: Place all business logic, data fetching, and integration logic in the `/services` folder. This includes API clients, database access, and logic that is not directly tied to UI rendering.
	- Example: `/services/servers.ts`, `/services/databases.ts`
- **Logic**: Any code related to application logic (not UI) should be in the `/services` folder.
- **Component Placement**: If a component is only used in a specific feature or page, you may place it in a subfolder under `/components` (e.g., `/components/database/`). For highly specific, non-reusable components, you may also colocate them with the feature, but prefer `/components` for anything that could be reused.

## Refactoring Rules

- **Function Length**: Functions should be concise and focused. Prefer functions under 40 lines. If a function grows too large, break it into smaller helper functions.
- **Function Naming**: Use descriptive, camelCase names for functions. For React components, use PascalCase.
	- Example: `getServerStatus`, `fetchDatabaseList`, `ServerStatusCard`
- **Variable Naming**: Use clear, descriptive names in camelCase. Avoid abbreviations unless they are well-known.
	- Example: `serverList`, `databaseConnection`, `userId`
- **Types Location**:
	- **Common Types**: For types shared across multiple files or features, place them in a common types file, e.g., `/services/types.ts` or `/services/database/types.ts`.
	- **Feature-Specific Types**: If a type is only used in one file (e.g., a type for a single server action), define it inside that file.
	- **Feature-Wide Types**: If a type is used across multiple files for a feature (e.g., all server-related files), place it in `/services/server/types.ts`.
	- **Example**:
		- `// For a type only used in addServer.ts:`
		- `// /services/server/addServer.ts`
		- `type AddServerRequest = { ... }`
		- `// For a type used in multiple server files:`
		- `// /services/server/types.ts`
		- `export type Server = { ... }`
- **Component Location**: Place reusable components in `/components`. Feature-specific components can be in `/components/<feature>/` or colocated with the feature if not reused elsewhere.

---
Add more rules as the codebase evolves.
