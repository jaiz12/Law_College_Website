import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';
import { ApiService } from './api.service';

const VISITOR_ID_KEY = 'siteVisitorId';
const LAST_VISIT_KEY = 'siteVisitDate';

/**
 * Site visit counter, backed by Law_College_API's SiteVisit controller:
 *   POST /api/SiteVisit { visitorId }  -> registers one visit per visitor per day
 *   GET  /api/SiteVisit/current        -> [{ VisitYear, VisitMonth, VisitCount }]
 *
 * The count is the current month's, which is all the API offers. If the
 * endpoint is unavailable (not deployed, DB script not run) the count stays
 * null and the footer shows nothing, never a made-up number.
 */
@Injectable({ providedIn: 'root' })
export class SiteVisitService {
  private readonly apiService = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly count = new BehaviorSubject<number | null>(null);
  private started = false;

  readonly monthlyVisitCount$ = this.count.asObservable();

  /** Browser-only; registers today's visit (at most once a day) then loads the count. */
  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.started = true;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyCounted = readStorage(LAST_VISIT_KEY) === today;

    const register$ = alreadyCounted
      ? of(null)
      : this.apiService.PostRequest('SiteVisit', { visitorId: getVisitorId() }).pipe(
          catchError(err => {
            console.error('Site Visit Register Error:', err);
            return of(null);
          })
        );

    register$
      .pipe(
        switchMap(result => {
          if (result) {
            writeStorage(LAST_VISIT_KEY, today);
          }
          return this.apiService.GetRequest('SiteVisit/current');
        })
      )
      .subscribe({
        next: (res: any) => {
          const row = Array.isArray(res) ? res[0] : res;
          const value = Number(row?.visitCount ?? row?.VisitCount);
          this.count.next(Number.isFinite(value) && value >= 0 ? value : null);
        },
        error: (err) => {
          console.error('Site Visit Count Error:', err);
        }
      });
  }
}

function getVisitorId(): string {
  let id = readStorage(VISITOR_ID_KEY);
  if (!id) {
    id = createUuid();
    writeStorage(VISITOR_ID_KEY, id);
  }
  return id;
}

/** crypto.randomUUID only exists in secure (https) contexts. */
function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode etc.) — the server still dedupes per day.
  }
}
