# Run Studio Desk independently

The standalone version uses a Studio Desk password, not a ChatGPT account. It includes the same workspace UI and stores all records in one owner-controlled SQLite database. Only the compiled UI is public; the workspace API requires a valid session.

## Prepared Render deployment

`render.yaml` defines a Docker web service with one instance and a 1 GB persistent disk at `/data`. This is a **paid configuration**. At preparation time (7 November 2026), Render listed the smallest paid compute at US$7/month and storage at US$0.25/GB/month. Confirm current prices and approve the cost before creating the service. Free web services cannot attach the persistent disk required by this setup.

1. Connect Render to your private GitHub repository `shoeab2007/studio-desk-workspace`.
2. Create a Blueprint from this repository and review `render.yaml`.
3. Set `STUDIO_PASSWORD` privately in Render's environment-variable form. Use a unique password of at least 16 characters. Do not put it in GitHub, chat, or this document.
4. Review the paid service and disk charges, then deploy. The Dockerfile builds the browser app and starts the independent server. Render provides `RENDER_EXTERNAL_URL`, used to validate browser write origins.
5. Open the **actual service URL returned by Render**, enter your Studio Desk password, and add a test record.
6. Restart the service and verify the record remains. Sign in from your phone and check that the record appears; refresh using the workspace refresh control when switching devices.
7. Export your existing ChatGPT Site workspace JSON backup from Settings, then import it into the new workspace. Existing Site data is not copied automatically.

The repository and deployment files are prepared; they do not establish that a Render service has been created or deployed. GitHub pushes do not deploy automatically because `autoDeployTrigger` is off. Use a manual deployment after reviewing later changes.

## Other Docker hosts

Use a host with HTTPS, a Docker build, and a persistent writable volume mounted at `/data`. Configure:

| Variable | Required value |
| --- | --- |
| `STUDIO_PASSWORD` | Unique 16–1024 character password, set as a host secret |
| `PUBLIC_ORIGIN` | Exact HTTPS origin, e.g. `https://studio.example.com` |
| `DATA_DIR` | `/data` |
| `PORT` | Host-assigned internal port; default `8080` |

Render can use `RENDER_EXTERNAL_URL` instead of `PUBLIC_ORIGIN`. If you switch to a custom domain, set `PUBLIC_ORIGIN` to its exact HTTPS origin and restart. Use one canonical origin, one server instance and one persistent volume. The container runs as the `node` user (UID 1000); its mounted directory must be writable by that user.

## Run on your own computer

Use Node.js 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm run build:standalone
```

Set `STUDIO_PASSWORD` privately in your terminal environment or secret manager. For loopback-only testing, also set `LOCAL_HTTP=1`, then run:

```sh
pnpm run start:standalone
```

Open `http://localhost:8080`. The local database is `data/studio.db`. `LOCAL_HTTP=1` permits a non-Secure cookie for local HTTP; leave it unset on hosted servers. The server listens on all interfaces, so keep local testing on a trusted device/network and use a firewall as appropriate.

## Checks

```sh
pnpm run test:standalone
pnpm exec tsc --noEmit
pnpm run build:standalone
```

The standalone tests exercise the real HTTP server with temporary SQLite files. They cover unauthorized reads, incorrect passwords, valid login, secure production cookies, rejected cross-origin writes, revision conflicts, schema validation, sign-out, and persistence through a server restart. They do not establish that Docker or a hosting provider has deployed successfully.

## Sessions, backups and updates

- Sessions last up to 24 hours and are invalidated by a server restart. Restart after changing the password.
- The session token is stored in an HttpOnly cookie; password checks use a salted scrypt hash in process memory. The password is never included in browser assets.
- Only password holders can read or edit records. This is a single-owner workspace, not separate client accounts.
- Login attempts are globally limited to 30 per 10 minutes. This is intended for one owner and a few trusted devices.
- The app rejects stale workspace revisions. Export unsaved work before reloading after a conflict.
- Export a JSON backup regularly and before imports, upgrades or hosting changes. SQLite files, passwords and backup exports are excluded from Git and Docker build context.
- The original ChatGPT Site remains separate. It retains its own login, database and deployment workflow.
