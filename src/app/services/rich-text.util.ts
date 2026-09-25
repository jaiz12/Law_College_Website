/**
 * Plain-text helpers for CMS (CKEditor) rich text.
 *
 * Deliberately string-based: these run during SSR, where there is no
 * `document`/`DOMParser`, and CMS HTML must never be turned into live DOM
 * just to read its text (an `<img onerror>` fires even on a detached
 * element). Nothing here executes or renders the input.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™'
};

/** Tags that start or end a visual line in CKEditor output — opening tags
 *  too, so inline text before a block ("<span>Name</span><p>Tagline</p>")
 *  is its own line. */
const BLOCK_TAGS = 'p|div|h[1-6]|blockquote|li|ul|ol|table|tr|td|th|figure|figcaption';
const LINE_BREAK = new RegExp(`<br\\s*\\/?>|<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi');

/** Removes whole elements whose text is never visible content. */
const NON_CONTENT = /<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi;

const TAG = /<[^>]*>/g;

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Visual lines of the HTML as plain text, blank lines dropped. */
export function htmlToTextLines(html: string | null | undefined): string[] {
  if (!html) {
    return [];
  }

  return html
    .replace(NON_CONTENT, '')
    .split(LINE_BREAK)
    // Tags become spaces (not '') so "<b>A</b><i>B</i>" can't merge words
    // that only looked separate because of block/inline boundaries.
    .map(chunk => decodeHtmlEntities(chunk.replace(TAG, ' ')).replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0);
}

/** Whole rich-text value as one line of plain text. */
export function htmlToPlainText(html: string | null | undefined): string {
  return htmlToTextLines(html).join(' ');
}

/**
 * First meaningful visual line — e.g. just "SIKKIM GOVERNMENT LAW COLLEGE
 * GANGTOK" out of a Title that also carries a tagline paragraph. Skips
 * empty CKEditor paragraphs (`<p>&nbsp;</p>`) and keeps text that sits
 * before the first tag.
 */
export function firstLineOfHtml(html: string | null | undefined): string {
  return htmlToTextLines(html)[0] ?? '';
}
