import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SiteHeaderComponent } from './site-header.component';
import { provideTestConfig, provideTestHttp } from '../../testing/test-providers';

@Component({ standalone: true, imports: [SiteHeaderComponent], template: '<app-site-header></app-site-header>' })
class PageWithHeader {}

describe('SiteHeaderComponent navigation state', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: PageWithHeader }]),
        provideTestHttp(),
        provideTestConfig()
      ]
    });
    harness = await RouterTestingHarness.create();
  });

  const nav = () => (harness.routeNativeElement as HTMLElement).querySelector('#mainNav')!;
  /** Labels of top-level items / submenu links currently marked active. */
  const activeTopLevel = () => [...nav().querySelectorAll(':scope > div > ul > li')]
    .filter(li => li.classList.contains('active') || li.querySelector(':scope > a.active'))
    .map(li => li.querySelector(':scope > a')!.textContent!.trim());
  const activeLinks = () => [...nav().querySelectorAll('.sub-nav a.active')].map(a => a.textContent!.trim());

  it('marks only Home active on the home route', async () => {
    await harness.navigateByUrl('/');
    harness.detectChanges();
    expect(activeTopLevel()).toEqual(['Home']);
  });

  it('highlights the open page and its parent section, not Home', async () => {
    await harness.navigateByUrl('/student-life/library');
    harness.detectChanges();
    expect(activeTopLevel()).toEqual(['Student Life']);
    expect(activeLinks()).toEqual(['Library']);
  });

  it('links nav items to the real pages, not /pages/<label>', async () => {
    await harness.navigateByUrl('/');
    const hrefs = [...nav().querySelectorAll('.sub-nav a')].map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/academics/academic-calendar');
    expect(hrefs).toContain('/student-life/library');
    expect(hrefs).toContain('/committee-and-cell/legal-aid-cell');
    expect(hrefs).toContain('/news-events/announcements');
    expect(hrefs).toContain('/news-events/news-events-archives');
    expect(hrefs.filter(h => h?.startsWith('/pages/'))).toEqual([]);
    expect(hrefs.filter(h => h?.includes('%2F'))).toEqual([]);
  });
});
