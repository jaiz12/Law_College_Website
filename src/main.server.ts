import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Dev-only: the backend's HTTPS cert is self-signed, and Node's HTTP client
 * (unlike a browser you've run `dotnet dev-certs https --trust` in) rejects
 * it outright, so every SSR-side API call fails with a TLS handshake error
 * ("status: 0, Unknown Error") even though the same call succeeds fine
 * client-side after hydration. config.json's `ssrIgnoresSsl` flag opts SSR
 * requests out of certificate verification to fix that.
 *
 * This flips Node's TLS verification off for the *entire process*, not just
 * this one request — acceptable for a local dev server talking to a local
 * self-signed API, but NEVER set `ssrIgnoresSsl: true` in a real/production
 * config.json.
 */
function applySsrSslBypass(): void {
  // process.cwd() is the project root in both cases this runs from:
  // `ng serve` (dev SSR) and `node dist/law-college-website/server/server.mjs`
  // (production, started via the `serve:ssr:*` npm script from the root).
  const candidates = [
    join(process.cwd(), 'public', 'config.json'),
    join(process.cwd(), 'dist', 'law-college-website', 'browser', 'config.json')
  ];

  const configPath = candidates.find(path => existsSync(path));
  if (!configPath) {
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (parsed?.ssrIgnoresSsl) {
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    }
  } catch {
    // Malformed/unreadable config.json — fall back to Node's default
    // (secure) TLS behavior rather than crashing SSR bootstrap over it.
  }
}

applySsrSslBypass();

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(AppComponent, config, context);

export default bootstrap;
