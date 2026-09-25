import { DOCUMENT } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { sanitizeRichHtml } from './html-sanitizer';

/**
 * Renders CMS (CKEditor) rich text through the site's allowlist sanitizer
 * (html-sanitizer.ts). This is the only place CMS HTML is marked trusted,
 * and only *after* sanitizing: Angular's own sanitizer would strip the
 * inline styles CKEditor formatting depends on, so the sanitized output is
 * passed through as-is instead of being sanitized a second time.
 *
 * Also covers the earlier link fixes (Bug Report rows 66/82): external
 * links open in a new tab, invalid/relative-to-page links render as plain
 * non-navigating text.
 */
@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    return this.sanitizer.bypassSecurityTrustHtml(sanitizeRichHtml(value, this.document));
  }
}
