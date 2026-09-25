import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteVisitService } from './services/site-visit.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly siteVisitService = inject(SiteVisitService);

  ngOnInit(): void {
    // Once per app load (browser only) — not per page component.
    this.siteVisitService.start();
  }
}
