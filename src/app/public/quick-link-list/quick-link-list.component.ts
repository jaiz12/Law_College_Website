import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface QuickLinkRow {
  id: number;
  title: string;
  externalLink: string | null;
}

/**
 * Generic "title + external link" list page — used for both the Quick
 * Access "Library" and "Legal Aid" cards. Which backend endpoint and page
 * title to use comes from the route's `data` (see app.routes.ts); the CMS
 * (a separate project) manages the rows via /api/Library or
 * /api/LegalAidCell — both share the exact same {Title, ExternalLink} shape.
 */
@Component({
  selector: 'app-quick-link-list',
  standalone: true,
  imports: [CommonModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './quick-link-list.component.html',
  styleUrl: './quick-link-list.component.scss'
})
export class QuickLinkListComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly apiEndpoint: string = this.route.snapshot.data['api'] ?? '';
  readonly pageTitle: string = this.route.snapshot.data['title'] ?? 'List';

  loading = true;
  items: QuickLinkRow[] = [];

  ngOnInit(): void {
    if (!this.apiEndpoint) {
      this.loading = false;
      return;
    }

    this.apiService
      .GetRequest(this.apiEndpoint)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

          this.items = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              externalLink: item.externalLink ?? item.ExternalLink ?? null
            }))
            .sort((a: QuickLinkRow, b: QuickLinkRow) => a.id - b.id);

          this.loading = false;
        },
        error: (err) => {
          console.error(`${this.pageTitle} Error:`, err);
          this.loading = false;
        }
      });
  }

  onRowClick(item: QuickLinkRow): void {
    if (!item.externalLink || !isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open(item.externalLink, '_blank', 'noopener');
  }
}
