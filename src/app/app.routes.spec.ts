import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { ComingSoonComponent } from './public/coming-soon/coming-soon.component';
import { SERVER_RESPONSE } from './services/server-response.token';
import { SiteTitleStrategy } from './services/site-title.strategy';
import { SITE_PATHS } from './services/site-links';
import { flushApi, provideTestConfig, provideTestHttp } from './testing/test-providers';

const COLLEGE = 'Sikkim Government Law College';

describe('app routes', () => {
  let harness: RouterTestingHarness;
  let status: jasmine.Spy;

  beforeEach(async () => {
    status = jasmine.createSpy('status');
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTestHttp(),
        provideTestConfig(),
        { provide: TitleStrategy, useExisting: SiteTitleStrategy },
        { provide: SERVER_RESPONSE, useValue: { status } }
      ]
    });
    harness = await RouterTestingHarness.create();
  });

  const url = () => TestBed.inject(Router).url;
  const title = () => TestBed.inject(Title).getTitle();
  const heading = () => (harness.routeNativeElement as HTMLElement).querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim();

  it('serves real pages at the CMS paths', async () => {
    await harness.navigateByUrl('/' + SITE_PATHS.library);
    expect(url()).toBe('/student-life/library');
    expect(heading()).toBe('Library');
  });

  for (const [legacy, target] of [
    ['/library', '/student-life/library'],
    ['/legal-aid', '/committee-and-cell/legal-aid-cell'],
    ['/academic-calendar', '/academics/academic-calendar']
  ]) {
    it(`redirects legacy ${legacy} to ${target}`, async () => {
      await harness.navigateByUrl(legacy);
      expect(url()).toBe(target);
    });
  }

  it('shows Page Not Found (not Home) for an unknown URL and sets HTTP 404', async () => {
    const page = await harness.navigateByUrl('/definitely/not/a/page', ComingSoonComponent);
    expect(page.view().notFound).toBeTrue();
    expect(heading()).toBe('Page Not Found');
    expect(url()).toBe('/definitely/not/a/page');
    expect(status).toHaveBeenCalledOnceWith(404);
  });

  it('does not set 404 for known pages or Coming Soon pages', async () => {
    await harness.navigateByUrl('/');
    await harness.navigateByUrl('/about/faculty');
    await harness.navigateByUrl('/pages/Privacy Policy');
    expect(status).not.toHaveBeenCalled();
  });

  it('gives nav pages without an implementation a Coming Soon page titled with the nav label', async () => {
    await harness.navigateByUrl('/about/faculty', ComingSoonComponent);
    expect(heading()).toContain('Faculty');
    expect(heading()).toContain('Coming Soon');
  });

  describe('browser title', () => {
    it('Home is just the college name', async () => {
      await harness.navigateByUrl('/');
      expect(title()).toBe(COLLEGE);
    });

    it('a page is "<page> | <college>"', async () => {
      await harness.navigateByUrl('/student-life/library');
      expect(title()).toBe(`Library | ${COLLEGE}`);
    });

    it('keeps a long page title intact', async () => {
      await harness.navigateByUrl('/committee-and-cell/internal-committee');
      expect(title()).toBe(`Internal Committee (Sexual Harrasment Inquiry Committee) | ${COLLEGE}`);
    });

    it('Coming Soon and Page Not Found pages', async () => {
      await harness.navigateByUrl('/pages/Privacy Policy');
      expect(title()).toBe(`Privacy Policy | ${COLLEGE}`);
      await harness.navigateByUrl('/nope');
      expect(title()).toBe(`Page Not Found | ${COLLEGE}`);
    });

    it('follows the CMS Logo & Title as plain first-line text (no tags, no &nbsp;)', async () => {
      await harness.navigateByUrl('/student-life/library');
      flushApi(TestBed.inject(HttpTestingController), 'HeaderAndFooter/0/Logo And Title',
        [{ Name: '<span><strong>SIKKIM&nbsp;GOVT LAW COLLEGE</strong></span><p>Excellence in Legal Education</p>', LogoPath: '' }]);
      expect(title()).toBe('Library | SIKKIM GOVT LAW COLLEGE');
    });

    it('a page can refine its title with a CMS record title (rich text made plain)', async () => {
      await harness.navigateByUrl('/academics/academic-calendar');
      TestBed.inject(SiteTitleStrategy).setPageTitle('<b>Academic&nbsp;Calendar 2026-27</b>');
      expect(title()).toBe(`Academic Calendar 2026-27 | ${COLLEGE}`);
    });
  });
});
