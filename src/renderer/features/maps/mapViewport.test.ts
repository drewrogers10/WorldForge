import { describe, expect, it } from 'vitest';
import {
  MIN_VIEWPORT_SIZE,
  centerViewportOn,
  clampViewport,
  createFullViewport,
  zoomViewportAt,
  type Viewport,
} from './mapViewport';

const map = {
  canvasWidth: 10_000,
  canvasHeight: 8_000,
};

describe('mapViewport', () => {
  it('creates a full-map viewport', () => {
    expect(createFullViewport(map)).toEqual({
      x: 0,
      y: 0,
      width: 10_000,
      height: 8_000,
    });
  });

  it('clamps viewport size and position within map bounds', () => {
    expect(
      clampViewport(
        {
          x: -120,
          y: 7_900,
          width: 100,
          height: 9_000,
        },
        map,
      ),
    ).toEqual({
      x: 0,
      y: 0,
      width: MIN_VIEWPORT_SIZE,
      height: 8_000,
    });
  });

  it('centers a viewport around a point and clamps near the map edge', () => {
    const current: Viewport = {
      x: 2_000,
      y: 2_000,
      width: 1_500,
      height: 1_500,
    };

    expect(centerViewportOn(map, { x: 400, y: 500 }, current)).toEqual({
      x: 0,
      y: 0,
      width: 1_500,
      height: 1_500,
    });
  });

  it('zooms around the viewport center when no focus point is provided', () => {
    const current: Viewport = {
      x: 1_000,
      y: 2_000,
      width: 2_000,
      height: 2_000,
    };

    expect(zoomViewportAt(current, map, 0.5)).toEqual({
      x: 1_500,
      y: 2_500,
      width: 1_000,
      height: 1_000,
    });
  });

  it('keeps cursor-focused zoom anchored under the same map point', () => {
    const current: Viewport = {
      x: 0,
      y: 0,
      width: 1_000,
      height: 1_000,
    };

    expect(zoomViewportAt(current, map, 0.5, { x: 750, y: 250 })).toEqual({
      x: 375,
      y: 125,
      width: MIN_VIEWPORT_SIZE,
      height: MIN_VIEWPORT_SIZE,
    });
  });

  it('caps zooming out at the full map bounds', () => {
    const current: Viewport = {
      x: 2_000,
      y: 1_500,
      width: 1_000,
      height: 1_000,
    };

    expect(zoomViewportAt(current, map, 20)).toEqual({
      x: 0,
      y: 0,
      width: 10_000,
      height: 8_000,
    });
  });
});
