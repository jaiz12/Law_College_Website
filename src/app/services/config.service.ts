import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private config: any;

  constructor(private http: HttpClient) { }

  /** Runtime config (public/config.json, replaced per environment at deploy
   *  time). A missing/unreadable file is logged instead of failing app
   *  bootstrap, so the site still renders its static parts. */
  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(
        this.http.get('/config.json')
      );
    } catch (err) {
      console.error('Config load error:', err);
      this.config = {};
    }
  }

  get(path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }
}
