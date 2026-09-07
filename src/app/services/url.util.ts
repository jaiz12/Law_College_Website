/**
 * Guards every "open this CMS-entered link in a new tab" spot on the public
 * site (Why Choose Us cards, Library/Legal Aid rows, rich-text links, …).
 *
 * The CMS lets an admin save an External Link field with no format
 * validation (see Bug Report rows 19/38/92/96). `window.open('someTypedText')`
 * or `<a href="someTypedText">` then resolves as a path *relative to the
 * current page* instead of failing — which is exactly why an invalid link
 * was silently redirecting visitors back to the Home page instead of doing
 * nothing / showing it's broken. Only genuine absolute http(s) URLs should
 * ever be handed to window.open/href.
 */
export function isAbsoluteHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
