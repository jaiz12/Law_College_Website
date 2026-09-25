import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigService } from '../services/config.service';

export const TEST_API_URL = 'https://api.test/api';
export const TEST_IMAGE_URL = 'https://api.test/';

/** Stand-in for public/config.json. Pass the keys a test needs; omit a
 *  key to simulate it missing from the deployed config. */
export function provideTestConfig(config: Record<string, unknown> = {}): Provider {
  const values: Record<string, unknown> = { API_URL: TEST_API_URL, IMAGE_API_URL: TEST_IMAGE_URL, ...config };
  return { provide: ConfigService, useValue: { get: (key: string) => values[key], loadConfig: async () => undefined } };
}

export function provideTestHttp(): (Provider | EnvironmentProviders)[] {
  return [provideHttpClient(), provideHttpClientTesting()];
}

/** The pending request for an API path (e.g. 'HeaderAndFooter/0/College Map'). */
export function expectApi(http: HttpTestingController, path: string): TestRequest {
  return http.expectOne(req => req.url === `${TEST_API_URL}/${path}`);
}

/** Answers every still-pending request to `path` (a page may render the
 *  same shared component more than once). */
export function flushApi(http: HttpTestingController, path: string, body: unknown): void {
  http.match(req => req.url === `${TEST_API_URL}/${path}`).forEach(req => req.flush(body as any));
}

export function failApi(http: HttpTestingController, path: string, status = 500): void {
  http.match(req => req.url === `${TEST_API_URL}/${path}`)
    .forEach(req => req.flush('error', { status, statusText: 'Error' }));
}
