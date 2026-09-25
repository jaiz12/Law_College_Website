import { isAbsoluteHttpUrl } from './url.util';

/**
 * Single source of truth for the public site's page paths.
 *
 * Paths are the CMS's own menu paths (Law_College_UI config.json
 * `menus[].UIrouterlink`). That matters because the CMS's Important Links
 * "Internal" picker stores `UI_URL + UIrouterlink` as the link — so using
 * the same paths here is what lets a CMS-picked internal page land on the
 * matching website page instead of a made-up `/pages/<whole-url>` route.
 */

export interface SiteNavItem {
  label: string;
  /** Route path, no leading slash. */
  path: string;
  children?: SiteNavItem[];
}

/**
 * Paths referenced by name from code (templates, routes, legacy redirects).
 * Which of these have a real page vs. "Coming Soon" is decided in
 * app.routes.ts, not here.
 */
export const SITE_PATHS = {
  home: '',
  academicCalendar: 'academics/academic-calendar',
  library: 'student-life/library',
  legalAidCell: 'committee-and-cell/legal-aid-cell',
  announcements: 'news-events/announcements',
  newsEventsArchives: 'news-events/news-events-archives',
  onlineApplication: 'admissions/online-application',
  examResults: 'examinations/results'
} as const;

/** Old website-only paths, kept alive as redirects for existing links/bookmarks. */
export const LEGACY_PAGE_REDIRECTS: Record<string, string> = {
  'academic-calendar': SITE_PATHS.academicCalendar,
  'library': SITE_PATHS.library,
  'legal-aid': SITE_PATHS.legalAidCell
};

/**
 * Labels are the college's own spreadsheet wording, kept verbatim
 * (including its spelling) — only the paths are aligned with the CMS.
 */
export const SITE_NAV: SiteNavItem[] = [
  { label: 'About Us', path: 'about', children: [
    { label: 'Overview', path: 'about/general-overview' },
    { label: 'Vision & Mission', path: 'about/vision-mission' },
    { label: "Principal's Message", path: 'about/principal-message' },
    { label: 'Faculty', path: 'about/faculty' },
    { label: 'Administrative Staff', path: 'about/administrative-staff' },
    { label: 'Infrastructure', path: 'about/infrastructure' },
    { label: 'Recognitions & Affiliations (BCI, UGC, NAAC, etc.)', path: 'about/recognitions-and-affiliations' },
    { label: 'Statutory Bodies (IQAC, Academic Council, etc.)', path: 'about/statutory-bodies' }
  ] },
  { label: 'Academics', path: 'academics', children: [
    { label: '5-Year Integrated BA LLB', path: 'academics/ba-llb' },
    { label: '2-Year LLM', path: 'academics/llm' },
    { label: 'Syllabus', path: 'academics/syllabus' },
    { label: 'Academic Calendar', path: SITE_PATHS.academicCalendar },
    { label: 'Research & Publications', path: 'academics/research-and-publications' },
    { label: 'Academic Policies', path: 'academics/academic-policies' }
  ] },
  { label: 'Admission', path: 'admissions', children: [
    { label: 'Eligibility Admission process & Intake', path: 'admissions/eligibility-admission-process-and-intake' },
    { label: 'Reservation Policy', path: 'admissions/reservation-policy' },
    { label: 'Fee Structure', path: 'admissions/fee-structure' },
    { label: 'Prospectus (Download)', path: 'admissions/prospectus' },
    { label: 'Online Application', path: SITE_PATHS.onlineApplication },
    { label: 'Contact Admissions Office', path: 'admissions/contact-admission-office' }
  ] },
  { label: 'Examination', path: 'examinations', children: [
    { label: 'Notifications', path: 'examinations/notifications' },
    { label: 'Exam Schedules', path: 'examinations/exam-schedules' },
    { label: 'Results (semester-wise)', path: SITE_PATHS.examResults },
    { label: 'Student Achievers', path: 'examinations/student-achievers' }
  ] },
  { label: 'Student Life', path: 'student-life', children: [
    { label: 'Student representative Council (SRC)', path: 'student-life/student-representative-council' },
    { label: 'Library', path: SITE_PATHS.library },
    { label: 'Student Club', path: 'student-life/student-club' },
    { label: 'National Social Service (NSS)', path: 'student-life/national-social-service' },
    { label: 'National Cadet Crops (NCC)', path: 'student-life/national-cadet-corps' },
    { label: 'Medical Aid Cell', path: 'student-life/medical-aid-cell' },
    { label: 'Intership', path: 'student-life/internships' },
    { label: 'Scholarship', path: 'student-life/scholarships' },
    { label: 'Bus service', path: 'student-life/bus-service' },
    { label: 'Canteen', path: 'student-life/canteen' },
    { label: 'Statistics', path: 'student-life/statistics' }
  ] },
  { label: 'Compliance/Disclosures', path: 'compliance', children: [
    { label: 'BCI Compliance', path: 'compliance/bci-compliance' },
    { label: 'UGC Compliance', path: 'compliance/ugc-compliance' },
    // CMS path really is "nirf-iqac" for NAAC / IQAC.
    { label: 'NAAC / IQAC', path: 'compliance/nirf-iqac' },
    { label: 'NIRF', path: 'compliance/nirf' },
    { label: 'AISHE', path: 'compliance/aishe' }
  ] },
  { label: 'Committee and Cell', path: 'committee-and-cell', children: [
    { label: 'Internal Quality Assurance Cell (IQAC)', path: 'committee-and-cell/internal-quality-assurance-cell' },
    { label: 'College Mangement Committee', path: 'committee-and-cell/college-management-committee' },
    { label: 'Admission Committee', path: 'committee-and-cell/admission-committee' },
    { label: 'Examination Committee', path: 'committee-and-cell/examination-committee' },
    { label: 'Disciplinary Committee', path: 'committee-and-cell/disciplinary-committee' },
    { label: 'Greviances redressal Committee', path: 'committee-and-cell/grievances-redressal-committee' },
    { label: 'Internal Committee (Sexual Harrasment Inquiry Committee)', path: 'committee-and-cell/internal-committee' },
    { label: 'Gender Sensitizations Cell', path: 'committee-and-cell/gender-sensitization-cell' },
    { label: 'Anti Ragging Committee and Squad', path: 'committee-and-cell/anti-ragging-committee-and-squad' },
    { label: 'Legal Research Development Cell', path: 'committee-and-cell/legal-research-development-cell' },
    { label: 'Career Counselling & Placement Cell', path: 'committee-and-cell/career-counselling-and-placement-cell' },
    { label: 'Moot Court Committee', path: 'committee-and-cell/moot-court-committee' },
    { label: 'Legal Aid Cell', path: SITE_PATHS.legalAidCell },
    { label: 'SC/ST & Minority Cell', path: 'committee-and-cell/sc-st-minority-cell' }
  ] },
  { label: 'News & Event', path: 'news-events', children: [
    { label: 'Announcements', path: SITE_PATHS.announcements },
    { label: 'Seminars & Webinars', path: 'news-events/seminars-webinars' },
    { label: 'Moot Court Competitions', path: 'news-events/moot-court-competitions' },
    { label: 'News & Events Archives', path: SITE_PATHS.newsEventsArchives }
  ] },
  { label: 'Alumni', path: 'alumni', children: [
    { label: 'Governing Body', path: 'alumni/governing-body' },
    { label: 'Register / Join', path: 'alumni/register-join' },
    { label: 'Notable Alumni', path: 'alumni/notable-alumni' },
    { label: 'Alumni Events', path: 'alumni/alumni-events' },
    { label: 'Newsletters', path: 'alumni/newsletters' }
  ] },
  { label: 'Media & Gallery', path: 'media-gallery' }
];

/** Every nav entry (parents and children), flattened. */
export function flattenSiteNav(items: SiteNavItem[] = SITE_NAV): SiteNavItem[] {
  return items.flatMap(item => [item, ...flattenSiteNav(item.children ?? [])]);
}

export type ResolvedSiteLink =
  | { kind: 'internal'; path: string }
  | { kind: 'external'; url: string };

const KNOWN_PATHS = new Set<string>([
  ...Object.values(SITE_PATHS),
  ...flattenSiteNav().map(item => item.path)
]);

const PATHS_BY_LABEL = new Map<string, string>(
  flattenSiteNav().map(item => [normalizeLabel(item.label), item.path])
);

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePath(path: string): string {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, '');
  return LEGACY_PAGE_REDIRECTS[trimmed] ?? trimmed;
}

/**
 * Resolves a CMS "Internal" link value to a website route path.
 * Accepts every shape the CMS has stored: a full URL (`UI_URL +
 * UIrouterlink` — only its path is used, the host baked in by the CMS's
 * own config is not trusted), a bare path, or a page label. Unknown pages
 * resolve to null rather than a guessed route.
 */
export function resolveInternalPath(link: string | null | undefined): string | null {
  const value = link?.trim();
  if (!value) {
    return null;
  }

  let path = value;
  if (isAbsoluteHttpUrl(value)) {
    path = new URL(value).pathname;
  }

  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Malformed %-escape - keep the raw path.
  }

  const normalized = normalizePath(decoded);
  if (KNOWN_PATHS.has(normalized)) {
    return normalized;
  }

  return PATHS_BY_LABEL.get(normalizeLabel(value)) ?? null;
}

/** Resolves a CMS link (`type` "Internal"/"External", any casing) or null if unusable. */
export function resolveSiteLink(link: string | null | undefined, type?: string | null): ResolvedSiteLink | null {
  if ((type ?? '').trim().toLowerCase() === 'internal') {
    const path = resolveInternalPath(link);
    return path === null ? null : { kind: 'internal', path };
  }

  const url = link?.trim() ?? '';
  return isAbsoluteHttpUrl(url) ? { kind: 'external', url } : null;
}
