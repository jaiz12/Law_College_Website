<<<<<<< HEAD
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
=======
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';
>>>>>>> master

/**
 * Generic placeholder for any public nav link that doesn't have a real page
 * yet — the page title is whatever label was clicked, passed straight
<<<<<<< HEAD
 * through via the :title route param.
=======
 * through via the :title route param. Carries the same shared header/footer
 * as every other public page.
>>>>>>> master
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
<<<<<<< HEAD
  imports: [RouterModule],
=======
  imports: [SiteHeaderComponent, SiteFooterComponent],
>>>>>>> master
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss'
})
export class ComingSoonComponent {
<<<<<<< HEAD
  readonly title: string;

  constructor(route: ActivatedRoute) {
    this.title = route.snapshot.paramMap.get('title') ?? 'This Page';
  }
=======
  private readonly route = inject(ActivatedRoute);

  // Every submenu link resolves to this exact same route (pages/:title), so
  // Angular reuses this one component instance across navigations instead
  // of re-creating it — a one-time read of route.snapshot in the
  // constructor would freeze on whichever label was clicked first. Reading
  // paramMap as a signal keeps `title` (and the rendered page) in sync with
  // the URL on every subsequent click, not just the first.
  private readonly title$ = this.route.paramMap.pipe(map(params => params.get('title') ?? 'This Page'));
  readonly title = toSignal(this.title$, { initialValue: this.route.snapshot.paramMap.get('title') ?? 'This Page' });
>>>>>>> master
}
