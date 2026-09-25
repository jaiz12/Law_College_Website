import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface ComingSoonView {
  title: string;
  notFound: boolean;
}

/**
 * Placeholder for any public page that isn't built yet. The heading comes
 * from the route: `data.title` for nav entries (app.routes.ts), or the
 * :title param for the generic pages/:title links. `data.notFound` turns
 * it into the "Page Not Found" page for unknown URLs.
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss'
})
export class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);

  // pages/:title reuses this one component instance across navigations, so
  // a one-time snapshot read would freeze on the first label clicked —
  // read the route reactively instead.
  private readonly view$ = combineLatest([this.route.paramMap, this.route.data]).pipe(
    map(([params, data]): ComingSoonView => ({
      title: data['title'] ?? params.get('title') ?? 'This Page',
      notFound: data['notFound'] === true
    }))
  );

  readonly view = toSignal(this.view$, {
    initialValue: {
      title: this.route.snapshot.data['title'] ?? this.route.snapshot.paramMap.get('title') ?? 'This Page',
      notFound: this.route.snapshot.data['notFound'] === true
    } as ComingSoonView
  });
}
