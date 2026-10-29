import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';

/**
 * Fades/slides an element in the first time it scrolls into view (styles:
 * `.reveal` in styles.scss). Browser only — on the server nothing is
 * hidden, so the page is complete without JavaScript. `appReveal` takes
 * an optional delay in seconds for staggering cards in a row.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;

  @Input() appReveal: number | string | null | undefined = 0;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const el = this.host.nativeElement;
    const delay = Number(this.appReveal) || 0;
    if (delay) {
      el.style.setProperty('--reveal-delay', `${delay}s`);
    }
    el.classList.add('reveal');

    this.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        el.classList.add('is-revealed');
        this.observer?.disconnect();
        this.observer = null;
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
