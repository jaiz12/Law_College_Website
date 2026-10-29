import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule, TitleStrategy } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';

import { ApiService } from '../../services/api.service';
import { CmsPageKind, itemSlug } from '../../services/cms-pages';
import { CmsRow, assetUrl, isPdf, newestFirst, toCmsRow } from '../../services/cms-row';
import { htmlToPlainText } from '../../services/rich-text.util';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { SiteNavItem } from '../../services/site-links';
import { SiteNavService } from '../../services/site-nav.service';
import { SiteTitleStrategy } from '../../services/site-title.strategy';
import { isAbsoluteHttpUrl } from '../../services/url.util';
import { PageBannerComponent } from '../../shared/page-banner/page-banner.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface CmsItemView extends CmsRow {
  imageUrl: string | null;
  fileUrl: string | null;
  isPdf: boolean;
  /** Only set for a genuine absolute http(s) link. */
  linkUrl: string | null;
  /** Route of the record's own page (lists in CMS_ITEM_PAGES only). */
  pagePath: string | null;
}

/** Below this many characters a content page is treated as short. */
const SHORT_CONTENT_CHARS = 220;

interface SectionNav {
  heading: string;
  links: SiteNavItem[];
}

/** The nav group the page at `path` belongs to: its parent's label and children. */
function findSection(items: SiteNavItem[], path: string, parent: SiteNavItem | null = null): SectionNav | null {
  for (const item of items) {
    if (item.path === path && parent?.children?.length) {
      return { heading: parent.label, links: parent.children };
    }
    const below = findSection(item.children ?? [], path, item);
    if (below) {
      return below;
    }
  }
  return null;
}

/**
 * Generic page for every CMS-managed module (see cms-pages.ts for which
 * nav page uses which endpoint). Route data supplies `api`, `kind` and the
 * nav label as `title`:
 * - content: the newest record's rich text, with its image and/or PDF;
 * - item: one record of a list, chosen by the :item title slug;
 * - list: all records as cards, newest first;
 * - people: Faculty / Administrative Staff, in the CMS's display order;
 * - profiles: photo cards with rich text (Student Achievers), newest first.
 * Content and item pages get an "In this section" rail with their sibling
 * pages, so a short page still sits in context.
 */
@Component({
  selector: 'app-cms-page',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe, PageBannerComponent, RevealDirective, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './cms-page.component.html',
  styleUrl: './cms-page.component.scss'
})
export class CmsPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly siteNav = inject(SiteNavService);
  private readonly titleStrategy = inject(TitleStrategy);

  readonly api: string = this.route.snapshot.data['api'] ?? '';
  readonly kind: CmsPageKind = this.route.snapshot.data['kind'] ?? 'content';
  readonly sectionTitle: string = this.route.snapshot.data['title'] ?? '';
  readonly itemBase: string | null = this.route.snapshot.data['itemBase'] ?? null;
  pageTitle: string = this.sectionTitle;

  loading = true;
  items: CmsItemView[] = [];
  /** content / item kind: the record shown. */
  record: CmsItemView | null = null;
  safePdfUrl: SafeResourceUrl | null = null;
  /** Only a line or two of text: set larger, as a lead, instead of with a drop cap. */
  isShort = false;

  /** Sibling pages for the side rail (content and item pages only). */
  readonly section$: Observable<SectionNav | null> = this.siteNav.nav$.pipe(
    map(nav => findSection(nav, this.currentPath()))
  );

  ngOnInit(): void {
    if (!this.api) {
      this.loading = false;
      return;
    }

    // paramMap: moving between two records of the same list (IQAC -> another
    // body) reuses this component, so the record is re-picked per param.
    combineLatest([this.route.paramMap, this.apiService.GetRequestRows(this.api)])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([params, rows]) => {
          const items = rows.map(row => this.toView(toCmsRow(row)));
          this.items = this.kind === 'people'
            ? items.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
            : items.sort(newestFirst);

          if (this.kind === 'content') {
            // The CMS keeps one entry per content page; if there are ever
            // more, the newest one is the current one.
            this.setRecord(this.items.find(item => item.html || item.imageUrl || item.fileUrl) ?? null);
          } else if (this.kind === 'item') {
            const slug = params.get('item') ?? '';
            const record = this.items.find(item => itemSlug(item.title) === slug) ?? null;
            this.setRecord(record);
            this.pageTitle = record?.title || this.sectionTitle;
            if (record?.title && this.titleStrategy instanceof SiteTitleStrategy) {
              this.titleStrategy.setPageTitle(record.title);
            }
          }
          this.loading = false;
        },
        error: err => {
          console.error(`${this.pageTitle} Error:`, err);
          this.items = [];
          this.record = null;
          this.loading = false;
        }
      });
  }

  private setRecord(record: CmsItemView | null): void {
    this.record = record;
    this.isShort = htmlToPlainText(record?.html).length < SHORT_CONTENT_CHARS;
    this.safePdfUrl = record?.isPdf && record.fileUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(record.fileUrl)
      : null;
  }

  private currentPath(): string {
    const path = this.router.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }

  private toView(row: CmsRow): CmsItemView {
    const base = this.apiService.IMAGE_API_URL;
    const slug = itemSlug(row.title);
    return {
      ...row,
      imageUrl: assetUrl(base, row.image),
      fileUrl: assetUrl(base, row.file),
      isPdf: isPdf(row.file),
      linkUrl: isAbsoluteHttpUrl(row.link) ? row.link!.trim() : null,
      pagePath: this.itemBase && slug ? `${this.itemBase}/${slug}` : null
    };
  }
}
