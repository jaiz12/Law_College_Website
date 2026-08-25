import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

/**
 * Generic placeholder for any public nav link that doesn't have a real page
 * yet — the page title is whatever label was clicked, passed straight
 * through via the :title route param.
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss'
})
export class ComingSoonComponent {
  readonly title: string;

  constructor(route: ActivatedRoute) {
    this.title = route.snapshot.paramMap.get('title') ?? 'This Page';
  }
}
