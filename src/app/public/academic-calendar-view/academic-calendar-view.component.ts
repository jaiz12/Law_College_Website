import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService } from '../../services/api.service';
import { assetUrl, isPdf } from '../../services/cms-row';
import { SafeHtmlPipe } from '../../services/safe-html.pipe';
import { htmlToPlainText } from '../../services/rich-text.util';
import { SiteTitleStrategy } from '../../services/site-title.strategy';
import { PageBannerComponent } from '../../shared/page-banner/page-banner.component';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

interface AcademicCalendarView {
  id: number;
  title: string;
  /** CKEditor rich text from the CMS's Content field. */
  content: string;
  hasContent: boolean;
  fileUrl: string | null;
  isPdf: boolean;
  isActive: boolean;
}

/**
 * Academic Calendar page (CMS Academics > Academic Calendar). The calendar
 * marked Active is the current one: its title, rich text and file. The
 * other calendars are listed under it, newest first, so a calendar added
 * in the CMS shows on the site even before it is made Active. Files open
 * in a new tab on click; nothing is embedded (the college asked for PDFs
 * to simply open).
 */
@Component({
  selector: 'app-academic-calendar-view',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe, PageBannerComponent, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './academic-calendar-view.component.html',
  styleUrl: './academic-calendar-view.component.scss'
})
export class AcademicCalendarViewComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly titleStrategy = inject(SiteTitleStrategy);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  /** The Active calendar, if the CMS has one. */
  calendar: AcademicCalendarView | null = null;
  /** Every other calendar that has something to show, newest first. */
  others: AcademicCalendarView[] = [];
  /** "Academic Calendar 2026-27" when the Active calendar is titled by year. */
  pageTitle = 'Academic Calendar';

  ngOnInit(): void {
    // takeUntilDestroyed: a late response must not retitle the next page.
    this.apiService.GetRequestRows('AcademicCalendar').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: any[]) => {
        const items: AcademicCalendarView[] = data
          .map((item: any) => {
            const content = item.content ?? item.Content ?? '';
            const file = item.file ?? item.File ?? item.filePath ?? item.FilePath ?? null;
            return {
              id: Number(item.id ?? item.Id) || 0,
              title: (item.title ?? item.Title ?? '').trim(),
              content,
              // CKEditor leaves "<p>&nbsp;</p>" in an emptied editor — that's no content.
              hasContent: htmlToPlainText(content).length > 0,
              fileUrl: assetUrl(this.apiService.IMAGE_API_URL, file),
              isPdf: isPdf(file),
              isActive: !!(item.isActive ?? item.IsActive)
            };
          })
          .filter(item => item.fileUrl || item.hasContent)
          .sort((a, b) => b.id - a.id);

        this.calendar = items.find(item => item.isActive) ?? null;
        this.others = items.filter(item => item !== this.calendar);

        const title = this.calendar?.title ?? '';
        this.pageTitle = !title
          ? 'Academic Calendar'
          : /academic\s+calendar/i.test(title) ? title : `Academic Calendar ${title}`;
        this.titleStrategy.setPageTitle(this.pageTitle);
        this.loading = false;
      },
      error: (err) => {
        console.error('Academic Calendar Error:', err);
        this.calendar = null;
        this.others = [];
        this.loading = false;
      }
    });
  }
}
