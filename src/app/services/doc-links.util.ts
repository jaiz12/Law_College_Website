import { decodeHtmlEntities, htmlToPlainText } from './rich-text.util';
import { isAbsoluteHttpUrl } from './url.util';

/** A document the visitor opens in a new tab (a PDF, a Drive file, …). */
export interface DocLink {
  label: string;
  url: string;
  isPdf: boolean;
}

const ANCHOR = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a\s*>/gi;

/** PDF file, or a Google Drive / Docs file link (how the college shares PDFs). */
export function looksLikePdf(url: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(url) || /^https?:\/\/(?:drive|docs)\.google\.com\//i.test(url);
}

/**
 * When a CMS rich-text body is nothing but links (e.g. NCC: one
 * "NCC Report PDF" link and no write-up), returns those links so the page
 * can show them as simple "open the PDF" rows instead of a lone link set
 * in display type. Returns [] when the body has any text of its own, or
 * a link that isn't an absolute http(s) URL. String-based: runs in SSR.
 */
export function linksOnlyDocs(html: string | null | undefined): DocLink[] {
  if (!html) {
    return [];
  }
  const links: DocLink[] = [];
  let unsafe = false;
  const rest = html.replace(ANCHOR, (_match, dq: string | undefined, sq: string | undefined, inner: string) => {
    const url = decodeHtmlEntities((dq ?? sq ?? '').trim());
    if (!isAbsoluteHttpUrl(url)) {
      unsafe = true;
      return ' ';
    }
    const label = htmlToPlainText(inner) || 'Open document';
    links.push({ label, url, isPdf: looksLikePdf(url) });
    return ' ';
  });
  if (unsafe || !links.length || htmlToPlainText(rest).length > 0) {
    return [];
  }
  return links;
}
