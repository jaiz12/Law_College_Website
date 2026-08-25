# Sikkim Government Law College — Public Website

Standalone Angular frontend for the public site. Extracted from
`Law_College_UI`'s `src/app/public/**`, which used to live in the same
Angular project as the CMS. **This project contains no CMS/admin code.**

The CMS (`Law_College_UI`) is a separate project, developed and hosted
independently. This project only reads public content from the backend
API (`Law_College_API`) — it never talks to CMS-only endpoints and has no
login/forgot-password/reset-password flow of its own.

## Structure

```
src/app/public/home/                Homepage — hero, Why Choose Us, announcements,
                                     quick access, stats, programs, footer
src/app/public/coming-soon/         Placeholder for nav links with no page yet
src/app/public/academic-calendar-view/  Standalone calendar viewer (opened in a new tab)
src/app/services/config.service.ts  Loads public/config.json at bootstrap
src/app/services/api.service.ts     Generic read-only HTTP client against Law_College_API
src/app/services/safe-html.pipe.ts  Renders CMS-authored rich text (Our Programs) safely
src/app/app.routes.ts               '', 'academic-calendar', 'pages/:title' only
public/config.json                  API_URL / IMAGE_API_URL / UI_URL only
```

## Login

There is no login page in this project. The homepage footer's "Important
Links" column has a **Login** entry that opens the CMS app directly
(`UI_URL` from `public/config.json`, e.g. `http://localhost:4200`) in a new
tab. All authentication is handled entirely by the CMS.

## Running locally

```powershell
npm install
npm start
```

Then open `http://localhost:4200` (or whatever port `ng serve` picks — note
this collides with the CMS's default port; run one at a time, or change
one project's `ng serve --port`).

For the homepage's live data (Why Choose Us, Statistics, Our Program,
Academic Calendar) to load, `Law_College_API` must be running and
`public/config.json`'s `API_URL`/`IMAGE_API_URL` must point at it.

## `_legacy-static/`

The original static HTML/CSS/JS prototype (pre-Angular-extraction) is kept
here for reference. It is not part of the Angular build and can be deleted
once this project is confirmed working.
