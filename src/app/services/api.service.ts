import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { Observable } from 'rxjs';

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
  public UI_URL;

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
    this.UI_URL = this.configService.get('UI_URL') ?? '';
  }

  GetRequest(url: string, params?: unknown): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${url}`, {
      headers: this.getHeaders(),
    });
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
