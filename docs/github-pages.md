# Free GitHub Pages workspace

This build is a static, browser-only version. It runs without ChatGPT, Render, a server password or a hosted database.

## Data behavior

Records are stored in this browser's IndexedDB. The public repository contains code and labelled example records, never your saved client records. There is no server login, encryption of browser records, cloud backup or automatic phone/laptop sync. Anyone using this browser profile on your device can open its records.

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
pnpm run build:pages
```

The original Sites and independent-server build targets remain available, with separate storage. Changes pushed to GitHub do not update the original ChatGPT Site.
