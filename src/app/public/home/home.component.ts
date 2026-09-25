import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { Announcement, AnnouncementTag, announcementTags, mapAnnouncement } from '../../services/announcement.model';
import { isAbsoluteHttpUrl } from '../../services/url.util';
import { formatStatCount } from '../../services/format.util';
import { SITE_PATHS } from '../../services/site-links';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface WhyChooseUsItem {
  id: number;
  icon: string;
  title: string;
  description: string;
  externalLink: string | null;
}

interface StatisticItem {
  id: number;
  title: string;
  count: string;
}

interface OurProgramItem {
  id: number;
  title: string;
  shortDescription: string;
  description: string;
  tint: string;
}

interface AnnouncementItem extends Announcement {
  tags: AnnouncementTag[];
}

/**
 * Public marketing homepage — served at the app root ('/').
 * Static content, replicating home.pdf. The "Why Choose SGLC?" cards + stats
 * bar come from the backend's Home content API. There is no Login page in
 * this project — a separate project (Law_College_UI) owns the entire
 * login/forgot-password/reset-password flow; the footer's Login link just
 * opens it directly via config.json's CMS_URL.
 *
 * Header and footer are the shared app-site-header / app-site-footer
 * components (src/app/shared) so every public page gets identical site
 * chrome.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);

  /** Exposed for the template so a card with an invalid External Link
   *  doesn't render with a pointer cursor / hover affordance for a click
   *  that onWhyChooseUsCardClick will just ignore. */
  readonly isValidLink = isAbsoluteHttpUrl;
  readonly paths = SITE_PATHS;

  readonly whyChooseUsPageName = 'Why Choose Us';
  whyChooseUsItems: WhyChooseUsItem[] = [];

  readonly statisticsPageName = 'Statistics';
  statisticsItems: StatisticItem[] = [];

  readonly programTints = ['bg-blue-tint', 'bg-green-tint', 'bg-pink-tint'];
  programs: OurProgramItem[] = [];
  selectedProgram: OurProgramItem | null = null;

  readonly announcementsToShow = 4;
  announcements: AnnouncementItem[] = [];

  ngOnInit(): void {
    this.getWhyChooseUsItems();
    this.getStatisticsItems();
    this.getOurProgramItems();
    this.getAnnouncements();
  }

  getWhyChooseUsItems(): void {
    this.apiService
      .GetRequestRows('Home/' + this.whyChooseUsPageName)
      .subscribe({
        next: (data: any[]) => {

          this.whyChooseUsItems = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              icon: item.icon ?? item.Icon ?? '',
              title: item.title ?? item.Title ?? '',
              description: item.description ?? item.Description ?? '',
              externalLink: item.externalLink ?? item.ExternalLink ?? null
            }))
            // Bug Report row 41: newest-added should show first here too,
            // same as the CMS admin list — was sorted oldest-first, so a
            // freshly-added card never appeared "at the top" on the site.
            .sort((a: { id: number }, b: { id: number }) => b.id - a.id);
        },
        error: (err) => {
          console.error('Why Choose Us Error:', err);
        }
      });
  }

  onWhyChooseUsCardClick(item: WhyChooseUsItem): void {
    // Bug Report row 38: an invalid/malformed External Link was silently
    // redirecting the visitor to the Home page (window.open resolves a
    // non-absolute string as a path relative to the current page) instead
    // of doing nothing for a link that was never usable in the first place.
    if (!isAbsoluteHttpUrl(item.externalLink) || !isPlatformBrowser(this.platformId)) {
      return;
    }

    window.open(item.externalLink!, '_blank', 'noopener');
  }

  getStatisticsItems(): void {
    this.apiService
      .GetRequestRows('Home/' + this.statisticsPageName)
      .subscribe({
        next: (data: any[]) => {

          this.statisticsItems = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              // CMS editors enter a plain number; the "+" is presentation.
              count: formatStatCount(item.count ?? item.Count)
            }))
            // A stat with no number would render as a bare label.
            .filter((item: StatisticItem) => item.count && item.title)
            // Bug Report row 45: same newest-first fix as Why Choose Us.
            .sort((a: { id: number }, b: { id: number }) => b.id - a.id);
        },
        error: (err) => {
          console.error('Statistics Error:', err);
        }
      });
  }

  getOurProgramItems(): void {
    this.apiService
      .GetRequestRows('OurProgram')
      .subscribe({
        next: (data: any[]) => {
          this.programs = data
            .map((item: any): Omit<OurProgramItem, 'tint'> => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              shortDescription: item.shortDescription ?? item.ShortDescription ?? '',
              description: item.description ?? item.Description ?? ''
            }))
            // Bug Report row 64: same newest-first fix as Why Choose Us.
            .sort((a, b) => b.id - a.id)
            .map((item, index): OurProgramItem => ({
              ...item,
              tint: this.programTints[index % this.programTints.length]
            }));
        },
        error: (err) => {
          console.error('Our Program Error:', err);
        }
      });
  }

  /**
   * "Latest Announcements" — CMS's News & Events > Announcements module
   * (Law_College_API's /api/Announcements, GetAllIsActive — same backend as
   * everything else on this page, already newest-first). Homepage only
   * shows the latest few; "View All" opens the full Announcements page.
   */
  getAnnouncements(): void {
    this.apiService
      .GetRequestRows('Announcements')
      .subscribe({
        next: (data: any[]) => {
          this.announcements = data
            .slice(0, this.announcementsToShow)
            .map((row: any, index: number) => {
              const item = mapAnnouncement(row, this.apiService.IMAGE_API_URL);
              return { ...item, tags: announcementTags(item, index) };
            });
        },
        error: (err) => {
          console.error('Announcements Error:', err);
        }
      });
  }

  toggleProgramDetails(program: OurProgramItem): void {
    this.selectedProgram = this.selectedProgram === program ? null : program;
  }
}
