# Studio Desk development

This is Shoaib's graphic design and brand communication workspace.

## Product intent

Keep the interface design-led, calm and useful on phone and laptop. Every business record must remain editable and reusable. Preserve event posters, packaging, print/digital media, social media handling, flex/signage and brand design as editable service defaults.

## Implementation

- Use `app/` for the application, `db/schema.ts` for schema and append-only `drizzle/` migrations.
- Keep `app/data.ts` example records clearly labelled as examples. Do not invent live client information.
- Records are server-backed. The original Sites API scopes records by authenticated user ID; the standalone server is a single-owner workspace protected by password sessions. Keep both server modes intact. The explicitly requested GitHub Pages mode uses browser-only IndexedDB, as documented below.
- Preserve revision checks so stale devices cannot overwrite newer saved state.
- Production identity headers are trusted only behind the Sites authentication gateway. Do not weaken authorization for preview convenience.
- Keep JSON export/import compatible with the original Studio Desk project records and checkpoints.
- Preserve source photos and faces in any future creative asset functionality.

## Validation

For application changes, run `pnpm exec tsc --noEmit`, `node tests/workspace.cjs` and `pnpm run build`. Use Node 24 for the SQLite test. Run checks appropriate to the change; documentation-only edits do not need a rebuild.

## Hosting

`.openai/hosting.json` identifies the existing private Site. Preserve its project ID and D1 binding. A GitHub commit does not deploy the Site. Use the Sites workflow if asked to publish; do not create a duplicate Site.

Keep secrets, database dumps, personal backups, `node_modules`, generated build output, `.sites-runtime` and `.wrangler` out of Git.

## Standalone deployment

The independent Docker/Render app uses `standalone/server.mjs` and `standalone/vite.config.ts`. Preserve password authentication, strict origin checks, HttpOnly Secure cookies in production, persistent SQLite storage and revision checks. Keep one server instance per disk. Run `pnpm run test:standalone` and `pnpm run build:standalone` for changes to this path. See `docs/independent-hosting.md`. Hosting is paid; obtain cost approval before creating a paid service. Never collect the server password in chat or commit it.

## GitHub Pages mode

The user explicitly chose free GitHub-only hosting. Preserve this browser-only mode (`browserOnly` prop), IndexedDB transactional revision checks and clear local-storage notices. Never upload real client records or backups to the public repository. No server login or cross-device sync is promised. Export/import backups remain available. Use `pnpm run build:pages` and `pnpm exec tsc --noEmit`. Workflow: `.github/workflows/pages.yml`; base path `/studio-desk-workspace/`.
