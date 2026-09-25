import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { htmlToPlainText } from './rich-text.util';
import { SiteBrandingService } from './site-branding.service';

/**
 * Browser tab title = "<page> | <college name>", or just the college name
 * on Home. The page part comes from the route's `title` (app.routes.ts);
 * a page that loads a more specific CMS title can refine it with
 * setPageTitle(). The college name follows the CMS Logo & Title as soon
 * as it arrives. Everything goes through htmlToPlainText, so CMS rich text
 * can never put tags or `&nbsp;` into the tab.
 */
@Injectable({ providedIn: 'root' })
export class SiteTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly branding = inject(SiteBrandingService);

  private pageTitle = '';

  constructor() {
    super();
    this.branding.branding$.subscribe(() => this.apply());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pageTitle = htmlToPlainText(this.buildTitle(snapshot));
    this.apply();
  }

  /** Overrides the route title for the current page, e.g. with a CMS record's title. */
  setPageTitle(pageTitle: string | null | undefined): void {
    const text = htmlToPlainText(pageTitle);
    if (text) {
      this.pageTitle = text;
      this.apply();
    }
  }

  private apply(): void {
    const siteTitle = this.branding.current.titleText;
    this.title.setTitle(this.pageTitle && this.pageTitle !== siteTitle
      ? `${this.pageTitle} | ${siteTitle}`
      : siteTitle);
  }
}
