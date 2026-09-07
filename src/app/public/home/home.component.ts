import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { ConfigService } from '../../services/config.service';
import { isAbsoluteHttpUrl } from '../../services/url.util';
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

interface AnnouncementTag {
  text: string;
  kind: string;
}

interface AnnouncementItem {
  id: number;
  title: string;
  startDate: string | null;
  tags: AnnouncementTag[];
  fileUrl: string | null;
}

/**
 * Public marketing homepage — served at the app root ('/').
 * Static content, replicating home.pdf. The "Why Choose SGLC?" cards + stats
 * bar come from the backend's Home content API. There is no Login page in
 * this project — a separate project (Law_College_UI) owns the entire
 * login/forgot-password/reset-password flow; the footer's Login link just
 * opens it directly via config.json's UI_URL.
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
  private readonly configService = inject(ConfigService);

  /** Exposed for the template so a card with an invalid External Link
   *  doesn't render with a pointer cursor / hover affordance for a click
   *  that onWhyChooseUsCardClick will just ignore. */
  readonly isValidLink = isAbsoluteHttpUrl;

  readonly whyChooseUsPageName = 'Why Choose Us';
  whyChooseUsItems: WhyChooseUsItem[] = [];

  readonly statisticsPageName = 'Statistics';
  statisticsItems: StatisticItem[] = [];

  readonly programTints = ['bg-blue-tint', 'bg-green-tint', 'bg-pink-tint'];
  programs: OurProgramItem[] = [];
  selectedProgram: OurProgramItem | null = null;

  /** Cycled onto each announcement's category tag, same trick as programTints. */
  readonly announcementTagKinds = ['blue', 'green', 'purple', 'orange'];
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
      .GetRequest('Home/' + this.whyChooseUsPageName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

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
      .GetRequest('Home/' + this.statisticsPageName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

          this.statisticsItems = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              count: item.count ?? item.Count ?? ''
            }))
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
      .GetRequest('OurProgram')
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

          this.programs = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              shortDescription: item.shortDescription ?? item.ShortDescription ?? '',
              description: item.description ?? item.Description ?? ''
            }))
            // Bug Report row 64: same newest-first fix as Why Choose Us.
            .sort((a: OurProgramItem, b: OurProgramItem) => b.id - a.id)
            .map((item: OurProgramItem, index: number) => ({
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
   * shows the latest few; the full list lives on the CMS-managed archive
   * page, not built here yet (falls through to the "pages/:title" placeholder).
   */
  getAnnouncements(): void {
    this.apiService
      .GetRequest('Announcements')
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];

          this.announcements = data
            .slice(0, this.announcementsToShow)
            .map((item: any, index: number) => {
              const category = item.category ?? item.Category ?? '';
              const urgent = item.urgent ?? item.Urgent ?? false;

              const tags: AnnouncementTag[] = [];
              if (category) {
                tags.push({
                  text: category,
                  kind: this.announcementTagKinds[index % this.announcementTagKinds.length]
                });
              }
              if (urgent) {
                tags.push({ text: 'Urgent', kind: 'red' });
              }

              const filePath = item.filePath ?? item.FilePath ?? null;

              return {
                id: item.id ?? item.Id ?? 0,
                title: item.title ?? item.Title ?? '',
                startDate: item.startDate ?? item.StartDate ?? null,
                tags,
                fileUrl: filePath ? this.configService.get('IMAGE_API_URL') + filePath : null
              };
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
