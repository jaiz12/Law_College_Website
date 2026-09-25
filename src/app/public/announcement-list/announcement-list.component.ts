import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AnnouncementWithTags, mapAnnouncements } from '../../services/announcement.model';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

/**
 * Full announcement list — used for both News & Events > Announcements
 * (/api/Announcements, active) and News & Events Archives
 * (/api/Announcements/ArchiveNewsAndEvents, archived). Which one comes
 * from the route's `data` (app.routes.ts), same pattern as QuickLinkList.
 */
@Component({
  selector: 'app-announcement-list',
  standalone: true,
  imports: [CommonModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './announcement-list.component.html',
  // Block host so the shared header's position:sticky has a page-tall parent.
  styles: [':host { display: block; }']
})
export class AnnouncementListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly apiEndpoint: string = this.route.snapshot.data['api'] ?? '';
  readonly pageTitle: string = this.route.snapshot.data['title'] ?? 'Announcements';

  loading = true;
  items: AnnouncementWithTags[] = [];

  ngOnInit(): void {
    if (!this.apiEndpoint) {
      this.loading = false;
      return;
    }

    this.apiService
      .GetRequestRows(this.apiEndpoint)
      .subscribe({
        next: (data: any[]) => {
          this.items = mapAnnouncements(data, this.apiService.IMAGE_API_URL);
          this.loading = false;
        },
        error: (err) => {
          console.error(`${this.pageTitle} Error:`, err);
          this.loading = false;
        }
      });
  }
}
