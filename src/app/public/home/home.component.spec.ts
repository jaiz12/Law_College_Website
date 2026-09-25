import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { HomeComponent } from './home.component';
import { failApi, flushApi, provideTestConfig, provideTestHttp } from '../../testing/test-providers';

describe('HomeComponent', () => {
  let http: HttpTestingController;

  function render() {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideTestHttp(), provideTestConfig()]
    });
    const fixture = TestBed.createComponent(HomeComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }
  const el = (fixture: ReturnType<typeof render>) => fixture.nativeElement as HTMLElement;

  it('renders latest announcements that share a title without duplicate-key tracking', () => {
    const warn = spyOn(console, 'warn').and.callThrough();
    const fixture = render();
    flushApi(http, 'Announcements', [
      { Id: 11, Title: 'Same Title', Category: 'Exam' },
      { Id: 12, Title: 'Same Title', Category: 'Exam' }
    ]);
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('.announce-card').length).toBe(2);
    expect(warn.calls.allArgs().flat().join(' ')).not.toContain('NG0955');
  });

  it('formats stat counts: adds "+" to plain numbers, keeps 100+ and A+, hides empty counts', () => {
    const fixture = render();
    flushApi(http, 'Home/Statistics', [
      { Id: 1, Title: 'Students', Count: '100' },
      { Id: 2, Title: 'Faculty', Count: '25+' },
      { Id: 3, Title: 'Grade', Count: 'A+' },
      { Id: 4, Title: 'Empty', Count: null },
      { Id: 5, Title: null, Count: '7' }
    ]);
    fixture.detectChanges();
    const stats = Array.from(el(fixture).querySelectorAll('.stat')).map(s =>
      [s.querySelector('.stat-num')!.textContent, s.querySelector('.stat-label')!.textContent]);
    expect(stats).toEqual([['A+', 'Grade'], ['25+', 'Faculty'], ['100+', 'Students']]);
  });

  it('renders program descriptions through the sanitizer (hostile markup removed, formatting kept)', () => {
    const fixture = render();
    flushApi(http, 'OurProgram', [{
      Id: 1, Title: 'BA LLB', ShortDescription: 'x',
      Description: '<p style="color:#e03e2d;" onclick="alert(1)">ok</p><img src=x onerror="alert(2)"><script>alert(3)</script><a href="javascript:alert(4)">j</a>'
    }]);
    fixture.detectChanges();
    (el(fixture).querySelector('.learn-more') as HTMLButtonElement).click();
    fixture.detectChanges();
    const description = el(fixture).querySelector('.program-full-description')!;
    expect(description.innerHTML).not.toMatch(/onclick|onerror|<script|<img|javascript:/i);
    expect(description.querySelector('p')?.getAttribute('style')).toBe('color:#e03e2d');
  });

  it('survives every home API failing (no crash, no fake data)', () => {
    const fixture = render();
    for (const path of ['Home/Why Choose Us', 'Home/Statistics', 'OurProgram', 'Announcements']) {
      failApi(http, path);
    }
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('.card, .stat, .program-card, .announce-card').length).toBe(0);
  });
});
