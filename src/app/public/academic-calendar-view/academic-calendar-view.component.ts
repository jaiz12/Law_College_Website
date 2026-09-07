import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ApiService } from '../../services/api.service';

interface AcademicCalendarView {
  title: string;
  file: string | null;
  isActive: boolean;
}

const PDF_EXTENSIONS = ['.pdf'];

/**
 * Public "just the calendar" page — opened in a new tab from the homepage's
 * Quick Access "Academic Calendar" card. Shows the currently active
 * calendar (set via the CMS, a separate project) full-screen as an image
 * or embedded PDF, no title/chrome.
 */
@Component({
  selector: 'app-academic-calendar-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './academic-calendar-view.component.html',
  styleUrl: './academic-calendar-view.component.scss'
})
export class AcademicCalendarViewComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly imageBaseUrl = this.apiService.IMAGE_API_URL;

  loading = true;
  calendar: AcademicCalendarView | null = null;
  fileUrl: string | null = null;
  safeFileUrl: SafeResourceUrl | null = null;
  isPdf = false;

  ngOnInit(): void {
    this.apiService.GetRequest('AcademicCalendar').subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

        const items: AcademicCalendarView[] = data.map((item: any) => ({
          title: item.title ?? item.Title ?? '',
          file: item.file ?? item.File ?? item.filePath ?? item.FilePath ?? null,
          isActive: item.isActive ?? item.IsActive ?? false
        }));

        // Bug Report rows 73/78/79: falling back to items[0] (or a bundled
        // placeholder PDF) whenever nothing is marked Active meant the page
        // always showed *something* — the wrong calendar after the active
        // one was deleted, or a generic PDF when the CMS had none at all.
        // Only ever show a calendar the CMS explicitly marked Active; no
        // active calendar means the empty state below, not a guess.
        this.calendar = items.find(item => item.isActive) ?? null;

        if (this.calendar?.file) {
          this.fileUrl = this.imageBaseUrl + this.calendar.file;
          this.isPdf = PDF_EXTENSIONS.some(ext => this.calendar!.file!.toLowerCase().endsWith(ext));
          this.safeFileUrl = this.isPdf
            ? this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl)
            : null;
        } else {
          this.fileUrl = null;
          this.safeFileUrl = null;
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Academic Calendar Error:', err);
        this.calendar = null;
        this.fileUrl = null;
        this.safeFileUrl = null;
        this.loading = false;
      }
    });
  }
}
