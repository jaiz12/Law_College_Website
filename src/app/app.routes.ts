import { Routes } from '@angular/router';
import { HomeComponent } from './public/home/home.component';
import { ComingSoonComponent } from './public/coming-soon/coming-soon.component';

export const routes: Routes = [
  {
    // Public marketing homepage — http://localhost:4300/ (or wherever this is served)
    path: '',
    component: HomeComponent
  },
  {
    // Public "just the calendar" page — opened in a new tab from the
    // homepage's Quick Access "Academic Calendar" card. Shows the active
    // calendar (managed from the CMS, a separate project) as a plain
    // title + image/PDF.
    path: 'academic-calendar',
    loadComponent: () =>
      import('./public/academic-calendar-view/academic-calendar-view.component')
        .then(m => m.AcademicCalendarViewComponent)
  },
  {
    // Quick Access "Library" card — CMS-managed list of title + external
    // link rows (Law_College_API's /api/Library).
    path: 'library',
    loadComponent: () =>
      import('./public/quick-link-list/quick-link-list.component')
        .then(m => m.QuickLinkListComponent),
    data: { api: 'Library', title: 'Library' }
  },
  {
    // Quick Access "Legal Aid" card + footer link — same shape as Library,
    // backed by /api/LegalAidCell.
    path: 'legal-aid',
    loadComponent: () =>
      import('./public/quick-link-list/quick-link-list.component')
        .then(m => m.QuickLinkListComponent),
    data: { api: 'LegalAidCell', title: 'Legal Aid' }
  },
  {
    // Placeholder for any public nav link with no real page yet — the
    // clicked label is passed straight through as the heading (see
    // home.component.html, every still-unbuilt link routes here).
    path: 'pages/:title',
    component: ComingSoonComponent
  },
  {
    // No admin routes here by design — this project is the public frontend
    // only. Login/forgot-password/reset-password live in a separate project
    // (Law_College_UI); the footer's Login link points there directly via
    // config.json's UI_URL instead of routing internally.
    path: '**',
    redirectTo: ''
  }
];
