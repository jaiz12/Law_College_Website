/**
 * Statistics counts read as "at least" figures ("500+ Students"), so the
 * "+" is added here instead of making CMS editors type it. Only a plain
 * number gets one: "100" -> "100+", "1,200" -> "1,200+". Anything already
 * suffixed ("100+") or not a plain number ("A+", "24x7") is shown as
 * entered; null/blank -> "".
 */
export function formatStatCount(count: string | number | null | undefined): string {
  const value = String(count ?? '').trim();
  return /^\d{1,3}(,\d{3})*$|^\d+$/.test(value) ? `${value}+` : value;
}
