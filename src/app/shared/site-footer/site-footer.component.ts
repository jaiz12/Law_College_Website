import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { ConfigService } from '../../services/config.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { isAbsoluteHttpUrl } from '../../services/url.util';

interface SocialMediaLink {
  id: number;
  icon: string;
  link: string;
}

interface ContactDetail {
  id: number;
  icon: string;
  detail: string;
}

interface ImportantLink {
  id: number;
  name: string;
  link: string;
  /** "Internal" -> routed through /pages/:link via routerLink; anything
   *  else (e.g. "External") -> a plain absolute-URL href, new tab. */
  type: string;
}

/**
 * Shared site footer — brand/contact/links/map + the floating admission
 * ribbon and scroll-to-top button. Used on every public page (home,
 * quick-link-list, coming-soon) so the site chrome stays identical
 * everywhere. Fetches its own copy of the branding (logo/title), same data
 * as the header — kept independent rather than shared through a service so
 * this component can be dropped onto any page with zero wiring.
 */
@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss'
})
export class SiteFooterComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);
  private readonly configService = inject(ConfigService);
  private readonly sanitizer = inject(DomSanitizer);

  /** Admin app URL (separate project) — the Login link opens this directly. */
  readonly cmsUrl = this.apiService.UI_URL || this.configService.get('UI_URL') || '';

  readonly logoAndTitleSectionName = 'Logo And Title';
  readonly defaultSiteTitle = 'Sikkim Government Law College';
  readonly defaultSiteLogo = '/images/home/logo.png';
  siteTitle = this.defaultSiteTitle;
  siteTitleText = this.defaultSiteTitle;
  siteLogo = this.defaultSiteLogo;

  readonly socialMediaSectionName = 'Social Media';
  socialMediaLinks: SocialMediaLink[] = [];

  // Bug Report rows 15/20/28: Contact Us, Important Links and College Map
  // were pure static markup in this template — never wired to the CMS at
  // all, so any edit made in the admin panel had nowhere to go and the
  // page kept showing the original placeholder copy forever. All three
  // share the same HeaderAndFooter/{Id}/{SectionName} endpoint the logo,
  // title and social links already use.
  readonly contactUsSectionName = 'Contact Us';
  contactDetails: ContactDetail[] = [];

  readonly importantLinksSectionName = 'Important Links';
  importantLinks: ImportantLink[] = [];

  readonly collegeMapSectionName = 'College Map';
  /** Original hardcoded Gangtok query, kept as the fallback shown until (or
   *  unless) the CMS has coordinates saved — same behavior as before,
   *  just no longer the only behavior. */
  readonly defaultMapOpenUrl = 'https://www.google.com/maps/search/?api=1&query=Sikkim+Government+Law+College+Gangtok+Sikkim';
  readonly defaultMapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.google.com/maps?q=Sikkim+Government+Law+College+Gangtok+Sikkim&output=embed'
  );
  mapOpenUrl: string | null = null;
  mapEmbedUrl: string | null = null;
  mapEmbedSafeUrl: SafeResourceUrl | null = null;

  readonly isValidLink = isAbsoluteHttpUrl;

  ngOnInit(): void {
    this.getSiteBranding();
    this.getSocialMediaLinks();
    this.getContactDetails();
    this.getImportantLinks();
    this.getCollegeMap();
  }

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

  /** Contact Us — Icon/Detail rows (e.g. address, email, phone), same shape
   *  family as Social Media's Icon/Link rows. */
  getContactDetails(): void {
    this.apiService
      .GetRequest('HeaderAndFooter/0/' + this.contactUsSectionName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

          this.contactDetails = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              icon: item.icon ?? item.Icon ?? '',
              detail: item.detail ?? item.Detail ?? ''
            }))
            .filter((item: ContactDetail) => item.detail)
            .sort((a: ContactDetail, b: ContactDetail) => a.id - b.id);
        },
        error: (err) => {
          console.error('Contact Us Error:', err);
        }
      });
  }

  /** Important Links — Name/Link/Type rows; Type distinguishes an
   *  admin-picked internal page from a freeform external URL (see
   *  isInternalLink). */
  getImportantLinks(): void {
    this.apiService
      .GetRequest('HeaderAndFooter/0/' + this.importantLinksSectionName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

          this.importantLinks = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              name: item.name ?? item.Name ?? '',
              link: item.link ?? item.Link ?? '',
              type: item.type ?? item.Type ?? ''
            }))
            .filter((item: ImportantLink) => item.name && item.link)
            // Newest-added link shown first, same convention applied to
            // every other public list on this site (rows 41/45/64/88/99).
            .sort((a: ImportantLink, b: ImportantLink) => b.id - a.id);
        },
        error: (err) => {
          console.error('Important Links Error:', err);
        }
      });
  }

  isInternalLink(item: ImportantLink): boolean {
    return item.type.toLowerCase() === 'internal';
  }

  /** College Map — single active row with the admin-entered coordinates;
   *  builds both the embedded iframe src and the "Open in Maps" link from
   *  them instead of the hardcoded Gangtok query used before. */
  getCollegeMap(): void {
    this.apiService
      .GetRequest('HeaderAndFooter/0/' + this.collegeMapSectionName)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : res;
          const lat = data?.latitude ?? data?.Latitude;
          const lng = data?.longitude ?? data?.Longitude;

          if (!lat || !lng) {
            return;
          }

          const query = `${lat},${lng}`;
          this.mapEmbedUrl = `https://www.google.com/maps?q=${query}&output=embed`;
          this.mapEmbedSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.mapEmbedUrl);
          this.mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
        },
        error: (err) => {
          console.error('College Map Error:', err);
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

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
