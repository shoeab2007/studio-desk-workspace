# Free GitHub Pages workspace

This build is a static, browser-only version. It runs without ChatGPT, Render, a hosted server or database. A local password unlocks encrypted records on each browser.

## Data behavior

Records are stored in this browser's IndexedDB. The public repository contains code and labelled example records, never your saved client records. Records are encrypted using AES-GCM and a password-derived key (PBKDF2-SHA-256, 600,000 iterations). There is no server login, recovery account, cloud backup or automatic phone/laptop sync. The first visit asks you to create a password for that browser. A reload or the Lock workspace button requires the password again. Each browser has its own setup. Existing unencrypted browser records are migrated into encrypted storage when the password is created.

There is **no password recovery**. Export a JSON backup while signed in and keep it safe; exported backups are unencrypted. Clearing browser data removes the vault. A forgotten password cannot decrypt the saved records. Browser encryption protects stored records while locked; use a trusted browser/device and lock after use.

- Export a JSON backup regularly using the banner or Settings.
- Export on one device and import on the other to move records.
- Clearing site storage, switching browser profiles, private browsing or browser storage eviction can remove or hide the local records.
- Each browser starts with its own examples. Import your existing Studio Desk JSON backup into the browser you plan to use.
- Revision-checked IndexedDB transactions prevent an older open tab overwriting newer saved data. Refresh the workspace before editing in a second tab.

## Publish

1. Make `shoeab2007/studio-desk-workspace` public in GitHub Settings → General → Danger Zone → Change visibility.
2. In Settings → Pages, select **GitHub Actions** as the build/deployment source.
3. Run the **Publish Studio Desk to GitHub Pages** workflow from Actions, or push a commit to `main`.
4. Wait for the deployment job to succeed and use the actual URL shown by GitHub Pages.

The workflow builds `pages-dist` with the repository subpath `/studio-desk-workspace/`. If the repository is renamed or moved to a custom domain, update `base` in `standalone/vite.config.ts` before publishing.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run test:vault
pnpm run build:pages
```

The original Sites and independent-server build targets remain available, with separate storage. Changes pushed to GitHub do not update the original ChatGPT Site.
