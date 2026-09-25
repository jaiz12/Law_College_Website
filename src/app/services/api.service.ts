import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { Observable, map } from 'rxjs';

/**
 * Generic HTTP client for the public site's read-only calls against the
 * backend API (Law_College_API) — e.g. Home/Why Choose Us, Statistics,
 * OurProgram, AcademicCalendar. No authentication here by design: this
 * project has no login/forgot-password/reset-password flow of its own —
 * that lives entirely in the CMS (Law_College_UI), a separate project.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {

  private API_URL;
  public IMAGE_API_URL;
  /** CMS (Law_College_UI) base URL — the footer Login link. Deliberately
   *  its own key: in the CMS's config, "UI_URL" means this public
   *  website, so reusing that name here pointed Login back at the website. */
  public CMS_URL: string;

  private getHeaders(isFormData: boolean = false): HttpHeaders {
    let headers = new HttpHeaders();
    isFormData
      ? headers.set('Content-Type', 'multipart/form-data')
      : headers.set('Content-Type', 'application/json');

    return headers;
  }

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.API_URL = this.configService.get('API_URL');
    this.IMAGE_API_URL = this.configService.get('IMAGE_API_URL');
    this.CMS_URL = this.configService.get('CMS_URL') ?? '';
  }

  GetRequest(url: string, params?: unknown): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${url}`, {
      headers: this.getHeaders(),
    });
  }

  /** GET for list endpoints: the API returns a serialized DataTable (a
   *  bare array), occasionally wrapped as { data: [...] } — always yields
   *  an array of row objects. Any other shape ({}, null, a string, null
   *  rows) becomes "no rows" instead of crashing the page's mapping code. */
  GetRequestRows(url: string): Observable<any[]> {
    return this.GetRequest(url).pipe(
      map(res => Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []),
      map((rows: unknown[]) => rows.filter(row => row !== null && typeof row === 'object'))
    );
  }

  PostRequest(
    url: string,
    data: any,
    isFormData: boolean = false
  ): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${url}`, data, {
      headers: this.getHeaders(isFormData),
    });
  }
}
