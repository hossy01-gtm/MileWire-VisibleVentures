/// <reference types="node" />
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseGpx } from './gpxParser';
import { buildRoute } from './routePlayback';
import { parseTestConfig } from './testConfigLoader';
import type { TestManifest } from './types';

const ROOT = resolve(__dirname, '../../..');
const ASSETS = resolve(ROOT, 'test-assets/developer');
const manifest = JSON.parse(readFileSync(resolve(ASSETS, 'manifest.json'), 'utf8')) as TestManifest;
const fileMap = readFileSync(resolve(__dirname, 'fileMap.ts'), 'utf8');
const template = JSON.parse(readFileSync(resolve(__dirname, 'templates/testing.developer.json'), 'utf8'));

const gpxOnDisk = readdirSync(resolve(ASSETS, 'gpx-files'))
  .filter((f) => f.endsWith('.gpx'))
  .map((f) => `gpx-files/${f}`);

describe('test assets', () => {
  it('has unique objective names', () => {
    const names = manifest.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('points every objective at a GPX that exists and is registered in fileMap.ts', () => {
    for (const entry of manifest) {
      expect(existsSync(resolve(ASSETS, entry.gpx_file)), `${entry.name}: ${entry.gpx_file} missing`).toBe(true);
      expect(fileMap, `${entry.gpx_file} not in fileMap.ts`).toContain(`'${entry.gpx_file}'`);
    }
  });

  it('registers every GPX on disk in the manifest and in fileMap.ts', () => {
    const referenced = new Set(manifest.map((e) => e.gpx_file));
    for (const file of gpxOnDisk) {
      expect(referenced.has(file), `${file} has no manifest objective`).toBe(true);
      expect(fileMap).toContain(`'${file}'`);
    }
  });

  it('keeps fileMap.ts free of stale entries', () => {
    for (const [, key] of fileMap.matchAll(/testingFiles\[\s*'([^']+)'\s*\]/g)) {
      expect(gpxOnDisk, `${key} is in fileMap.ts but not on disk`).toContain(key);
    }
  });

  it('every GPX parses into a drivable route', () => {
    for (const file of gpxOnDisk) {
      const route = buildRoute(parseGpx(readFileSync(resolve(ASSETS, file), 'utf8')));
      expect(route, `${file} has no drivable route`).not.toBeNull();
      expect(route!.totalM).toBeGreaterThan(100);
    }
  });

  it('the tracked template is disabled and only lists real objectives', () => {
    expect(parseTestConfig(template).enabled).toBe(false);
    const names = new Set(manifest.map((e) => e.name));
    for (const objective of template.objectives) expect(names.has(objective), objective).toBe(true);
  });
});
