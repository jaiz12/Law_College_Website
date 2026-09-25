import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { firstLineOfHtml } from './rich-text.util';

export interface SiteBranding {
  /** Raw CKEditor HTML from the CMS Title field — render via safeHtml. */
  titleHtml: string;
  /** First visual line as plain text — for <title>, alt text, etc. */
  titleText: string;
  logoUrl: string;
}

export const DEFAULT_SITE_TITLE = 'Sikkim Government Law College';
const DEFAULT_SITE_LOGO = '/images/home/logo.png';
const LOGO_AND_TITLE_SECTION = 'Logo And Title';

/**
 * CMS Header and Footer > Logo & Title, fetched once and shared by the
 * header, footer and browser tab title (previously each component made
 * its own request and did its own tag stripping).
 */
@Injectable({ providedIn: 'root' })
export class SiteBrandingService {
  private readonly apiService = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly state = new BehaviorSubject<SiteBranding>({
    titleHtml: DEFAULT_SITE_TITLE,
    titleText: DEFAULT_SITE_TITLE,
    logoUrl: DEFAULT_SITE_LOGO
  });
  private requested = false;

  readonly branding$ = this.state.asObservable();

  get current(): SiteBranding {
    return this.state.value;
  }

  /** Safe to call from every component; only the first call hits the API. */
  load(): void {
    if (this.requested) {
      return;
    }
    this.requested = true;

    this.apiService
      .GetRequest('HeaderAndFooter/0/' + LOGO_AND_TITLE_SECTION)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res) ? res[0] : res;
          if (!data) {
            return;
          }

          const titleHtml: string = data.name ?? data.Name ?? '';
          const logoPath: string = data.logoPath ?? data.LogoPath ?? '';
          const titleText = firstLineOfHtml(titleHtml);

          this.state.next({
            titleHtml: titleText ? titleHtml : DEFAULT_SITE_TITLE,
            titleText: titleText || DEFAULT_SITE_TITLE,
            logoUrl: logoPath ? this.apiService.IMAGE_API_URL + logoPath : DEFAULT_SITE_LOGO
          });

          // Favicon only follows a real uploaded logo, never the default.
          if (logoPath && isPlatformBrowser(this.platformId)) {
            this.document
              .querySelector('link[rel="icon"]')
              ?.setAttribute('href', this.apiService.IMAGE_API_URL + logoPath);
          }
        },
        error: (err) => {
          console.error('Logo And Title Error:', err);
        }
      });
  }
}
