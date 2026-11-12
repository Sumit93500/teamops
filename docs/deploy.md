# Deploy

## Today

- **The live site** (`teamops-eh3c.onrender.com`) is a Render static site that publishes the repo root. It has no build step, and a push to `main` redeploys it.
- **Build filter:** the service ignores `app/**`, so a push that changes only `app/` doesn't redeploy it.
- **Everything else is published:** a push that changes anything outside `app/` (docs and tests included) redeploys it, and those files are served with the site.
- **Cloudflare** in front of Render may serve a cached HTML page for up to 5 minutes after a deploy (s-maxage=300).

## The React app (planned, round 28 cutover)

- **Build:** `npm ci && npm run build` in `app/`, publishing `app/dist`.
- **Rewrite:** `/*` → `/index.html`.
- **Headers:**
  - `index.html`: `Cache-Control: no-cache`;
  - `/assets/*`: a year, immutable (Vite hashes file names).
- **Cutover:**
  1. Tag the last static commit (`static-final`).
  2. Switch the same service to root `app`, with the build above.
  3. Wait out the 5-minute cache, then check `/`, a dashboard and a phone deep link.
- **Same origin, same data:** the localStorage keys and formats don't change, so people keep their demo data.
- **Rollback:** publish the repo root again, or redeploy `static-final`.
- **About a week after cutover** (ruled 2026-11-11): remove `pages/` and the page suites; the data suites stay.

## Rules for sessions

Never change Render, DNS or any deploy setting from a session. Push only green rounds, with ff-only merges to `main`.
