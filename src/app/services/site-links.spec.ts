import { SITE_PATHS, flattenSiteNav, resolveInternalPath, resolveSiteLink } from './site-links';

describe('site-links', () => {
  it('maps the CMS "UI_URL + path" internal link to the website route, ignoring the host', () => {
    expect(resolveInternalPath('http://localhost:4200/student-life/library')).toBe(SITE_PATHS.library);
    expect(resolveInternalPath('https://cms.example.org/academics/academic-calendar')).toBe(SITE_PATHS.academicCalendar);
  });

  it('accepts bare paths, legacy website paths and nav labels', () => {
    expect(resolveInternalPath('/committee-and-cell/legal-aid-cell/')).toBe(SITE_PATHS.legalAidCell);
    expect(resolveInternalPath('/legal-aid')).toBe(SITE_PATHS.legalAidCell);
    expect(resolveInternalPath('library')).toBe(SITE_PATHS.library);
    expect(resolveInternalPath('News & Events Archives')).toBe(SITE_PATHS.newsEventsArchives);
  });

  it('returns null for unknown or empty internal links instead of guessing', () => {
    expect(resolveInternalPath('http://localhost:4200/not/a/page')).toBeNull();
    expect(resolveInternalPath('')).toBeNull();
    expect(resolveInternalPath(null)).toBeNull();
    expect(resolveInternalPath('%E0%A4%A')).toBeNull();
  });

  it('only allows absolute http(s) external links', () => {
    expect(resolveSiteLink('https://www.google.com', 'external')).toEqual({ kind: 'external', url: 'https://www.google.com' });
    expect(resolveSiteLink('dfiubhfv', 'External')).toBeNull();
    expect(resolveSiteLink('javascript:alert(1)', 'external')).toBeNull();
  });

  it('treats the link type case-insensitively', () => {
    expect(resolveSiteLink('http://x/student-life/library', 'Internal')).toEqual({ kind: 'internal', path: SITE_PATHS.library });
  });

  it('has unique nav paths', () => {
    const paths = flattenSiteNav().map(item => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
