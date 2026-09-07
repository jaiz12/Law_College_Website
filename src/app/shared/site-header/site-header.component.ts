import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ConfigService } from '../../services/config.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';

interface NavSubItem {
  label: string;
}

interface NavItem {
  label: string;
  subItems?: NavSubItem[];
}

/**
 * Shared site header — logo/title + primary nav. Used on every public page
 * (home, quick-link-list, coming-soon) so the site chrome stays identical
 * everywhere. Fetches its own copy of the branding (logo/title) from the
 * CMS's Header and Footer > Logo & Title module, same as the footer does —
 * kept independent rather than shared through a service so this component
 * can be dropped onto any page with zero wiring.
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss'
})
export class SiteHeaderComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);
  private readonly configService = inject(ConfigService);
  private readonly titleService = inject(Title);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  readonly logoAndTitleSectionName = 'Logo And Title';
  readonly defaultSiteTitle = 'Sikkim Government Law College';
  readonly defaultSiteLogo = '/images/home/logo.png';
  /** Raw CKEditor HTML from the CMS, rendered via [innerHTML] in the
   *  template (see safeHtml pipe) — carries formatting like bold/headings. */
  siteTitle = this.defaultSiteTitle;
  /** Tags-stripped version for contexts that need plain text: the <img>
   *  alt text and the browser tab title (Bug Report row 8 — an alt/title
   *  full of raw HTML tags would just move the same bug somewhere else). */
  siteTitleText = this.defaultSiteTitle;
  siteLogo = this.defaultSiteLogo;

  /**
   * Order/labels/hierarchy here are the source-of-truth spreadsheet the
   * college handed over — kept verbatim (including its own inconsistent
   * spelling/casing, e.g. "Intership", "Mangement", "Greviances",
   * "Harrasment", "Sensitizations", "Crops") rather than "corrected", so
   * this stays a faithful mirror of that sheet. Every entry still routes
   * through the generic /pages/:title coming-soon placeholder, same as
   * before — only the structure changed, not the routing behavior.
   */
  readonly navItems: NavItem[] = [
    { label: 'About Us', subItems: [
      { label: 'Overview' },
      { label: 'Vision & Mission' },
      { label: "Principal's Message" },
      { label: 'Faculty' },
      { label: 'Administrative Staff' },
      { label: 'Infrastructure' },
      { label: 'Recognitions & Affiliations (BCI, UGC, NAAC, etc.)' },
      { label: 'Statutory Bodies (IQAC, Academic Council, etc.)' }
    ] },
    { label: 'Academics', subItems: [
      { label: '5-Year Integrated BA LLB' },
      { label: '2-Year LLM' },
      { label: 'Syllabus' },
      { label: 'Academic Calendar' },
      { label: 'Research & Publications' },
      { label: 'Academic Policies' }
    ] },
    { label: 'Admission', subItems: [
      { label: 'Eligibility Admission process & Intake' },
      { label: 'Reservation Policy' },
      { label: 'Fee Structure' },
      { label: 'Prospectus (Download)' },
      { label: 'Online Application' },
      { label: 'Contact Admissions Office' }
    ] },
    { label: 'Examination', subItems: [
      { label: 'Notifications' },
      { label: 'Exam Schedules' },
      { label: 'Results (semester-wise)' },
      { label: 'Student Achievers' }
    ] },
    { label: 'Student Life', subItems: [
      { label: 'Student representative Council (SRC)' },
      { label: 'Library' },
      { label: 'Student Club' },
      { label: 'National Social Service (NSS)' },
      { label: 'National Cadet Crops (NCC)' },
      { label: 'Medical Aid Cell' },
      { label: 'Intership' },
      { label: 'Scholarship' },
      { label: 'Bus service' },
      { label: 'Canteen' },
      { label: 'Statistics' }
    ] },
    { label: 'Compliance/Disclosures', subItems: [
      { label: 'BCI Compliance' },
      { label: 'UGC Compliance' },
      { label: 'NAAC / IQAC' },
      { label: 'NIRF' },
      { label: 'AISHE' }
    ] },
    { label: 'Committee and Cell', subItems: [
      { label: 'Internal Quality Assurance Cell (IQAC)' },
      { label: 'College Mangement Committee' },
      { label: 'Admission Committee' },
      { label: 'Examination Committee' },
      { label: 'Disciplinary Committee' },
      { label: 'Greviances redressal Committee' },
      { label: 'Internal Committee (Sexual Harrasment Inquiry Committee)' },
      { label: 'Gender Sensitizations Cell' },
      { label: 'Anti Ragging Committee and Squad' },
      { label: 'Legal Research Development Cell' },
      { label: 'Career Counselling & Placement Cell' },
      { label: 'Moot Court Committee' },
      { label: 'Legal Aid Cell' },
      { label: 'SC/ST & Minority Cell' }
    ] },
    { label: 'News & Event', subItems: [
      { label: 'Announcements' },
      { label: 'Seminars & Webinars' },
      { label: 'Moot Court Competitions' },
      { label: 'News & Events Archives' }
    ] },
    { label: 'Alumni', subItems: [
      { label: 'Governing Body' },
      { label: 'Register / Join' },
      { label: 'Notable Alumni' },
      { label: 'Alumni Events' },
      { label: 'Newsletters' }
    ] },
    // Leaf top-level item — no submenu, same shape as Home. See the
    // template's `item.subItems?.length` guard for how this is handled.
    { label: 'Media & Gallery' }
  ];

  navOpen = false;
  openSubmenuIndex: number | null = null;

  ngOnInit(): void {
    this.getSiteBranding();
  }

  /** Header brand, browser tab title AND favicon all come from this one
   *  call — the favicon only updates once a real logo is uploaded, so it
   *  never gets stomped with the default while the CMS is still empty. */
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
          this.siteTitleText = this.siteTitle.replace(/<[^>]*>/g, '').trim() || this.defaultSiteTitle;
          this.siteLogo = logoPath
            ? this.configService.get('IMAGE_API_URL') + logoPath
            : this.defaultSiteLogo;

          this.titleService.setTitle(this.siteTitleText);

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

  /** Splits a long submenu into 2 columns of real, independent <ul>s (see
   *  .sub-nav-cols) — first half in column 1, second half in column 2, in
   *  source order. Plain array slicing rather than CSS grid/multi-column:
   *  those either balance by height (uneven item counts per column) or
   *  sync row heights across columns (one column's wrapped label leaves a
   *  gap in the other) — neither of which a fixed nav-label list needs. */
  subNavColumns(item: NavItem): NavSubItem[][] {
    const items = item.subItems ?? [];
    const half = Math.ceil(items.length / 2);
    return [items.slice(0, half), items.slice(half)];
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
   * Desktop (>1320px): CSS :hover reveals the submenu, and the parent link
   * itself is a real [routerLink] — clicking it navigates.
   * Mobile (<=1320px): there's no hover, so the parent link is disabled
   * (bound to null in the template) and this click only expands/collapses
   * the submenu accordion instead.
   */
  get isDesktopNav(): boolean {
    return !isPlatformBrowser(this.platformId) || window.innerWidth > 1320;
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
    if (isPlatformBrowser(this.platformId) && window.innerWidth > 1320 && this.navOpen) {
      this.closeNav();
    }
  }
}
