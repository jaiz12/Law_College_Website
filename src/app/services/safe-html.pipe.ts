import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { isAbsoluteHttpUrl } from './url.util';

// Matches a single <a ...href="..."...> opening tag, quoted either way, so
// its href can be inspected/rewritten. Regex rather than DOMParser because
// this pipe also runs during SSR, where there's no DOM to parse into.
const ANCHOR_TAG = /<a\b([^>]*?)\bhref\s*=\s*(["'])(.*?)\2([^>]*)>/gi;

/**
 * Rewrites CMS-authored (CKEditor) rich text before it's trusted, fixing
 * two link problems reported against every place this pipe renders content
 * (Bug Report row 66/82):
 *  - a valid external link never opened in a new tab -> force
 *    target="_blank" rel="noopener" on it.
 *  - an invalid/malformed link (no CMS-side format validation on the URL
 *    field) resolved as a path relative to the current page when clicked,
 *    silently redirecting the visitor instead of doing nothing -> strip the
 *    href so it renders as plain (non-navigating) text instead.
 */
function fixRichTextLinks(html: string): string {
  return html.replace(ANCHOR_TAG, (match, before, quote, href, after) => {
    const rest = `${before} ${after}`.replace(/\s+(target|rel)\s*=\s*(["']).*?\2/gi, '');

    if (!isAbsoluteHttpUrl(href)) {
      return `<a${rest}>`;
    }

    return `<a${rest} href=${quote}${href}${quote} target="_blank" rel="noopener">`;
  });
}

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) { }

  transform(value: string): SafeHtml {
    if (!value) {
      return '';
    }

    return this.sanitizer.bypassSecurityTrustHtml(fixRichTextLinks(value));
  }
}
