# Private Raḥlati deployment (prepared, not live)

This is an alternative to the public GitHub Pages site. A Cloudflare Worker checks the session before serving **any** application file. The first administrator supplies their own username and password on `/login.html`; a private `SETUP_TOKEN` environment secret prevents strangers from claiming the initial account. Passwords are stored as salted PBKDF2 hashes. Sessions use Secure, HttpOnly, SameSite cookies. D1 stores trip JSON, R2 stores uploaded photos and PDF attachments, and state writes reject stale versions.

## Before deploying

1. Create a Cloudflare account and activate Workers, D1 and R2. No custom domain is required for a `workers.dev` address.
2. Create `rahlati-private` D1 database and `rahlati-private-media` R2 bucket. Copy `wrangler.toml.example` to `wrangler.toml` and fill in the D1 database ID. Keep `wrangler.toml` out of Git until the account details are reviewed.
3. Run the database schema on **remote** D1, build the private assets, and set a random secret. For example, from the repository root:

   ```sh
   npx wrangler d1 create rahlati-private
   npx wrangler r2 bucket create rahlati-private-media
   npx wrangler d1 execute rahlati-private --remote --file=secure/schema.sql --config secure/wrangler.toml
   node secure/build.mjs
   umask 077
   openssl rand -hex 32 > secure/setup-token.txt
   npx wrangler secret put SETUP_TOKEN --config secure/wrangler.toml < secure/setup-token.txt
   npx wrangler deploy --config secure/wrangler.toml
   ```

   Preserve `secure/setup-token.txt` privately until the administrator account is created, then delete that local file. The admin enters its token on the first-run screen together with a chosen username and password of at least 12 characters. **Do not put either password or setup token in Git or chat.**

4. On the old GitHub Pages site, export a JSON backup of the trip. On the new protected address, sign in and import that backup. Confirm the trip, photos, notes and comments show on a second signed-in device. Keep a separate offline JSON backup.
5. After that verification, disable the old public GitHub Pages deployment and make the repository private. Existing public copies and browser caches cannot be recalled. Rebuild the Android APK to point to the new protected address, then test sign-in in its WebView. The existing APK continues to open the public GitHub Pages URL until rebuilt.

## Limits and behavior

- This is a prepared migration and is **not yet deployed**. It does not change the currently public site.
- D1 has a 2 MB per-row limit; this worker caps trip JSON at 1.8 MB. Uploaded images and PDF files are sent separately to R2. Very large text plans will need a per-trip schema in a later version.
- Edits on two devices at the same time cause a conflict; the second writer keeps local changes and must export a backup before reopening. The application does not silently replace newer cloud data.
- If a device is offline, edits stay in its local storage and retry when connectivity returns. Export backups before clearing browser data.
- The original trip preview is included in the protected asset bundle. The public GitHub Pages copy remains accessible until its deployment is disabled.
- No password-reset email flow or multi-user roles are included. The first account is the single administrator. Losing its password requires an account recovery procedure through the owner's Cloudflare access.

Cloudflare documentation: [Workers static assets with `run_worker_first`](https://developers.cloudflare.com/workers/static-assets/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
