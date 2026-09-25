import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { SiteFooterComponent } from './site-footer.component';
import { SiteVisitService } from '../../services/site-visit.service';
import { expectApi, failApi, flushApi, provideTestConfig, provideTestHttp } from '../../testing/test-providers';

const SECTION = 'HeaderAndFooter/0/';

describe('SiteFooterComponent', () => {
  let http: HttpTestingController;

  function render(config: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({
      imports: [SiteFooterComponent],
      providers: [provideRouter([]), provideTestHttp(), provideTestConfig(config)]
    });
    const fixture = TestBed.createComponent(SiteFooterComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }
  const el = (fixture: ReturnType<typeof render>) => fixture.nativeElement as HTMLElement;
  const linkTexts = (fixture: ReturnType<typeof render>) =>
    [...el(fixture).querySelectorAll('.footer-links a')].map(a => a.textContent!.replace('›', '').trim());

  afterEach(() => localStorage.removeItem('siteVisitDate'));

  describe('Login (CMS_URL)', () => {
    it('points at CMS_URL when configured', () => {
      const fixture = render({ CMS_URL: 'https://cms.example.org' });
      const login = [...el(fixture).querySelectorAll('.footer-links a')].find(a => a.textContent!.includes('Login'));
      expect(login?.getAttribute('href')).toBe('https://cms.example.org');
    });

    it('is not rendered when CMS_URL is missing — even if the old UI_URL (the website) is set', () => {
      const fixture = render({ UI_URL: 'https://website.example.org' });
      expect(linkTexts(fixture)).not.toContain('Login');
      expect(el(fixture).innerHTML).not.toContain('website.example.org');
    });

    it('is not rendered when CMS_URL is not an absolute http(s) URL', () => {
      expect(linkTexts(render({ CMS_URL: 'cms' }))).not.toContain('Login');
    });
  });

  describe('Important Links', () => {
    it('resolves CMS links through the shared resolver and drops unusable ones', () => {
      const fixture = render();
      flushApi(http, SECTION + 'Important Links', [
        { Id: 1, Name: 'Library', Link: 'http://cms-ui:4200/student-life/library', Type: 'internal' },
        { Id: 2, Name: 'Google', Link: 'https://www.google.com', Type: 'external' },
        { Id: 3, Name: 'Broken', Link: 'dfiubhfv', Type: 'external' },
        { Id: 4, Name: 'JS', Link: 'javascript:alert(1)', Type: 'external' },
        { Id: 5, Name: 'Unknown', Link: 'http://cms-ui:4200/no/such/page', Type: 'internal' }
      ]);
      fixture.detectChanges();
      const links = [...el(fixture).querySelectorAll('.footer-links a')].map(a => [a.textContent!.replace('›', '').trim(), a.getAttribute('href')]);
      expect(links).toEqual([['Google', 'https://www.google.com'], ['Library', '/student-life/library']]);
    });

    it('shows no hardcoded default links when the CMS section is empty', () => {
      const fixture = render();
      flushApi(http, SECTION + 'Important Links', []);
      fixture.detectChanges();
      expect(linkTexts(fixture)).toEqual([]);
    });
  });

  describe('College Map', () => {
    const mapSrc = (fixture: ReturnType<typeof render>) => el(fixture).querySelector('iframe')!.getAttribute('src');

    it('accepts 0 as a valid coordinate', () => {
      const fixture = render();
      expectApi(http, SECTION + 'College Map').flush([{ Latitude: '0', Longitude: '0' }]);
      fixture.detectChanges();
      expect(mapSrc(fixture)).toBe('https://www.google.com/maps?q=0,0&output=embed');
    });

    it('accepts negative coordinates', () => {
      const fixture = render();
      expectApi(http, SECTION + 'College Map').flush([{ Latitude: '-27.33', Longitude: '88.61' }]);
      fixture.detectChanges();
      expect(mapSrc(fixture)).toContain('q=-27.33,88.61');
    });

    for (const [lat, lng] of [['E', '88'], ['27', '200'], ['91', '0'], ['', ''], [null, null]]) {
      it(`rejects invalid coordinates (${lat}, ${lng}) and keeps the default location`, () => {
        const fixture = render();
        expectApi(http, SECTION + 'College Map').flush([{ Latitude: lat, Longitude: lng }]);
        fixture.detectChanges();
        expect(mapSrc(fixture)).toContain('Sikkim+Government+Law+College');
      });
    }
  });

  describe('Social Media', () => {
    it('renders only rows with an icon and an absolute URL', () => {
      const fixture = render();
      flushApi(http, SECTION + 'Social Media', [
        { Id: 1, Icon: 'fa-brands fa-facebook', Link: 'https://facebook.com/x' },
        { Id: 2, Icon: 'fa-brands fa-youtube', Link: 'youtube' },
        { Id: 3, Icon: null, Link: 'https://x.com' },
        { Id: 4 }
      ]);
      fixture.detectChanges();
      expect([...el(fixture).querySelectorAll('.social-row a')].map(a => a.getAttribute('href'))).toEqual(['https://facebook.com/x']);
    });
  });

  describe('Contact Us', () => {
    it('shows CMS rows, and nothing extra when the CMS section is empty', () => {
      const fixture = render();
      flushApi(http, SECTION + 'Contact Us', []);
      fixture.detectChanges();
      const contact = el(fixture).querySelectorAll('.footer-col')[1];
      expect(contact.querySelectorAll('p').length).toBe(0);
    });

    it('shows the fallback address only when the API fails', () => {
      const fixture = render();
      failApi(http, SECTION + 'Contact Us');
      fixture.detectChanges();
      expect(el(fixture).querySelectorAll('.footer-col')[1].textContent).toContain('Gangtok');
    });
  });

  describe('Site Visitors', () => {
    it('is hidden while no real count is available', () => {
      const fixture = render();
      expect(el(fixture).querySelector('.visitor-counter')).toBeNull();
    });

    it('is hidden when the SiteVisit API fails (never a made-up number)', () => {
      localStorage.setItem('siteVisitDate', new Date().toISOString().slice(0, 10));
      const fixture = render();
      TestBed.inject(SiteVisitService).start();
      failApi(http, 'SiteVisit/current', 404);
      fixture.detectChanges();
      expect(el(fixture).querySelector('.visitor-counter')).toBeNull();
    });

    it('shows the real monthly count, including 0', () => {
      localStorage.setItem('siteVisitDate', new Date().toISOString().slice(0, 10));
      const fixture = render();
      TestBed.inject(SiteVisitService).start();
      flushApi(http, 'SiteVisit/current', [{ VisitYear: 2026, VisitMonth: 9, VisitCount: 0 }]);
      fixture.detectChanges();
      expect(el(fixture).querySelector('.visitor-counter')?.textContent?.replace(/\s/g, '')).toBe('000000');
    });
  });
});
