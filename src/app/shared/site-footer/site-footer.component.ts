import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ConfigService } from '../../services/config.service';

interface SocialMediaLink {
  id: number;
  icon: string;
  link: string;
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
  imports: [CommonModule, RouterModule],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss'
})
export class SiteFooterComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);
  private readonly configService = inject(ConfigService);

  /** Admin app URL (separate project) — the Login link opens this directly. */
  readonly cmsUrl = this.apiService.UI_URL || this.configService.get('UI_URL') || '';

  readonly logoAndTitleSectionName = 'Logo And Title';
  readonly defaultSiteTitle = 'Sikkim Government Law College';
  readonly defaultSiteLogo = '/images/home/logo.png';
  siteTitle = this.defaultSiteTitle;
  siteLogo = this.defaultSiteLogo;

  readonly socialMediaSectionName = 'Social Media';
  socialMediaLinks: SocialMediaLink[] = [];

  ngOnInit(): void {
    this.getSiteBranding();
    this.getSocialMediaLinks();
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
