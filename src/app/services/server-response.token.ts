import { InjectionToken } from '@angular/core';

/** The minimal slice of Express's Response the app needs. */
export interface ServerResponseLike {
  status(code: number): unknown;
}

/**
 * Provided by server.ts for each SSR request so a page can set the HTTP
 * status (e.g. 404 for Page Not Found). Not provided in the browser —
 * inject it with `{ optional: true }`.
 */
export const SERVER_RESPONSE = new InjectionToken<ServerResponseLike>('SERVER_RESPONSE');
