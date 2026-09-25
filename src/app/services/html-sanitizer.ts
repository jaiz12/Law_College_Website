/**
 * Allowlist sanitizer for CMS (CKEditor) rich text — the security boundary
 * between CMS content and the public page. CMS HTML is untrusted.
 *
 * Why not Angular's built-in sanitizer: it drops every `style` attribute,
 * which removes CKEditor's font colour/size, alignment and indentation.
 * This keeps those (as an allowlist of CSS properties) and nothing else.
 *
 * How: the input is parsed into an *inert* document (created with
 * `implementation.createHTMLDocument`, so nothing loads, runs or fires —
 * the same technique Angular's sanitizer uses, and it works on the server
 * too), then a fresh HTML string is rebuilt from allowlisted elements,
 * attributes, URLs and CSS only, with all text and values re-escaped.
 * Anything not explicitly allowed is dropped.
 */

const HTML_NS = 'http://www.w3.org/1999/xhtml';

/** Elements kept (with their allowed attributes). */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'small', 'mark', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
  'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption',
  'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
]);

/** Elements removed together with everything inside them. Unknown
 *  elements not listed here are unwrapped (tag dropped, text kept). */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'template', 'noscript', 'noembed', 'noframes', 'xmp', 'plaintext',
  'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'portal',
  'form', 'input', 'button', 'select', 'option', 'textarea',
  'base', 'meta', 'link', 'head', 'title',
  'audio', 'video', 'source', 'track', 'canvas', 'dialog'
]);

const VOID_TAGS = new Set(['br', 'hr', 'img', 'col']);

const GLOBAL_ATTRS = new Set(['style', 'class', 'title', 'dir', 'lang']);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  ol: new Set(['start', 'reversed', 'type']),
  col: new Set(['span']),
  colgroup: new Set(['span'])
};

const ATTR_VALUE_RULES: Record<string, RegExp> = {
  colspan: /^\d{1,3}$/,
  rowspan: /^\d{1,3}$/,
  span: /^\d{1,3}$/,
  start: /^-?\d{1,6}$/,
  width: /^\d{1,5}$/,
  height: /^\d{1,5}$/,
  type: /^[1aAiI]$/,
  scope: /^(row|col|rowgroup|colgroup)$/,
  dir: /^(ltr|rtl|auto)$/i,
  lang: /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/
};

/** CKEditor's own classes only — site/Tailwind classes (e.g. "fixed
 *  inset-0") would let content restyle or overlay the page. */
const ALLOWED_CLASS = /^(table|image|image_resized|image-style-[a-z-]+|text-(tiny|small|big|huge)|marker-[a-z]+|pen-[a-z]+|todo-list)$/;

/** CSS properties CKEditor's toolbar produces (font, colour, alignment,
 *  indent, list style, table/image sizing). No positioning, no url(). */
const ALLOWED_CSS = new Set([
  'color', 'background-color',
  'font-size', 'font-family', 'font-weight', 'font-style',
  'text-align', 'text-decoration', 'text-decoration-line', 'text-indent',
  'margin-left', 'margin-right', 'padding-left', 'padding-right',
  'list-style-type',
  'width', 'height', 'max-width', 'vertical-align',
  'border', 'border-color', 'border-style', 'border-width', 'border-collapse'
]);
const SAFE_CSS_VALUE = /^[-#%.,\w\s'"()]{1,200}$/;
const UNSAFE_CSS_VALUE = /url\s*\(|expression|javascript|vbscript|image-set|attr\s*\(|@import|behavior|binding/i;

const MAX_DEPTH = 64;

/** Characters browsers ignore or strip when parsing a URL (C0/C1 controls,
 *  whitespace) — removed before looking at the scheme so "java\tscript:"
 *  or " javascript:" can't slip through. */
const URL_IGNORED = /[\u0000- \u007f-\u009f]/g;
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i;

export type UrlKind = 'link' | 'image';

/**
 * Returns the URL if it is safe for the given use, otherwise null.
 * Links: http(s), mailto, tel, or a site-rooted path ("/…", "#…").
 * Images: http(s), a site-rooted path, or a base64 raster data: URL.
 * Bare words ("dfiubhfv") are rejected — they'd resolve relative to the
 * current page, which is the old "invalid link redirects to the website" bug.
 */
export function sanitizeUrl(value: string | null | undefined, kind: UrlKind): string | null {
  const raw = (value ?? '').trim();
  const compact = raw.replace(URL_IGNORED, '');
  if (!compact) {
    return null;
  }

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase();
  if (scheme) {
    if (scheme === 'http' || scheme === 'https') return raw;
    if (kind === 'link' && (scheme === 'mailto' || scheme === 'tel')) return raw;
    if (kind === 'image' && SAFE_DATA_IMAGE.test(compact)) return raw;
    return null;
  }

  // Site-rooted path or fragment. "//host" and "/\host" are protocol-
  // relative (browsers treat "\" as "/"), i.e. another site — rejected.
  if (compact.startsWith('#')) return raw;
  if (compact.startsWith('/') && !/^\/[/\\]/.test(compact) && !compact.includes('\\')) return raw;
  return null;
}

export function sanitizeStyle(style: string | null | undefined): string {
  if (!style) {
    return '';
  }

  const safe: string[] = [];
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).replace(/!important/gi, '').trim();
    if (ALLOWED_CSS.has(property) && SAFE_CSS_VALUE.test(value) && !UNSAFE_CSS_VALUE.test(value)) {
      safe.push(`${property}:${value}`);
    }
  }
  return safe.join(';');
}

/**
 * Sanitizes CMS HTML. `doc` is any Document (the app's DOCUMENT — works in
 * the browser and during SSR); it's only used to create an inert parsing
 * document, never to insert the input into the live page.
 */
export function sanitizeRichHtml(html: string | null | undefined, doc: Document): string {
  if (!html) {
    return '';
  }

  const inert = doc.implementation.createHTMLDocument('');
  const container = inert.createElement('div');
  container.innerHTML = html;

  const out: string[] = [];
  serializeChildren(container, out, 0);
  return out.join('');
}

function serializeChildren(parent: Node, out: string[], depth: number): void {
  if (depth > MAX_DEPTH) {
    return;
  }
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 3) {
      out.push(escapeText(node.nodeValue ?? ''));
    } else if (node.nodeType === 1) {
      serializeElement(node as Element, out, depth);
    }
    // Comments, processing instructions, etc. are dropped.
  }
}

function serializeElement(el: Element, out: string[], depth: number): void {
  // SVG/MathML (and anything else outside the HTML namespace) is dropped
  // entirely: event handlers, <script> and parser-differential (mXSS)
  // tricks all live there, and CKEditor never produces it.
  if (el.namespaceURI && el.namespaceURI !== HTML_NS) {
    return;
  }

  const tag = el.nodeName.toLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) {
    return;
  }
  if (!ALLOWED_TAGS.has(tag)) {
    serializeChildren(el, out, depth + 1);
    return;
  }
  // An image with no usable source is just an empty box — drop it.
  if (tag === 'img' && !sanitizeUrl(el.getAttribute('src'), 'image')) {
    return;
  }

  out.push('<', tag, serializeAttributes(el, tag), '>');
  if (!VOID_TAGS.has(tag)) {
    serializeChildren(el, out, depth + 1);
    out.push('</', tag, '>');
  }
}

function serializeAttributes(el: Element, tag: string): string {
  const parts: string[] = [];
  const tagAttrs = TAG_ATTRS[tag];

  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    const name = attr.name.toLowerCase();
    if (!GLOBAL_ATTRS.has(name) && !tagAttrs?.has(name)) {
      continue; // on*, srcdoc, formaction, id, data-*, xlink:*, …
    }

    let value: string | null = attr.value;
    if (name === 'style') {
      value = sanitizeStyle(value) || null;
    } else if (name === 'class') {
      value = value.split(/\s+/).filter(token => ALLOWED_CLASS.test(token)).join(' ') || null;
    } else if (name === 'href') {
      value = sanitizeUrl(value, 'link');
    } else if (name === 'src') {
      value = sanitizeUrl(value, 'image');
    } else if (name === 'reversed') {
      value = '';
    } else if (ATTR_VALUE_RULES[name]) {
      value = ATTR_VALUE_RULES[name].test(value.trim()) ? value.trim() : null;
    }

    if (value === null) continue;
    parts.push(value === '' && name === 'reversed' ? ' reversed' : ` ${name}="${escapeAttribute(value)}"`);
  }

  // Links: external ones open in a new tab without handing the new page a
  // reference back to this one. An <a> whose href was rejected stays as
  // plain, non-navigating text.
  if (tag === 'a') {
    const href = sanitizeUrl(el.getAttribute('href'), 'link');
    if (href && /^https?:/i.test(href.replace(URL_IGNORED, ''))) {
      parts.push(' target="_blank" rel="noopener noreferrer"');
    }
  }

  return parts.join('');
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}
