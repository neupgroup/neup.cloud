## To Refactor

The following files mix service/business logic with rendering logic and should be refactored to separate concerns:

1. app/(main)/domains/add/client-page.tsx — Contains UI and logic for domain search and possibly saving to database. Refactor so that all service/database logic is moved to `/core` or `/services`, and only rendering/UI remains in this file. Example: move domain checking, saving, or any business logic to `/services/domains` or `/core/domains`.

2. Review all other files in `/app` that mix logic and rendering. For each, split into:
	- A service file in `/services` or `/core` for business/data logic
	- A render file in `/app` for UI and user interaction

This ensures logic is not duplicated and code is easier to maintain.

Add more files to this list as you discover similar patterns.
# TODO: Service Relocation Issues

Below is a numbered list of files in the /app directory that contain service/business logic and should be reviewed for relocation to the /services folder:

1. app/actions.ts
2. app/(main)/servers/actions.ts
3. app/(main)/servers/[id]/actions.ts
4. app/(main)/viewer/actions.ts
5. app/(main)/server/commands/live/actions.ts
6. app/(main)/server/commands/actions.ts
7. app/(main)/home/actions.ts
8. app/(main)/server/applications/status-actions.ts
9. app/(main)/server/applications/actions.ts
10. (moved) services/database/actions.ts

These files import or implement business logic, data fetching, or service-related operations. Review and move relevant logic to /services as per rules.md.

Add more files to this list as new issues are discovered.

done
