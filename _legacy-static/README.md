# Sikkim Government Law College — Public Website (Static Phase)

Static rebuild of the design in `../home.pdf`, plus a working Login button
wired to the real backend (`Law_College_API`). Content is hardcoded for now;
the plan is to swap the static markup for CMS-driven data later without
touching layout/CSS.

## Structure

```
index.html          All page sections (header, hero, announcements, footer, login modal)
css/style.css        All styling, design tokens in :root, responsive rules at the bottom
js/config.js          API_URL / CMS_URL — the only place environment values live
js/nav.js             Mobile hamburger menu + accordion submenus
js/auth.js            Login modal, session (localStorage), calls POST /api/Account/Login
assets/img/           Logo + hero photo, extracted from home.pdf
```

## Running locally

Any static file server works, e.g.:

```powershell
cd Law_College_Website
python -m http.server 5566
```

Then open `http://localhost:5566`.

## Login

The Login button calls the real API (`Law_College_API`, `AccountController.Login`)
at the URL configured in `js/config.js`. For it to succeed:

1. `Law_College_API` must be running (`dotnet run` from `Law_College_API/API`).
2. Its HTTPS dev certificate must be trusted in the browser you're testing in
   (`dotnet dev-certs https --trust`), otherwise the fetch fails with a
   network/TLS error rather than a login error.
3. Use credentials for a user that exists in the DB (see `../changes.txt` for
   context on the `UserManagement` endpoints used to create accounts).

On success the JWT + user are stored in `localStorage` and the CMS app
(`Law_College_UI`, `js/config.js` → `CMS_URL`) opens in a new tab — that app
already owns the authenticated dashboard/login screens.

## Known placeholders (static phase)

- All nav dropdown links point to `#` — real routes land once this is wired
  to the CMS-managed pages (`about-us`, `academics`, `admissions`, etc. — see
  `Law_College_UI/src/app/cms/pages`).
- "Latest Announcements" and "Site Visitors" are hardcoded sample data.
- The footer map uses a generic Google Maps search embed (no API key) —
  swap for the exact campus coordinates when available.
