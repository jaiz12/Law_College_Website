import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Injector, OnInit, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { AnnouncementWithTags } from '../../services/announcement.model';
import { isAbsoluteHttpUrl } from '../../services/url.util';
import { formatStatCount } from '../../services/format.util';
import { assetUrl } from '../../services/cms-row';
import { SITE_PATHS } from '../../services/site-links';
import { SiteBrandingService } from '../../services/site-branding.service';
import { SiteNavService } from '../../services/site-nav.service';
import { RevealDirective } from '../../shared/reveal.directive';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

const ROMAN_NUMERALS: [number, string][] = [
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

/**
 * Counts each `[data-count]` element up from 0 to its number the first
 * time it scrolls into view, keeping any prefix/suffix ("15+" counts 0..15
 * then shows "15+"). Values without a number are left as they are. Skipped
 * entirely when the OS asks for reduced motion.
 */
function countUpWhenVisible(root: HTMLElement): void {
  if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const el = entry.target as HTMLElement;
      const final = el.dataset['count'] ?? '';
      const match = final.match(/^(\D*)([\d,]+)(.*)$/);
      if (!match) continue;
      const [, prefix, digits, suffix] = match;
      const target = Number(digits.replace(/,/g, ''));
      const start = performance.now();
      const duration = 1600;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = t < 1 ? `${prefix}${Math.round(target * eased).toLocaleString('en-IN')}${suffix}` : final;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.4 });
  root.querySelectorAll<HTMLElement>('[data-count]').forEach(el => observer.observe(el));
}

interface WhyChooseUsItem {
  id: number;
  icon: string;
  title: string;
  description: string;
  externalLink: string | null;
}

interface StatisticItem {
  id: number;
  title: string;
  count: string;
}

interface HeroBanner {
  imageUrl: string | null;
  html: string;
}

/**
 * Editors space the banner text with empty paragraphs and trailing
 * "<br>&nbsp;", which gives uneven gaps between title, tagline and
 * description. The hero sets its own spacing, so those blank lines go.
 */
function stripBlankLines(html: string): string {
  const blank = '(?:\\s|&nbsp;|\\u00a0|<br\\s*/?>)*';
  return html
    .replace(new RegExp(`<p[^>]*>${blank}</p>`, 'gi'), '')
    .replace(new RegExp(`(?:<br\\s*/?>)${blank}(</p>)`, 'gi'), '$1')
    .trim();
}

/**
 * Wraps every word under `root` in <span class="hero-word"> with its own
 * animation delay (`--d`), starting at `start` seconds and `step` apart.
 * Only text nodes are split, so the editor's bold/italic/colour markup
 * around the words stays as it is. Returns the delay after the last word.
 */
function splitWords(root: Element, start: number, step: number): number {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  let delay = start;
  for (const node of textNodes) {
    const parts = (node.nodeValue ?? '').split(/(\s+)/);
    if (!parts.some(part => part.trim())) {
      continue;
    }
    const fragment = doc.createDocumentFragment();
    for (const part of parts) {
      if (!part.trim()) {
        if (part) fragment.append(part);
        continue;
      }
      const word = doc.createElement('span');
      word.className = 'hero-word';
      word.style.setProperty('--d', `${delay.toFixed(3)}s`);
      word.textContent = part;
      fragment.append(word);
      delay += step;
    }
    node.replaceWith(fragment);
  }
  return delay;
}

interface OurProgramItem {
  id: number;
  title: string;
  shortDescription: string;
  description: string;
  tint: string;
}


/**
 * Public marketing homepage — served at the app root ('/').
 * Static content, replicating home.pdf. The "Why Choose SGLC?" cards + stats
 * bar come from the backend's Home content API. There is no Login page in
 * this project — a separate project (Law_College_UI) owns the entire
 * login/forgot-password/reset-password flow; the footer's Login link just
 * opens it directly via config.json's CMS_URL.
 *
 * Header and footer are the shared app-site-header / app-site-footer
 * components (src/app/shared) so every public page gets identical site
 * chrome.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe, RevealDirective, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiService = inject(ApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly siteNav = inject(SiteNavService);

  /** Header's branding (logo + plain-text title) for the hero's seal badge. */
  readonly branding$ = inject(SiteBrandingService).branding$;

  /** Exposed for the template so a card with an invalid External Link
   *  doesn't render with a pointer cursor / hover affordance for a click
   *  that onWhyChooseUsCardClick will just ignore. */
  readonly isValidLink = isAbsoluteHttpUrl;
  readonly paths = SITE_PATHS;

  readonly whyChooseUsPageName = 'Why Choose Us';
  whyChooseUsItems: WhyChooseUsItem[] = [];

  readonly statisticsPageName = 'Statistics';
  statisticsItems: StatisticItem[] = [];

  readonly programTints = ['bg-blue-tint', 'bg-green-tint', 'bg-pink-tint'];
  programs: OurProgramItem[] = [];
  selectedProgram: OurProgramItem | null = null;

  /** CMS Banner record whose Page Name is "Home". undefined while loading,
   *  null when there is none (the hero then shows its built-in photo and text). */
  readonly heroBannerPageName = 'Home';
  heroBanner: HeroBanner | null | undefined;

  readonly announcementsToShow = 4;
  announcements: AnnouncementWithTags[] = [];

  ngOnInit(): void {
    this.getHeroBanner();
    this.getWhyChooseUsItems();
    this.getStatisticsItems();
    this.getOurProgramItems();
    this.getAnnouncements();
  }

  /**
   * Hero background image + text from the CMS Banner module (/api/Banner).
   * Was hardcoded before, so a banner uploaded in the CMS never showed up.
   */
  getHeroBanner(): void {
    this.apiService
      .GetRequestRows('Banner')
      .subscribe({
        next: (data: any[]) => {
          const pageName = this.heroBannerPageName.toLowerCase();
          const row = data.find((item: any) =>
            String(item.pageName ?? item.PageName ?? '').trim().toLowerCase() === pageName);

          this.heroBanner = row
            ? {
                imageUrl: assetUrl(this.apiService.IMAGE_API_URL, row.imagePath ?? row.ImagePath ?? row.image ?? row.Image),
                html: stripBlankLines(row.content ?? row.Content ?? '')
              }
            : null;
          this.revealHero();
        },
        error: (err) => {
          this.heroBanner = null;
          this.revealHero();
          console.error('Banner Error:', err);
        }
      });
  }

  /**
   * Starts the hero text entrance once the hero text is in the DOM.
   * afterNextRender only runs in the browser and after hydration, so the
   * words are split exactly once, on the final DOM.
   */
  private revealHero(): void {
    afterNextRender(() => {
      const content = this.host.nativeElement.querySelector<HTMLElement>('.hero-content');
      if (!content || content.classList.contains('is-ready')) {
        return;
      }

      // Title words come in slowest, the long description fastest, so the
      // whole entrance takes about a second whatever the CMS text is.
      const blocks = Array.from(
        content.querySelector('.hero-text')?.children ?? content.querySelectorAll('h1, .hero-sub, .hero-desc'));
      const steps = [0.07, 0.035, 0.012];
      let delay = 0.15;
      blocks.forEach((block, i) => {
        delay = splitWords(block, delay, steps[Math.min(i, steps.length - 1)]) + 0.1;
      });

      content.style.setProperty('--hero-actions-delay', `${delay.toFixed(3)}s`);
      content.classList.add('is-ready');
    }, { injector: this.injector });
  }

  /** CSS background-image for the hero; quotes/backslashes are escaped so
   *  the stored path can't break out of url("..."). */
  heroBackground(url: string | null | undefined): string | null {
    return url ? `url("${url.replace(/["\\]/g, encodeURIComponent)}")` : null;
  }

  getWhyChooseUsItems(): void {
    this.apiService
      .GetRequestRows('Home/' + this.whyChooseUsPageName)
      .subscribe({
        next: (data: any[]) => {

          this.whyChooseUsItems = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              icon: item.icon ?? item.Icon ?? '',
              title: item.title ?? item.Title ?? '',
              description: item.description ?? item.Description ?? '',
              externalLink: item.externalLink ?? item.ExternalLink ?? null
            }))
            // Bug Report row 41: newest-added should show first here too,
            // same as the CMS admin list — was sorted oldest-first, so a
            // freshly-added card never appeared "at the top" on the site.
            .sort((a: { id: number }, b: { id: number }) => b.id - a.id);
        },
        error: (err) => {
          console.error('Why Choose Us Error:', err);
        }
      });
  }

  onWhyChooseUsCardClick(item: WhyChooseUsItem): void {
    // Bug Report row 38: an invalid/malformed External Link was silently
    // redirecting the visitor to the Home page (window.open resolves a
    // non-absolute string as a path relative to the current page) instead
    // of doing nothing for a link that was never usable in the first place.
    if (!isAbsoluteHttpUrl(item.externalLink) || !isPlatformBrowser(this.platformId)) {
      return;
    }

    window.open(item.externalLink!, '_blank', 'noopener');
  }

  getStatisticsItems(): void {
    this.apiService
      .GetRequestRows('Home/' + this.statisticsPageName)
      .subscribe({
        next: (data: any[]) => {

          this.statisticsItems = data
            .map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              // CMS editors enter a plain number; the "+" is presentation.
              count: formatStatCount(item.count ?? item.Count)
            }))
            // A stat with no number would render as a bare label.
            .filter((item: StatisticItem) => item.count && item.title)
            // Bug Report row 45: same newest-first fix as Why Choose Us.
            .sort((a: { id: number }, b: { id: number }) => b.id - a.id);
          afterNextRender(() => countUpWhenVisible(this.host.nativeElement), { injector: this.injector });
        },
        error: (err) => {
          console.error('Statistics Error:', err);
        }
      });
  }

  getOurProgramItems(): void {
    this.apiService
      .GetRequestRows('OurProgram')
      .subscribe({
        next: (data: any[]) => {
          this.programs = data
            .map((item: any): Omit<OurProgramItem, 'tint'> => ({
              id: item.id ?? item.Id ?? 0,
              title: item.title ?? item.Title ?? '',
              shortDescription: item.shortDescription ?? item.ShortDescription ?? '',
              description: item.description ?? item.Description ?? ''
            }))
            // Bug Report row 64: same newest-first fix as Why Choose Us.
            .sort((a, b) => b.id - a.id)
            .map((item, index): OurProgramItem => ({
              ...item,
              tint: this.programTints[index % this.programTints.length]
            }));
        },
        error: (err) => {
          console.error('Our Program Error:', err);
        }
      });
  }

  /**
   * "Latest Announcements" — CMS's News & Events > Announcements module
   * (Law_College_API's /api/Announcements, GetAllIsActive — same backend as
   * everything else on this page, already newest-first). Homepage only
   * shows the latest few; "View All" opens the full Announcements page.
   */
  getAnnouncements(): void {
    // Shared with the header ticker, so the page makes one request for both.
    this.siteNav.announcements$.subscribe(items => {
      this.announcements = items.slice(0, this.announcementsToShow);
    });
  }

  toggleProgramDetails(program: OurProgramItem): void {
    this.selectedProgram = this.selectedProgram === program ? null : program;
  }

  /** Program card index marker: 1 -> "I", 4 -> "IV". */
  romanNumeral(value: number): string {
    let rest = value;
    let out = '';
    for (const [n, numeral] of ROMAN_NUMERALS) {
      while (rest >= n) {
        out += numeral;
        rest -= n;
      }
    }
    return out || String(value);
  }
}
