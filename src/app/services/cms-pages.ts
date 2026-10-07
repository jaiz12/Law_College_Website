/**
 * Which nav pages are backed by a CMS module, and how each is shown.
 *
 * - `content`: one rich-text record (+ optional image/PDF) — the CMS edits
 *   a single entry for the page. Keyed modules (About Us, Committee and
 *   Cell, Student Life, Compliance) share one endpoint and tell pages apart
 *   by PageName, which must match the CMS's `pageName` value exactly.
 * - `list`: every record of a module, newest first, as cards (title, image,
 *   rich text, PDF, link — whichever the module has).
 * - `people`: Faculty / Administrative Staff profile cards.
 *
 * `api` is the path under API_URL (Law_College_API). Paths here are nav
 * paths from site-links.ts; the page heading/title is that nav entry's label.
 */
export type CmsPageKind = 'content' | 'list' | 'people';

export interface CmsPageConfig {
  kind: CmsPageKind;
  api: string;
}

const content = (api: string): CmsPageConfig => ({ kind: 'content', api });
const list = (api: string): CmsPageConfig => ({ kind: 'list', api });
const people = (api: string): CmsPageConfig => ({ kind: 'people', api });

const aboutUs = (pageName: string) => content(`AboutUs/0/${pageName}`);
const committee = (pageName: string) => content(`CommitteeAndCell/0/${pageName}`);
const studentLife = (pageName: string) => content(`StudentLife/0/${pageName}`);
const compliance = (pageName: string) => content(`ComplianceOrDisclosures/${pageName}`);

export const CMS_PAGES: Record<string, CmsPageConfig> = {
  // About Us
  'about/general-overview': aboutUs('General Overview'),
  'about/vision-mission': aboutUs('Vision and Mission'),
  'about/principal-message': aboutUs('Principals Message'),
  'about/faculty': people('Faculty'),
  'about/administrative-staff': people('AdministrativeStaff'),
  'about/infrastructure': list('Infrastructure'),
  'about/recognitions-and-affiliations': list('RecognitionsAndAffiliations'),
  'about/statutory-bodies': list('StatutoryBodies'),

  // Academics
  'academics/syllabus': list('Syllabus'),
  'academics/research-and-publications': list('ResearchAndPublications'),
  'academics/academic-policies': content('AcademicPolicies'),

  // Admission
  'admissions/eligibility-admission-process-and-intake': list('EligibilityAdmissionProcessAndIntake'),
  'admissions/reservation-policy': content('ReservationPolicy'),
  'admissions/prospectus': list('Prospectus'),
  'admissions/contact-admission-office': content('ContactAdmissionOffice'),

  // Examination
  'examinations/notifications': list('Notifications'),
  'examinations/results': content('Results'),

  // Student Life (Library has its own link-list page)
  'student-life/student-representative-council': studentLife('Student Representative Council'),
  'student-life/student-club': studentLife('Student Club'),
  'student-life/national-social-service': studentLife('National Social Service'),
  // CMS pageName really is spelled "Crops".
  'student-life/national-cadet-corps': studentLife('National Cadet Crops'),
  'student-life/medical-aid-cell': studentLife('Medical Aid Cell'),
  'student-life/internships': studentLife('Internships'),
  'student-life/scholarships': studentLife('Scholarships'),
  'student-life/bus-service': studentLife('Bus Service'),
  'student-life/canteen': studentLife('Canteen'),

  // Compliance/Disclosures
  'compliance-or-disclosures/nirf': compliance('NIRF'),
  'compliance-or-disclosures/aishe': compliance('AISHE'),

  // Committee and Cell
  'committee-and-cell/internal-quality-assurance-cell': committee('Internal Quality Assurance Cell'),
  'committee-and-cell/college-management-committee': committee('College Management Committee'),
  'committee-and-cell/admission-committee': committee('Admission Committee'),
  'committee-and-cell/examination-committee': committee('Examination Committee'),
  'committee-and-cell/disciplinary-committee': committee('Disciplinary Committee'),
  'committee-and-cell/grievances-redressal-committee': committee('Grievances Redressal Committee'),
  'committee-and-cell/internal-committee': committee('Internal Committee'),
  'committee-and-cell/gender-sensitization-cell': committee('Gender Sensitization Cell'),
  'committee-and-cell/anti-ragging-committee-and-squad': committee('Anti Ragging Committee & Squad'),
  'committee-and-cell/legal-research-development-cell': committee('Legal Research & Development Cell'),
  'committee-and-cell/career-counselling-and-placement-cell': committee('Career Counselling & Placement Cell'),
  'committee-and-cell/moot-court-committee': committee('Moot Court Committee'),
  // The CMS moved Legal Aid Cell from the old title+link list
  // (/api/LegalAidCell) to a Committee and Cell content page.
  'committee-and-cell/legal-aid-cell': committee('Legal Aid Cell'),
  'committee-and-cell/sc-st-minority-cell': committee('SC or ST & Minority Cell'),

  // Alumni (Register / Join is its own form page)
  'alumni/governing-body': list('GoverningBody'),
  'alumni/notable-alumni': list('NotableAlumni'),
  'alumni/alumni-events': list('AlumniEvents'),
  'alumni/newsletters': list('Newsletters')
};
