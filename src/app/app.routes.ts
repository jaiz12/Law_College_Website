import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { HomeComponent } from './public/home/home.component';
import { ComingSoonComponent } from './public/coming-soon/coming-soon.component';
import { LEGACY_PAGE_REDIRECTS, SITE_PATHS, flattenSiteNav } from './services/site-links';
import { CMS_PAGES } from './services/cms-pages';

const loadQuickLinkList = () =>
  import('./public/quick-link-list/quick-link-list.component')
    .then(m => m.QuickLinkListComponent);

const loadAnnouncementList = () =>
  import('./public/announcement-list/announcement-list.component')
    .then(m => m.AnnouncementListComponent);

const loadCmsPage = () =>
  import('./public/cms-page/cms-page.component')
    .then(m => m.CmsPageComponent);

const navLabels = new Map(flattenSiteNav().map(item => [item.path, item.label]));

/** Pages with a real implementation, at the CMS's own menu paths (see site-links.ts). */
const pageRoutes: Routes = [
  {
    // Public marketing homepage — http://localhost:4300/ (or wherever this is served)
    path: SITE_PATHS.home,
    pathMatch: 'full',
    component: HomeComponent
  },
  {
    // Shows the calendar marked Active in the CMS (title, content, image/PDF).
    path: SITE_PATHS.academicCalendar,
    title: 'Academic Calendar',
    loadComponent: () =>
      import('./public/academic-calendar-view/academic-calendar-view.component')
        .then(m => m.AcademicCalendarViewComponent)
  },
  {
    // CMS-managed list of title + external link rows (Law_College_API's /api/Library).
    path: SITE_PATHS.library,
    title: 'Library',
    loadComponent: loadQuickLinkList,
    data: { api: 'Library', title: 'Library' }
  },
  {
    // Active announcements (/api/Announcements).
    path: SITE_PATHS.announcements,
    title: 'Announcements',
    loadComponent: loadAnnouncementList,
    data: { api: 'Announcements', title: 'Announcements' }
  },
  {
    // Archived announcements (/api/Announcements/ArchiveNewsAndEvents).
    path: SITE_PATHS.newsEventsArchives,
    title: 'News & Events Archives',
    loadComponent: loadAnnouncementList,
    data: { api: 'Announcements/ArchiveNewsAndEvents', title: 'News & Events Archives' }
  },
  {
    // Alumni "Stay Connected" registration form (POST /api/AlumniRegistration).
    path: SITE_PATHS.alumniRegister,
    title: 'Register / Join',
    loadComponent: () =>
      import('./public/alumni-register/alumni-register.component')
        .then(m => m.AlumniRegisterComponent)
  },
  // Every CMS-managed module page (About Us, Committee and Cell, Student
  // Life, Alumni, …) — endpoint and layout per page in cms-pages.ts.
  ...Object.entries(CMS_PAGES).map(([path, page]) => ({
    path,
    title: navLabels.get(path) ?? '',
    loadComponent: loadCmsPage,
    data: { ...page, title: navLabels.get(path) ?? '' }
  }))
];

const implementedPaths = new Set(pageRoutes.map(route => route.path));

/** Every other nav entry gets a "Coming Soon" page titled with its nav label. */
const comingSoonRoutes: Routes = flattenSiteNav()
  .filter(item => !implementedPaths.has(item.path))
  .map(item => ({
    path: item.path,
    title: item.label,
    component: ComingSoonComponent,
    data: { title: item.label }
  }));

const legacyRoutes: Routes = Object.entries(LEGACY_PAGE_REDIRECTS)
  .map(([path, redirectTo]) => ({ path, redirectTo, pathMatch: 'full' as const }));

export const routes: Routes = [
  ...pageRoutes,
  ...comingSoonRoutes,
  ...legacyRoutes,
  {
    // Placeholder for links with no nav entry yet (hero buttons, footer
    // bottom links, …) — the label is passed straight through as the heading.
    path: 'pages/:title',
    title: (route: ActivatedRouteSnapshot) => route.paramMap.get('title') ?? 'Coming Soon',
    component: ComingSoonComponent
  },
  {
    // No admin routes here by design — this project is the public frontend
    // only. Login lives in the separate CMS project (Law_College_UI); the
    // footer's Login link points there via config.json's CMS_URL.
    // Unknown URLs show "Page Not Found" instead of silently landing on
    // Home, so a broken link is visible as broken.
    path: '**',
    title: 'Page Not Found',
    component: ComingSoonComponent,
    data: { notFound: true }
  }
];
