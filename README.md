# Studio Desk — Shoaib

Private source repository for Shoaib's graphic design and brand communication workspace.

**Live workspace:** https://shoaib-creative-workspace.shoea-b.chatgpt.site

## Included

- Clients and projects, next actions, fees, received payments and hours
- Editable deliverable checklists and revision / approval records
- Reusable service briefs and quotation builder with print-to-PDF layout
- Outreach leads, opportunity values and follow-up dates
- Portfolio project links and notes
- Restaurant, event and personal-brand content calendar
- Custom fields, record duplication, JSON export and legacy Studio Desk import

Service areas: event posters, packaging, print and digital media, social media handling, flex/signage and brand design. Portfolio: https://shoeab2007.github.io/portfolio/

## Continue in Codex

Use this repository as the project source. Read `AGENTS.md` before making changes. The complete application, database schema, migration, lockfile and tests are included.

### Development

Use Node.js 24 (the SQLite test uses `node:sqlite`) and pnpm 11.25.0, as pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nervous_gauntlet.sql
pnpm run dev
```

Apply the migration once per new local database. Open the address printed by the dev server. A clean clone uses the portable development profile. On loopback development only, `/signin-with-chatgpt?return_to=/` starts the starter's mock sign-in. Production sign-in is supplied by ChatGPT Sites.

### Checks

```sh
pnpm exec tsc --noEmit
node tests/workspace.cjs
pnpm run build
```

The API tests cover authorization, write-header protection, persisted read/write, stale-revision rejection, record validation and user isolation using an in-memory SQLite database. They do not prove production authentication or live two-device behavior.

## Source map

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Workspace UI, editors, calendar and quotation print layout |
| `app/globals.css` | Responsive styles and print layout |
| `app/data.ts` | Example records, reusable briefs and field definitions |
| `app/api/workspace/route.ts` | Authenticated workspace reads and revision-checked saves |
| `db/schema.ts`, `drizzle/` | D1 schema and versioned migration |
| `.openai/hosting.json` | Existing Site identity and database binding |
| `docs/runtime.md` | Detailed starter, authentication and runtime guidance |

## Hosting and data

This repository is a source copy of the deployed Site. GitHub pushes do **not** automatically publish to ChatGPT Sites. Publishing requires the Sites workflow and its own source synchronization. Preserve the existing Site ID when updating the live workspace.

Records live in the hosted D1 database, separately from GitHub. No live client records, credentials or database backups are included. The three starter projects are labelled examples. Export a workspace JSON backup from Settings before importing data or changing hosting.

This is a server-backed Cloudflare Worker application with D1 and platform-provided authentication. GitHub Pages cannot run it. Moving to a different host requires adapting authentication and database bindings; never trust caller-supplied identity headers on an unprotected public host.

Outreach, client approval entry and social publishing are manual. The content calendar does not publish posts automatically.
