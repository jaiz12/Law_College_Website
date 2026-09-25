import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Announcement, AnnouncementTag, announcementTags, mapAnnouncement } from '../../services/announcement.model';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface AnnouncementRow extends Announcement {
  tags: AnnouncementTag[];
}

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
  items: AnnouncementRow[] = [];

  ngOnInit(): void {
    if (!this.apiEndpoint) {
      this.loading = false;
      return;
    }

    this.apiService
      .GetRequestRows(this.apiEndpoint)
      .subscribe({
        next: (data: any[]) => {
          this.items = data.map((row: any, index: number) => {
            const item = mapAnnouncement(row, this.apiService.IMAGE_API_URL);
            return { ...item, tags: announcementTags(item, index) };
          });
          this.loading = false;
        },
        error: (err) => {
          console.error(`${this.pageTitle} Error:`, err);
          this.loading = false;
        }
      });
  }
}
