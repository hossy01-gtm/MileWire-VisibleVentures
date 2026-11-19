import { describe, expect, it } from 'vitest';

import { pointFeature } from './mapShapes';

describe('pointFeature', () => {
  it('is GeoJSON, longitude first', () => {
    expect(pointFeature(-79.46, 43.78).geometry.coordinates).toEqual([-79.46, 43.78]);
  });
});
