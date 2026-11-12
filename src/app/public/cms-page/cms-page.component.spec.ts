import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HttpTestingController } from '@angular/common/http/testing';
import { CmsPageComponent } from './cms-page.component';
import { CmsPageKind } from '../../services/cms-pages';
import { TEST_IMAGE_URL, failApi, flushApi, provideTestConfig, provideTestHttp } from '../../testing/test-providers';

describe('CmsPageComponent', () => {
  let http: HttpTestingController;

  function render(kind: CmsPageKind, api: string, title = 'Page') {
    TestBed.configureTestingModule({
      imports: [CmsPageComponent],
      providers: [
        provideRouter([]),
        provideTestHttp(),
        provideTestConfig(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { kind, api, title } }, paramMap: of(convertToParamMap({})) } }
      ]
    });
    const fixture = TestBed.createComponent(CmsPageComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }
  const respond = (fixture: ReturnType<typeof render>, api: string, body: unknown) => {
    flushApi(http, api, body);
    fixture.detectChanges();
  };
  const main = (fixture: ReturnType<typeof render>) => (fixture.nativeElement as HTMLElement).querySelector('main')!;

  describe('content', () => {
    const api = 'CommitteeAndCell/0/Admission Committee';

    it('shows the page heading, the newest record\'s rich text and its image', () => {
      const fixture = render('content', api, 'Admission Committee');
      respond(fixture, api, [
        { id: 1, pageName: 'Admission Committee', content: '<p>Old</p>' },
        { id: 2, pageName: 'Admission Committee', content: '<p>Current <strong>text</strong></p>', image: 'assets/x.webp' }
      ]);
      expect((fixture.nativeElement as HTMLElement).querySelector('h1')!.textContent!.trim()).toBe('Admission Committee');
      expect(main(fixture).querySelector('.content-body')!.innerHTML).toContain('Current <strong>text</strong>');
      expect(main(fixture).querySelector<HTMLImageElement>('.content-image')!.src).toBe(`${TEST_IMAGE_URL}assets/x.webp`);
    });

    it('shows an attached PDF as a plain row that opens it in a new tab (no embed)', () => {
      const fixture = render('content', 'ComplianceOrDisclosures/NIRF');
      respond(fixture, 'ComplianceOrDisclosures/NIRF', [{ id: 1, content: '', filePath: 'assets/nirf.pdf' }]);
      expect(main(fixture).querySelector('iframe')).toBeNull();
      const row = main(fixture).querySelector<HTMLAnchorElement>('a.doc-row')!;
      expect(row.href).toBe(`${TEST_IMAGE_URL}assets/nirf.pdf`);
      expect(row.target).toBe('_blank');
      expect(row.textContent).toContain('View PDF');
    });

    it('turns a body that is only a PDF link into a document row', () => {
      const api = 'StudentLife/0/National Cadet Crops';
      const fixture = render('content', api);
      respond(fixture, api, [{ id: 1, content: '<p><a href="https://drive.google.com/file/d/x/view">NCC Report PDF</a></p><p>&nbsp;</p>' }]);
      expect(main(fixture).querySelector('.content-body')).toBeNull();
      const row = main(fixture).querySelector<HTMLAnchorElement>('a.doc-row')!;
      expect(row.href).toBe('https://drive.google.com/file/d/x/view');
      expect(row.querySelector('.doc-label')!.textContent!.trim()).toBe('NCC Report PDF');
    });

    it('keeps a body with text and links as rich text', () => {
      const fixture = render('content', api);
      respond(fixture, api, [{ id: 1, content: '<p>Read the <a href="https://example.org/a.pdf">report</a> here.</p>' }]);
      expect(main(fixture).querySelector('.content-body')!.textContent).toContain('Read the');
      expect(main(fixture).querySelector('a.doc-row')).toBeNull();
    });

    it('shows the empty state when nothing was saved, or only an emptied editor', () => {
      const fixture = render('content', api);
      respond(fixture, api, [{ id: 1, content: '<p>&nbsp;</p>' }]);
      expect(main(fixture).textContent).toContain('Content not available yet');
    });

    it('shows the empty state (no crash) when the API fails', () => {
      const fixture = render('content', api);
      failApi(http, api);
      fixture.detectChanges();
      expect(fixture.componentInstance.loading).toBeFalse();
      expect(main(fixture).textContent).toContain('Content not available yet');
    });
  });

  describe('list', () => {
    it('renders every record newest first with image, text, PDF and only valid links', () => {
      const fixture = render('list', 'NotableAlumni');
      respond(fixture, 'NotableAlumni', [
        { id: 1, title: 'First', content: '<p>a</p>', image: 'assets/1.webp' },
        { id: 5, title: 'Newest', filePath: 'assets/doc.pdf', link: 'not a url' },
        { id: 3, title: 'Linked', link: 'https://example.org' }
      ]);
      const cards = [...main(fixture).querySelectorAll('.card')];
      expect(cards.map(c => c.querySelector('.card-title')!.textContent!.trim())).toEqual(['Newest', 'Linked', 'First']);
      expect(cards[0].textContent).toContain('View PDF');
      expect(cards[0].textContent).not.toContain('Visit link');
      expect(cards[1].querySelector<HTMLAnchorElement>('a.action-link')!.href).toBe('https://example.org/');
      expect(cards[2].querySelector('img.card-image')).not.toBeNull();
    });

    for (const [label, body] of [['empty array', []], ['{}', {}], ['null', null]] as const) {
      it(`shows the empty state for ${label}`, () => {
        const fixture = render('list', 'Newsletters');
        respond(fixture, 'Newsletters', body);
        expect(main(fixture).textContent).toContain('Nothing here yet');
      });
    }
  });

  describe('people', () => {
    it('orders by the CMS display order and shows contact links', () => {
      const fixture = render('people', 'Faculty');
      respond(fixture, 'Faculty', [
        { id: 1, name: 'Second', designation: 'Professor', displayOrder: 2 },
        { id: 2, name: 'First', designation: 'Principal', email: 'p@x.org', phone: '9876543210', profilePhoto: 'assets/p.webp', displayOrder: 1 }
      ]);
      const people = [...main(fixture).querySelectorAll('.person')];
      expect(people.map(p => p.querySelector('.person-name')!.textContent!.trim())).toEqual(['First', 'Second']);
      expect(people[0].querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!.href).toBe('mailto:p@x.org');
      expect(people[0].querySelector<HTMLAnchorElement>('a[href^="tel:"]')).not.toBeNull();
      // No photo: an initial placeholder instead of a broken image.
      expect(people[1].querySelector('.person-initial')!.textContent!.trim()).toBe('S');
      expect(main(fixture).querySelector('.person-text')).toBeNull();
    });

    it('groups people by Reports To: top position first, then who reports to them', () => {
      const fixture = render('people', 'Faculty');
      respond(fixture, 'Faculty', [
        { id: 3, name: 'HOD', parentId: 1, displayOrder: 3 },
        { id: 1, name: 'Principal', parentId: null, displayOrder: 1 },
        { id: 2, name: 'Professor', parentId: 1, displayOrder: 2 },
        { id: 4, name: 'Lecturer', parentId: 3, displayOrder: 4 }
      ]);
      const tiers = [...main(fixture).querySelectorAll('.people-tier')]
        .map(t => [...t.querySelectorAll('.person-name')].map(n => n.textContent!.trim()));
      expect(tiers).toEqual([['Principal'], ['Professor', 'HOD'], ['Lecturer']]);
    });

    it('shows the initial when a photo file is missing on the server', () => {
      const fixture = render('people', 'Faculty');
      respond(fixture, 'Faculty', [{ id: 1, name: 'Dilip', profilePhoto: 'assets/gone.webp', displayOrder: 1 }]);
      main(fixture).querySelector('img.person-photo')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(main(fixture).querySelector('img.person-photo')).toBeNull();
      expect(main(fixture).querySelector('.person-initial')!.textContent!.trim()).toBe('D');
    });
  });

  describe('profiles', () => {
    it('shows Student Achievers newest first with photo and rich text', () => {
      const fixture = render('profiles', 'StudentAchievers');
      respond(fixture, 'StudentAchievers', [
        { id: 1, name: 'Older', content: '<p>Moot court winner</p>', profileImage: 'assets/a.webp' },
        { id: 2, name: 'Newer', content: '<p>&nbsp;</p>', profileImage: null }
      ]);
      const people = [...main(fixture).querySelectorAll('.person')];
      expect(people.map(p => p.querySelector('.person-name')!.textContent!.trim())).toEqual(['Newer', 'Older']);
      expect(people[1].querySelector<HTMLImageElement>('img.person-photo')!.src).toBe(`${TEST_IMAGE_URL}assets/a.webp`);
      expect(people[1].querySelector('.person-text')!.innerHTML).toContain('Moot court winner');
      expect(people[0].querySelector('.person-text')).toBeNull();
    });
  });
});
