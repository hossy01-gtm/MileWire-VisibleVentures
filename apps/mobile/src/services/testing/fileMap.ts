/**
 * Testing assets file map.
 *
 * Metro needs static `require()` calls, so every GPX the manifest can reference
 * is registered here. Keys must match `gpx_file` in
 * `test-assets/developer/manifest.json` EXACTLY (a unit test enforces it).
 *
 * Adding a GPX: drop it under `test-assets/developer/gpx-files/`, add a
 * `require()` line below, then add a manifest entry.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- Metro needs static require() */

export const testingFiles: Record<string, any> = {};

if (__DEV__) {
  testingFiles['gpx-files/fisherville-to-fit4less.gpx'] = require('../../../test-assets/developer/gpx-files/fisherville-to-fit4less.gpx');
}
