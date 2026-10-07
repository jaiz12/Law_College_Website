import { htmlToPlainText } from './rich-text.util';
import { isAbsoluteHttpUrl } from './url.util';

/**
 * One CMS record, normalised across the API's module DTOs. Every content
 * module is a variation of the same few columns — Title, Content (or
 * Description), Image (or ProfilePhoto), FilePath, Link — so the public
 * pages read them through this one shape instead of each knowing its DTO.
 * Both camelCase and PascalCase keys are accepted (the API serializes
 * DataTables camelCase today; older endpoints were PascalCase).
 */
export interface CmsRow {
  id: number;
  title: string;
  /** CKEditor rich text ('' when the editor was left empty). */
  html: string;
  image: string | null;
  file: string | null;
  link: string | null;
  name: string;
  designation: string;
  email: string;
  phone: string;
  displayOrder: number;
}

function pick(row: any, ...keys: string[]): any {
  for (const key of keys) {
    const camel = key[0].toLowerCase() + key.slice(1);
    const value = row?.[camel] ?? row?.[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
}

export function toCmsRow(row: any): CmsRow {
  const html = text(pick(row, 'Content', 'Description'));
  return {
    id: Number(pick(row, 'Id')) || 0,
    title: text(pick(row, 'Title')),
    // CKEditor leaves "<p>&nbsp;</p>" in an emptied editor — that's no content.
    html: htmlToPlainText(html) ? html : '',
    image: text(pick(row, 'Image', 'ProfilePhoto')) || null,
    file: text(pick(row, 'FilePath', 'File')) || null,
    link: text(pick(row, 'Link', 'ExternalLink')) || null,
    name: text(pick(row, 'Name')),
    designation: text(pick(row, 'Designation')),
    email: text(pick(row, 'Email')),
    phone: text(pick(row, 'Phone')),
    displayOrder: Number(pick(row, 'DisplayOrder')) || 0
  };
}

/** Newest first — the order the CMS admin lists use. */
export function newestFirst(a: CmsRow, b: CmsRow): number {
  return b.id - a.id;
}

/**
 * Absolute URL for a CMS-uploaded asset. The API stores paths relative to
 * its own root (e.g. "assets/Alumni/Newsletters/x.webp"), served from
 * IMAGE_API_URL. An already-absolute http(s) URL is used as-is.
 */
export function assetUrl(baseUrl: string | null | undefined, path: string | null | undefined): string | null {
  const value = path?.trim();
  if (!value) {
    return null;
  }
  if (isAbsoluteHttpUrl(value)) {
    return value;
  }
  const base = (baseUrl ?? '').replace(/\/+$/, '');
  return `${base}/${value.replace(/^\/+/, '')}`;
}

export function isPdf(path: string | null | undefined): boolean {
  return !!path && /\.pdf(?:$|[?#])/i.test(path.trim());
}
