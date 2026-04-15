## To Refactor

The following files mix service/business logic with rendering logic and should be refactored to separate concerns:

1. app/(main)/domains/add/client-page.tsx — Contains UI and logic for domain search and possibly saving to database. Refactor so that all service/database logic is moved to `/core` or `/services`, and only rendering/UI remains in this file. Example: move domain checking, saving, or any business logic to `/services/domains` or `/core/domains`.

2. Review all other files in `/app` that mix logic and rendering. For each, split into:
	- A service file in `/services` or `/core` for business/data logic
	- A render file in `/app` for UI and user interaction

This ensures logic is not duplicated and code is easier to maintain.

Add more files to this list as you discover similar patterns.
# TODO: Merge `*-client.tsx` Into `page.tsx`

These pages are typically a server `page.tsx` that only fetches data and renders a sibling client component. Consider merging by moving the UI into `page.tsx` (making it a client component) and replacing server-only data fetching with narrow server actions (avoid leaking secrets like DB passwords/private keys).

1. app/(main)/database/[id]/table/[name]/properties/page.tsx + app/(main)/database/[id]/table/[name]/properties/properties-client.tsx
2. app/(main)/servers/page.tsx + app/(main)/servers/servers-client.tsx
3. app/(main)/viewer/page.tsx + app/(main)/viewer/viewer-client.tsx
4. app/(main)/server/commands/live/page.tsx + app/(main)/server/commands/live/client.tsx
5. app/(main)/server/files/page.tsx + app/(main)/server/files/files-client.tsx
6. app/(main)/server/status/page.tsx + app/(main)/server/status/status-client.tsx
7. app/(main)/server/system/startup/page.tsx + app/(main)/server/system/startup/startup-client.tsx
8. app/(main)/server/system/packages/page.tsx + app/(main)/server/system/packages/packages-client.tsx
9. app/(main)/server/system/packages/[id]/page.tsx + app/(main)/server/system/packages/[id]/package-details-client.tsx
10. app/(main)/server/system/updates/page.tsx + app/(main)/server/system/updates/updates-client.tsx
11. app/(main)/server/system/updates/[id]/page.tsx + app/(main)/server/system/updates/[id]/update-details-client.tsx
12. app/(main)/server/system/swapper/page.tsx + app/(main)/server/system/swapper/swapper-client.tsx
13. app/(main)/server/webservices/nginx/default/page.tsx + app/(main)/server/webservices/nginx/default/client.tsx
