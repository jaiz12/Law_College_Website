import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { SiteBrandingService } from '../../services/site-branding.service';
import { ResolvedSiteLink, resolveSiteLink } from '../../services/site-links';
import { SiteVisitService } from '../../services/site-visit.service';
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
  target: ResolvedSiteLink;
}

/** 'error' is the only state that shows static fallback copy — an empty
 *  CMS section is shown as empty, so deleting data in the CMS is reflected. */
type LoadState = 'loading' | 'loaded' | 'error';

const HEADER_AND_FOOTER_API = 'HeaderAndFooter/0/';

/**
 * Shared site footer — brand/contact/links/map + the floating admission
 * ribbon and scroll-to-top button. Used on every public page. All CMS
 * sections come from the HeaderAndFooter/{Id}/{SectionName} endpoint;
 * branding is shared with the header via SiteBrandingService.
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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly brandingService = inject(SiteBrandingService);

  readonly branding$ = this.brandingService.branding$;
  readonly monthlyVisitCount$ = inject(SiteVisitService).monthlyVisitCount$;

  /**
   * CMS (admin app, separate project) login — the one footer link that is
   * config-driven rather than CMS data: the CMS's Important Links picker
   * only offers public pages, so Login can't be managed there. Hidden
   * unless config.json's CMS_URL is a usable absolute URL.
   */
  readonly cmsUrl = isAbsoluteHttpUrl(this.apiService.CMS_URL) ? this.apiService.CMS_URL : null;

  socialMediaLinks: SocialMediaLink[] = [];

  contactDetails: ContactDetail[] = [];
  contactState: LoadState = 'loading';

  importantLinks: ImportantLink[] = [];

  /** Original hardcoded Gangtok query — shown until (or unless) the CMS has
   *  valid coordinates saved. */
  readonly defaultMapOpenUrl = 'https://www.google.com/maps/search/?api=1&query=Sikkim+Government+Law+College+Gangtok+Sikkim';
  private readonly defaultMapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.google.com/maps?q=Sikkim+Government+Law+College+Gangtok+Sikkim&output=embed'
  );
  mapOpenUrl = this.defaultMapOpenUrl;
  mapEmbedUrl: SafeResourceUrl = this.defaultMapEmbedUrl;

  ngOnInit(): void {
    this.brandingService.load();
    this.getSocialMediaLinks();
    this.getContactDetails();
    this.getImportantLinks();
    this.getCollegeMap();
  }

  /** Icon is a Font Awesome class (e.g. "fa-brands fa-facebook") chosen in
   *  the CMS; Font Awesome is loaded site-wide (index.html). */
  getSocialMediaLinks(): void {
    this.getSectionRows('Social Media').subscribe({
      next: (rows) => {
        this.socialMediaLinks = rows
          .map((item: any) => ({
            id: item.id ?? item.Id ?? 0,
            icon: item.icon ?? item.Icon ?? '',
            link: (item.link ?? item.Link ?? '').trim()
          }))
          // A non-absolute URL would resolve relative to this site and
          // "redirect back to the website" — same guard as every other link.
          .filter((item: SocialMediaLink) => item.icon && isAbsoluteHttpUrl(item.link))
          .sort((a: SocialMediaLink, b: SocialMediaLink) => a.id - b.id);
      },
      error: (err) => {
        console.error('Social Media Error:', err);
      }
    });
  }

  /** Contact Us — Icon/Detail rows (e.g. address, email, phone). */
  getContactDetails(): void {
    this.getSectionRows('Contact Us').subscribe({
      next: (rows) => {
        this.contactDetails = rows
          .map((item: any) => ({
            id: item.id ?? item.Id ?? 0,
            icon: item.icon ?? item.Icon ?? '',
            detail: (item.detail ?? item.Detail ?? '').trim()
          }))
          .filter((item: ContactDetail) => item.detail)
          .sort((a: ContactDetail, b: ContactDetail) => a.id - b.id);
        this.contactState = 'loaded';
      },
      error: (err) => {
        console.error('Contact Us Error:', err);
        this.contactState = 'error';
      }
    });
  }

  /** Important Links — Name/Link/Type rows. Type "Internal" links hold the
   *  CMS's `UI_URL + page path`; resolveSiteLink maps that onto this site's
   *  routes (site-links.ts). Unresolvable links are dropped, not guessed. */
  getImportantLinks(): void {
    this.getSectionRows('Important Links').subscribe({
      next: (rows) => {
        this.importantLinks = rows
          .map((item: any) => ({
            id: item.id ?? item.Id ?? 0,
            name: (item.name ?? item.Name ?? '').trim(),
            target: resolveSiteLink(item.link ?? item.Link, item.type ?? item.Type)
          }))
          .filter((item: any): item is ImportantLink => !!item.name && item.target !== null)
          // Newest-added link shown first, same convention as every other
          // public list on this site.
          .sort((a: ImportantLink, b: ImportantLink) => b.id - a.id);
      },
      error: (err) => {
        console.error('Important Links Error:', err);
      }
    });
  }

  /** College Map — single row; Latitude/Longitude are strings in the API
   *  (HeaderAndFooterDTO). Only a real in-range coordinate pair replaces
   *  the default location (0 is a valid coordinate, blank/garbage is not). */
  getCollegeMap(): void {
    this.getSectionRows('College Map').subscribe({
      next: (rows) => {
        const data = rows[0];
        const lat = parseCoordinate(data?.latitude ?? data?.Latitude, 90);
        const lng = parseCoordinate(data?.longitude ?? data?.Longitude, 180);

        if (lat === null || lng === null) {
          return;
        }

        const query = `${lat},${lng}`;
        this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.google.com/maps?q=${query}&output=embed`
        );
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

  /** Visit count as fixed-width odometer digits (min 6). */
  counterDigits(count: number): string[] {
    return String(count).padStart(6, '0').split('');
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private getSectionRows(sectionName: string) {
    return this.apiService.GetRequestRows(HEADER_AND_FOOTER_API + sectionName);
  }
}

function parseCoordinate(value: unknown, limit: number): number | null {
  const text = String(value ?? '').trim();
  if (!/^[-+]?\d+(\.\d+)?$/.test(text)) {
    return null;
  }
  const number = Number(text);
  return Math.abs(number) <= limit ? number : null;
}
