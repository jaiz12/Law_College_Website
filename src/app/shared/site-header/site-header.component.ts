import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, PLATFORM_ID, Renderer2, RendererStyleFlags2, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { SiteBrandingService } from '../../services/site-branding.service';
import { SITE_NAV, SiteNavItem } from '../../services/site-links';

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

  readonly branding$ = this.brandingService.branding$;
  readonly navItems: SiteNavItem[] = SITE_NAV;

  navOpen = false;
  openSubmenuIndex: number | null = null;

  ngOnInit(): void {
    this.brandingService.load();
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
    this.syncNavScrollLock();
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
  }

  @HostListener('window:resize')
  onResize(): void {
    if (isPlatformBrowser(this.platformId) && window.innerWidth > 1320 && this.navOpen) {
      this.closeNav();
    }
  }
}
