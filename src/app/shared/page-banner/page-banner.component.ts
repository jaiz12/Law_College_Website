import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, map } from 'rxjs';
import { SiteNavItem } from '../../services/site-links';
import { SiteNavService } from '../../services/site-nav.service';

export interface Crumb {
  label: string;
  /** Route path without leading slash; null for the current page. */
  path: string | null;
}

/** Nav entries from the top level down to the entry at `path`, or [] if not in the nav. */
function navTrail(items: SiteNavItem[], path: string): SiteNavItem[] {
  for (const item of items) {
    if (item.path === path) {
      return [item];
    }
    const below = navTrail(item.children ?? [], path);
    if (below.length) {
      return [item, ...below];
    }
  }
  return [];
}

/**
 * Inner-page title band with breadcrumbs, shared by every page except Home.
 * The trail is the page's place in the nav (About Us › Statutory Bodies ›
 * IQAC). Only the current page is plain text; parent entries link to their
 * own pages.
 */
@Component({
  selector: 'app-page-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-banner.component.html',
  styleUrl: './page-banner.component.scss'
})
export class PageBannerComponent {
  private readonly router = inject(Router);
  private readonly siteNav = inject(SiteNavService);

  @Input() title = '';
  /** Optional line under the title (e.g. a date range). */
  @Input() subtitle: string | null = null;

  readonly crumbs$: Observable<Crumb[]> = this.siteNav.nav$.pipe(
    map(nav => {
      const path = this.router.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
      const trail = navTrail(nav, decodeURIComponent(path));
      // A top-level section ("About Us") has no page of its own beyond a
      // placeholder, so it shows as text; deeper parents are real pages.
      const parents = trail.slice(0, -1).map((item, depth) => ({
        label: item.label,
        path: depth === 0 && item.children?.length ? null : item.path
      }));
      return [{ label: 'Home', path: '' }, ...parents];
    })
  );
}
