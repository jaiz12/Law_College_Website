# Sikkim Government Law College — Public Website

Standalone Angular (18, SSR) frontend for the public site. Extracted from
`Law_College_UI`'s `src/app/public/**`, which used to live in the same
Angular project as the CMS. **This project contains no CMS/admin code.**

The CMS (`Law_College_UI`) is a separate project, developed and hosted
independently. This project only reads public content from the backend
API (`Law_College_API`) — it never talks to CMS-only endpoints and has no
login/forgot-password/reset-password flow of its own.

## Structure

```
src/app/app.routes.ts                   All routes. Pages live at the CMS's own menu paths
                                         (e.g. /student-life/library); unknown URLs -> Page Not Found (HTTP 404)
src/app/services/site-links.ts          Nav menu + the one resolver for CMS Internal/External links
src/app/services/html-sanitizer.ts      Allowlist sanitizer for CMS rich text (security boundary)
src/app/services/safe-html.pipe.ts      The only place CMS HTML is rendered — always via the sanitizer
src/app/services/config.service.ts      Loads public/config.json at bootstrap
src/app/services/api.service.ts         Read-only HTTP client against Law_College_API
src/app/services/site-title.strategy.ts Browser tab title ("<page> | <college>")
src/app/shared/site-header|site-footer/ Shared chrome on every page
src/app/public/…                        Pages (home, academic calendar, library/legal aid,
                                         announcements/archives, coming soon)
public/config.json                      Runtime configuration (see below)
```

## Configuration (`public/config.json`)

Read at runtime (not baked into the build), so each environment ships its
own `config.json` next to the built app — **replace it on deploy**.

| Key | What it is | Local development | Production |
|---|---|---|---|
| `API_URL` | Law_College_API base, **including `/api`**. Every data request is `API_URL + "/" + endpoint`. | `https://localhost:7299/api` | `https://<api-host>/api` |
| `IMAGE_API_URL` | Base for uploaded files (logo, PDFs, images). File URLs are `IMAGE_API_URL + FilePath`, so keep the trailing `/`. | `https://localhost:7299/` | `https://<api-host>/` |
| `CMS_URL` | The **CMS admin app** (Law_College_UI). The footer **Login** link opens exactly this URL. | `http://localhost:4200` | `https://<cms-host>` |

```json
{
  "API_URL": "https://<api-host>/api",
  "IMAGE_API_URL": "https://<api-host>/",
  "CMS_URL": "https://<cms-host>"
}
```

- **Login is controlled only by `CMS_URL`.** If it is missing or not an
  absolute `http(s)` URL, the Login link is simply not shown — the site
  never builds a guessed login URL.
- **`UI_URL` is not used by this website.** In the *CMS's* config, `UI_URL`
  means *this public website* (the CMS prefixes Important Links "Internal"
  pages with it). This project used to reuse that key for the CMS address,
  which made Login open the website itself. Do not add `UI_URL` here; set
  `CMS_URL`.
- CMS "Internal" links arrive as `<CMS UI_URL>/<page path>`. Only the path
  is used (resolved in `site-links.ts`), so the host in the CMS's own
  config doesn't have to match this site's domain.
- A missing/unreadable `config.json` is logged and the site still renders
  (API-driven sections stay empty).

## Security: CMS rich text

CMS HTML is treated as untrusted. `safeHtml` runs it through
`html-sanitizer.ts` — an allowlist that keeps CKEditor formatting (headings,
lists, tables, blockquotes, links, font size/colour, alignment, indent) and
removes everything else: `<script>`, `iframe`/`object`/`embed`, `form`,
`base`/`meta`/`link`/`style`, SVG/MathML, every `on*` attribute,
`javascript:`/`vbscript:`/non-image `data:` URLs, and CSS outside a small
property allowlist (no `url()`, no positioning). This matters doubly with
SSR: content is written into the server-rendered HTML, where a `<script>`
*would* execute. Never render CMS HTML with `[innerHTML]` without the
`safeHtml` pipe, and never call `bypassSecurityTrustHtml` on raw CMS data.

## Running locally

```powershell
npm install
npm start          # dev server (ng serve)
npm test           # unit tests (Karma; use --watch=false --browsers=ChromeHeadless in CI)
npm run build      # production build (browser + SSR server)
npm run serve:ssr:Law_College_Website   # serve the SSR build (PORT env var, default 4000)
```

`ng serve` defaults to port 4200, which collides with the CMS's default;
run one at a time or use `ng serve --port 4300`.

For live data, `Law_College_API` must be running and `API_URL` /
`IMAGE_API_URL` must point at it.

Pages are rendered per request on the server (no build-time prerendering),
so CMS changes show up without a rebuild.

## `_legacy-static/`

The original static HTML/CSS/JS prototype (pre-Angular-extraction) is kept
here for reference. It is not part of the Angular build and can be deleted
once this project is confirmed working.
