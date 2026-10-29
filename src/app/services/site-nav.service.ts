import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, map, of, shareReplay, startWith } from 'rxjs';
import { ApiService } from './api.service';
import { AnnouncementWithTags, mapAnnouncements } from './announcement.model';
import { CMS_ITEM_PAGES, itemSlug } from './cms-pages';
import { toCmsRow, newestFirst } from './cms-row';
import { SITE_NAV, SiteNavItem } from './site-links';

/**
 * Data the site chrome needs on every page, fetched once per app load
 * (each page renders its own header, so caching here avoids a request per
 * navigation):
 * - `nav$`: SITE_NAV plus the CMS-driven third level (CMS_ITEM_PAGES);
 *   starts as the static nav so the menu never waits on the API.
 * - `announcements$`: active announcements for the header ticker and Home.
 */
@Injectable({ providedIn: 'root' })
export class SiteNavService {
  private readonly apiService = inject(ApiService);

  readonly nav$: Observable<SiteNavItem[]> = combineLatest(
    Object.entries(CMS_ITEM_PAGES).map(([parentPath, api]) =>
      this.apiService.GetRequestRows(api).pipe(
        map(rows => ({ parentPath, children: this.toChildren(parentPath, rows) })),
        catchError(() => of({ parentPath, children: [] as SiteNavItem[] }))
      ))
  ).pipe(
    map(groups => new Map(groups.map(group => [group.parentPath, group.children]))),
    map(childrenByPath => this.withChildren(SITE_NAV, childrenByPath)),
    startWith(SITE_NAV),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly announcements$: Observable<AnnouncementWithTags[]> = this.apiService
    .GetRequestRows('Announcements')
    .pipe(
      map(rows => mapAnnouncements(rows, this.apiService.IMAGE_API_URL)),
      catchError(err => {
        console.error('Announcements Error:', err);
        return of([] as AnnouncementWithTags[]);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  /** Oldest first, so bodies keep the order they were added in. */
  private toChildren(parentPath: string, rows: any[]): SiteNavItem[] {
    const seen = new Set<string>();
    return rows
      .map(toCmsRow)
      .sort((a, b) => -newestFirst(a, b))
      .map(row => ({ label: row.title, slug: itemSlug(row.title) }))
      .filter(item => item.slug && !seen.has(item.slug) && seen.add(item.slug))
      .map(item => ({ label: item.label, path: `${parentPath}/${item.slug}` }));
  }

  private withChildren(items: SiteNavItem[], childrenByPath: Map<string, SiteNavItem[]>): SiteNavItem[] {
    return items.map(item => {
      const dynamic = childrenByPath.get(item.path);
      if (dynamic?.length) {
        return { ...item, children: dynamic };
      }
      return item.children ? { ...item, children: this.withChildren(item.children, childrenByPath) } : item;
    });
  }
}
