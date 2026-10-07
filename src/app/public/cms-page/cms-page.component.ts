import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../services/api.service';
import { CmsPageKind } from '../../services/cms-pages';
import { CmsRow, assetUrl, isPdf, newestFirst, toCmsRow } from '../../services/cms-row';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { isAbsoluteHttpUrl } from '../../services/url.util';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface CmsItemView extends CmsRow {
  imageUrl: string | null;
  fileUrl: string | null;
  isPdf: boolean;
  /** Only set for a genuine absolute http(s) link. */
  linkUrl: string | null;
}

/**
 * Generic page for every CMS-managed module (see cms-pages.ts for which
 * nav page uses which endpoint). Route data supplies `api`, `kind` and the
 * nav label as `title`:
 * - content: the newest record's rich text, with its image and/or PDF;
 * - list: all records as cards, newest first;
 * - people: Faculty / Administrative Staff, in the CMS's display order.
 */
@Component({
  selector: 'app-cms-page',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './cms-page.component.html',
  styleUrl: './cms-page.component.scss'
})
export class CmsPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly api: string = this.route.snapshot.data['api'] ?? '';
  readonly kind: CmsPageKind = this.route.snapshot.data['kind'] ?? 'content';
  readonly pageTitle: string = this.route.snapshot.data['title'] ?? '';

  loading = true;
  items: CmsItemView[] = [];
  /** content kind: the record shown. */
  record: CmsItemView | null = null;
  safePdfUrl: SafeResourceUrl | null = null;

  ngOnInit(): void {
    if (!this.api) {
      this.loading = false;
      return;
    }

    this.apiService.GetRequestRows(this.api).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => {
        const items = rows.map(row => this.toView(toCmsRow(row)));
        this.items = this.kind === 'people'
          ? items.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
          : items.sort(newestFirst);

        if (this.kind === 'content') {
          // The CMS keeps one entry per content page; if there are ever
          // more, the newest one is the current one.
          this.record = this.items.find(item => item.html || item.imageUrl || item.fileUrl) ?? null;
          this.safePdfUrl = this.record?.isPdf && this.record.fileUrl
            ? this.sanitizer.bypassSecurityTrustResourceUrl(this.record.fileUrl)
            : null;
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

  private toView(row: CmsRow): CmsItemView {
    const base = this.apiService.IMAGE_API_URL;
    return {
      ...row,
      imageUrl: assetUrl(base, row.image),
      fileUrl: assetUrl(base, row.file),
      isPdf: isPdf(row.file),
      linkUrl: isAbsoluteHttpUrl(row.link) ? row.link!.trim() : null
    };
  }
}
