import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { AnnouncementListComponent } from './announcement-list.component';
import { failApi, flushApi, provideTestConfig, provideTestHttp } from '../../testing/test-providers';

describe('AnnouncementListComponent', () => {
  let http: HttpTestingController;

  function render() {
    TestBed.configureTestingModule({
      imports: [AnnouncementListComponent],
      providers: [
        provideRouter([]),
        provideTestHttp(),
        provideTestConfig(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { api: 'Announcements', title: 'Announcements' } } } }
      ]
    });
    const fixture = TestBed.createComponent(AnnouncementListComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }
  const respond = (fixture: ReturnType<typeof render>, body: unknown) => {
    flushApi(http, 'Announcements', body);
    fixture.detectChanges();
  };
  const titles = (fixture: ReturnType<typeof render>) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('section li span.font-medium')].map(s => s.textContent!.trim());
  const text = (fixture: ReturnType<typeof render>) => (fixture.nativeElement as HTMLElement).querySelector('section')!.textContent!;

  it('renders two announcements that share a title as two items (tracked by id)', () => {
    // Duplicate @for keys only warn (NG0955) and still render, so the
    // warning itself is what catches a regression to `track item.title`.
    const warn = spyOn(console, 'warn').and.callThrough();
    const fixture = render();
    respond(fixture, [
      { Id: 11, Title: 'Same Title', Category: 'Exam', Urgent: true },
      { Id: 12, Title: 'Same Title', Category: 'Urgent', Urgent: true }
    ]);
    expect(titles(fixture)).toEqual(['Same Title', 'Same Title']);
    expect(fixture.componentInstance.items.map(i => i.id)).toEqual([11, 12]);
    expect(warn.calls.allArgs().flat().join(' ')).not.toContain('NG0955');
  });

  for (const [label, body] of [['empty array', []], ['{}', {}], ['null', null], ['{ data: null }', { data: null }], ['a string', 'oops']] as const) {
    it(`shows the empty state for ${label}`, () => {
      const fixture = render();
      respond(fixture, body);
      expect(text(fixture)).toContain('Nothing here yet');
    });
  }

  it('unwraps { data: [...] }', () => {
    const fixture = render();
    respond(fixture, { data: [{ Id: 1, Title: 'Wrapped' }] });
    expect(titles(fixture)).toEqual(['Wrapped']);
  });

  it('tolerates partial rows and drops rows with no title or that are not objects', () => {
    const fixture = render();
    respond(fixture, [null, 7, { Id: 2 }, { Id: 3, Title: 'Only a title', Category: null, StartDate: null, Urgent: null }]);
    expect(titles(fixture)).toEqual(['Only a title']);
  });

  it('shows the empty state (no crash, no fake data) when the API fails', () => {
    const fixture = render();
    failApi(http, 'Announcements');
    fixture.detectChanges();
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(text(fixture)).toContain('Nothing here yet');
  });
});
