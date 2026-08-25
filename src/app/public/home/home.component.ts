import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { ConfigService } from '../../services/config.service';

interface NavSubItem {
  label: string;
}

interface NavItem {
  label: string;
  subItems?: NavSubItem[];
}

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

interface SocialMediaLink {
  id: number;
  icon: string;
  link: string;
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
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);
  private readonly configService = inject(ConfigService);
  private readonly titleService = inject(Title);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  /** Admin app URL (separate project) — the footer Login link opens this directly. */
  readonly cmsUrl = this.apiService.UI_URL || this.configService.get('UI_URL') || '';

  /**
   * Header/footer logo + site title — CMS's Header and Footer > Logo & Title
   * module (Law_College_API's /api/HeaderAndFooter, SectionName "Logo And
   * Title"). Defaults keep the previous hardcoded look until the API responds
   * (or if it errors), so the header/footer never render blank.
   */
  readonly socialMediaSectionName = 'Social Media';
  socialMediaLinks: SocialMediaLink[] = [];

  readonly logoAndTitleSectionName = 'Logo And Title';
  readonly defaultSiteTitle = 'Sikkim Government Law College';
  readonly defaultSiteLogo = '/images/home/logo.png';
  siteTitle = this.defaultSiteTitle;
  siteLogo = this.defaultSiteLogo;

  readonly whyChooseUsPageName = 'Why Choose Us';
  whyChooseUsItems: WhyChooseUsItem[] = [];

  readonly statisticsPageName = 'Statistics';
  statisticsItems: StatisticItem[] = [];

  readonly programTints = ['bg-blue-tint', 'bg-green-tint', 'bg-pink-tint'];
  programs: OurProgramItem[] = [];
  selectedProgram: OurProgramItem | null = null;

  readonly navItems: NavItem[] = [
    { label: 'About Us', subItems: [
      { label: 'History' },
      { label: 'Vision & Mission' },
      { label: "Principal's Message" }
    ] },
    { label: 'Academics', subItems: [
      { label: 'Programs Offered' },
      { label: 'Faculty' },
      { label: 'Curriculum' }
    ] },
    { label: 'Admissions', subItems: [
      { label: 'Eligibility' },
      { label: 'How to Apply' },
      { label: 'Fee Structure' }
    ] },
    { label: 'Infrastructure & Facilities', subItems: [
      { label: 'Library' },
      { label: 'Moot Court' },
      { label: 'Hostel' }
    ] },
    { label: 'Examinations', subItems: [
      { label: 'Exam Schedule' },
      { label: 'Results' }
    ] },
    { label: 'Student Life', subItems: [
      { label: 'Clubs & Societies' },
      { label: 'Events' }
    ] },
    { label: 'Compliance / Disclosures', subItems: [
      { label: 'RTI' },
      { label: 'Anti Ragging' }
    ] },
    { label: 'Legal Aid', subItems: [
      { label: 'Legal Aid Clinic' }
    ] },
    { label: 'News & Events', subItems: [
      { label: 'Announcements' },
      { label: 'Media Gallery' }
    ] },
    { label: 'Alumni', subItems: [
      { label: 'Alumni Network' }
    ] }
  ];

  /** Cycled onto each announcement's category tag, same trick as programTints. */
  readonly announcementTagKinds = ['blue', 'green', 'purple', 'orange'];
  readonly announcementsToShow = 4;
  announcements: AnnouncementItem[] = [];

  navOpen = false;
  openSubmenuIndex: number | null = null;

  ngOnInit(): void {
    this.getSiteBranding();
    this.getSocialMediaLinks();
    this.getWhyChooseUsItems();
    this.getStatisticsItems();
    this.getOurProgramItems();
    this.getAnnouncements();
  }

  /** Header brand, footer brand, browser tab title AND favicon all come from
   *  this one call — the favicon only updates once a real logo is uploaded,
   *  so it never gets stomped with the default while the CMS is still empty. */
  getSiteBranding(): void {
    this.apiService
      .GetRequest('HeaderAndFooter/0/' + this.logoAndTitleSectionName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : res;
          if (!data) {
            return;
          }

          const name = data.name ?? data.Name ?? '';
          const logoPath = data.logoPath ?? data.LogoPath ?? '';

          this.siteTitle = name || this.defaultSiteTitle;
          this.siteLogo = logoPath
            ? this.configService.get('IMAGE_API_URL') + logoPath
            : this.defaultSiteLogo;

          this.titleService.setTitle(this.siteTitle);

          if (logoPath && isPlatformBrowser(this.platformId)) {
            const favicon: HTMLLinkElement | null = this.document.querySelector('link[rel="icon"]');
            if (favicon) {
              this.renderer.setAttribute(favicon, 'href', this.siteLogo);
            }
          }
        },
        error: (err) => {
          console.error('Logo And Title Error:', err);
        }
      });
  }

  /** Footer social icons — CMS's Header and Footer > Social Media module
   *  (same HeaderAndFooter API, SectionName "Social Media"). Icon is a
   *  Font Awesome brand class (e.g. "fa-brands fa-facebook") chosen in the
   *  CMS; Font Awesome is already loaded site-wide (index.html). */
  getSocialMediaLinks(): void {
    this.apiService
      .GetRequest('HeaderAndFooter/0/' + this.socialMediaSectionName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

          this.socialMediaLinks = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              icon: item.icon ?? item.Icon ?? '',
              link: item.link ?? item.Link ?? ''
            }))
            .filter((item: SocialMediaLink) => item.icon && item.link)
            .sort((a: SocialMediaLink, b: SocialMediaLink) => a.id - b.id);
        },
        error: (err) => {
          console.error('Social Media Error:', err);
        }
      });
  }

  /** Recognizable platforms keep their brand color; anything else the CMS
   *  adds falls back to a neutral navy circle instead of breaking styling. */
  socialIconClass(icon: string): string {
    const lower = icon.toLowerCase();
    if (lower.includes('youtube')) return 'social-yt';
    if (lower.includes('facebook')) return 'social-fb';
    if (lower.includes('instagram')) return 'social-ig';
    if (lower.includes('linkedin')) return 'social-li';
    return 'social-default';
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
            // API returns newest-first (admin-list convention); the public
            // page shows entries in the order they were added instead.
            .sort((a: { id: number }, b: { id: number }) => a.id - b.id);
        },
        error: (err) => {
          console.error('Why Choose Us Error:', err);
        }
      });
  }

  onWhyChooseUsCardClick(item: WhyChooseUsItem): void {
    if (!item.externalLink || !isPlatformBrowser(this.platformId)) {
      return;
    }

    window.open(item.externalLink, '_blank', 'noopener');
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
            .sort((a: { id: number }, b: { id: number }) => a.id - b.id);
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
            .sort((a: OurProgramItem, b: OurProgramItem) => a.id - b.id)
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

  toggleNav(): void {
    this.navOpen = !this.navOpen;
    if (!this.navOpen) this.openSubmenuIndex = null;
    this.syncNavScrollLock();
  }

  closeNav(): void {
    this.navOpen = false;
    this.openSubmenuIndex = null;
    this.syncNavScrollLock();
  }

  /** Drawer is position:fixed and only covers the header — lock body scroll
   *  behind it while open, since the drawer itself can't own the scroll. */
  private syncNavScrollLock(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.navOpen) {
      this.renderer.addClass(this.document.body, 'nav-drawer-open');
    } else {
      this.renderer.removeClass(this.document.body, 'nav-drawer-open');
    }
  }

  /**
   * Desktop (>1240px): CSS :hover reveals the submenu, and the parent link
   * itself is a real [routerLink] — clicking it navigates.
   * Mobile (<=1240px): there's no hover, so the parent link is disabled
   * (bound to null in the template) and this click only expands/collapses
   * the submenu accordion instead.
   */
  get isDesktopNav(): boolean {
    return !isPlatformBrowser(this.platformId) || window.innerWidth > 1240;
  }

  toggleSubmenu(index: number, event: Event): void {
    if (this.isDesktopNav) {
      return;
    }
    event.preventDefault();
    this.openSubmenuIndex = this.openSubmenuIndex === index ? null : index;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId) && window.innerWidth > 1240 && this.navOpen) {
      this.closeNav();
    }
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
