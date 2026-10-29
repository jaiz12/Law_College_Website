import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, OnInit, PLATFORM_ID, Renderer2, RendererStyleFlags2, afterNextRender, inject } from '@angular/core';
import { IsActiveMatchOptions, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { SiteBrandingService } from '../../services/site-branding.service';
import { SITE_PATHS, SiteNavItem } from '../../services/site-links';
import { SiteNavService } from '../../services/site-nav.service';

const SECTION_MATCH: IsActiveMatchOptions = {
  paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored'
};

/** An item's own path plus every path in its submenu and flyouts. */
function navPaths(item: SiteNavItem): string[] {
  return [item.path, ...(item.children ?? []).flatMap(navPaths)];
}

/**
 * Shared site header — logo/title + primary nav. Used on every public page
 * so the site chrome stays identical everywhere. Branding comes from the
 * shared SiteBrandingService (one CMS request for header, footer and tab
 * title); nav structure and paths come from site-links.ts.
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss'
})
export class SiteHeaderComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly brandingService = inject(SiteBrandingService);
  private readonly siteNav = inject(SiteNavService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly branding$ = this.brandingService.branding$;
  /** SITE_NAV plus CMS-driven third-level entries (e.g. Statutory Bodies > IQAC). */
  readonly navItems$ = this.siteNav.nav$;
  readonly tickerItems$ = this.siteNav.announcements$.pipe(map(items => items.slice(0, 8)));
  readonly paths = SITE_PATHS;

  navOpen = false;
  openSubmenuIndex: number | null = null;
  /** Path of the submenu entry whose third level is open by click/tap. */
  openFlyoutPath: string | null = null;
  /** Page scrolled past the ticker — header gains its shadow. */
  scrolled = false;

  constructor() {
    afterNextRender(() => {
      const host = this.host.nativeElement;
      const observer = new ResizeObserver(() => this.syncStickyOffset());
      observer.observe(host);
      this.destroyRef.onDestroy(() => observer.disconnect());
      this.syncStickyOffset();
    });
  }

  ngOnInit(): void {
    this.brandingService.load();
  }

  /** The header is sticky with a negative top, so the ticker and brand row
   *  scroll away and only the nav bar stays pinned. On mobile the menu
   *  button lives in the brand row, so there only the ticker scrolls away.
   *  Measured, since the ticker and a wrapped CMS title vary in height. */
  private syncStickyOffset(): void {
    const host = this.host.nativeElement;
    const pinned: HTMLElement | null = host.querySelector(this.isDesktopNav ? '.main-nav' : '.header-top');
    const offset = pinned ? pinned.offsetTop : 0;
    this.renderer.setStyle(host, '--sticky-top', `${-offset}px`, RendererStyleFlags2.DashCase);
  }

  toggleNav(): void {
    this.navOpen = !this.navOpen;
    if (!this.navOpen) this.openSubmenuIndex = null;
    if (this.navOpen) this.alignDrawerToHeader();
    this.syncNavScrollLock();
  }

  /** Mobile drawer is position:fixed; start it at the header's real bottom
   *  edge (a wrapped multi-line CMS title makes the header taller). */
  private alignDrawerToHeader(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const header: HTMLElement | null = this.host.nativeElement.querySelector('.site-header');
    if (header) {
      this.renderer.setStyle(this.host.nativeElement, '--drawer-top',
        `${Math.max(0, Math.round(header.getBoundingClientRect().bottom))}px`, RendererStyleFlags2.DashCase);
    }
  }

  closeNav(): void {
    this.navOpen = false;
    this.openSubmenuIndex = null;
    this.openFlyoutPath = null;
    this.syncNavScrollLock();
  }

  /** Third-level toggle. Desktop also opens it on hover/focus; the button
   *  makes it reachable by click, tap and keyboard. */
  toggleFlyout(path: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openFlyoutPath = this.openFlyoutPath === path ? null : path;
  }

  /** Section (or any page under it) open. Not routerLinkActive on the <li>:
   *  submenu links render from the #subLink template, outside the <li>'s
   *  content, so its RouterLink query can't see them. */
  isSectionActive(item: SiteNavItem): boolean {
    return navPaths(item).some(path => this.router.isActive('/' + path, SECTION_MATCH));
  }

  /** Splits a long submenu into 2 columns of real, independent <ul>s (see
   *  .sub-nav-cols) — first half in column 1, second half in column 2, in
   *  source order. Plain array slicing rather than CSS grid/multi-column:
   *  those either balance by height (uneven item counts per column) or
   *  sync row heights across columns (one column's wrapped label leaves a
   *  gap in the other) — neither of which a fixed nav-label list needs. */
  subNavColumns(item: SiteNavItem): SiteNavItem[][] {
    const items = item.children ?? [];
    const half = Math.ceil(items.length / 2);
    return [items.slice(0, half), items.slice(half)];
  }

  /** Drawer is position:absolute under the header — lock body scroll
   *  behind it while open, since the drawer itself can't own the scroll. */
  private syncNavScrollLock(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.navOpen) {
      this.renderer.addClass(this.document.documentElement, 'nav-drawer-open');
    } else {
      this.renderer.removeClass(this.document.documentElement, 'nav-drawer-open');
    }
  }

  /**
   * Desktop (>1320px): CSS :hover reveals the submenu, and the parent link
   * itself is a real [routerLink] — clicking it navigates.
   * Mobile (<=1320px): there's no hover, so the parent link is disabled
   * (bound to null in the template) and this click only expands/collapses
   * the submenu accordion instead.
   */
  get isDesktopNav(): boolean {
    return !isPlatformBrowser(this.platformId) || window.innerWidth > 1320;
  }

  toggleSubmenu(index: number, event: Event): void {
    if (this.isDesktopNav) {
      return;
    }
    event.preventDefault();
    this.openSubmenuIndex = this.openSubmenuIndex === index ? null : index;
    this.openFlyoutPath = null;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled = window.scrollY > 40;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openFlyoutPath = null;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId) && window.innerWidth > 1320 && this.navOpen) {
      this.closeNav();
    }
  }
}
