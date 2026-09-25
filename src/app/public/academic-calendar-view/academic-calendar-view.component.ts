import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ApiService } from '../../services/api.service';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { htmlToPlainText } from '../../services/rich-text.util';
import { SiteTitleStrategy } from '../../services/site-title.strategy';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface AcademicCalendarView {
  title: string;
  /** CKEditor rich text from the CMS's Content field. */
  content: string;
  file: string | null;
  isActive: boolean;
}

const PDF_EXTENSIONS = ['.pdf'];

/**
 * Academic Calendar page — shows the calendar marked Active in the CMS
 * (Academics > Academic Calendar): its title, rich-text content and the
 * uploaded image/PDF.
 */
@Component({
  selector: 'app-academic-calendar-view',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './academic-calendar-view.component.html',
  styleUrl: './academic-calendar-view.component.scss'
})
export class AcademicCalendarViewComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly titleStrategy = inject(SiteTitleStrategy);
  private readonly destroyRef = inject(DestroyRef);

  readonly imageBaseUrl = this.apiService.IMAGE_API_URL;

  loading = true;
  calendar: AcademicCalendarView | null = null;
  hasContent = false;
  fileUrl: string | null = null;
  safeFileUrl: SafeResourceUrl | null = null;
  isPdf = false;

  ngOnInit(): void {
    // takeUntilDestroyed: a late response must not retitle the next page.
    this.apiService.GetRequestRows('AcademicCalendar').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: any[]) => {
        const items: AcademicCalendarView[] = data.map((item: any) => ({
          title: item.title ?? item.Title ?? '',
          content: item.content ?? item.Content ?? '',
          file: item.file ?? item.File ?? item.filePath ?? item.FilePath ?? null,
          isActive: item.isActive ?? item.IsActive ?? false
        }));

        // Only ever show a calendar the CMS explicitly marked Active; no
        // active calendar means the empty state, not a guess.
        this.calendar = items.find(item => item.isActive) ?? null;
        // CKEditor leaves "<p>&nbsp;</p>" in an emptied editor — that's no content.
        this.hasContent = htmlToPlainText(this.calendar?.content).length > 0;

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

        this.titleStrategy.setPageTitle(this.calendar?.title);
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
