import type { MapRecord } from '@shared/map';

export type Point = { x: number; y: number };
export type Viewport = { x: number; y: number; width: number; height: number };

type ViewportBounds = Pick<MapRecord, 'canvasWidth' | 'canvasHeight'>;

export const MIN_VIEWPORT_SIZE = 500;

export function clampViewport(viewport: Viewport, map: ViewportBounds): Viewport {
  const width = Math.max(MIN_VIEWPORT_SIZE, Math.min(viewport.width, map.canvasWidth));
  const height = Math.max(MIN_VIEWPORT_SIZE, Math.min(viewport.height, map.canvasHeight));
  const x = Math.max(0, Math.min(viewport.x, Math.max(0, map.canvasWidth - width)));
  const y = Math.max(0, Math.min(viewport.y, Math.max(0, map.canvasHeight - height)));

  return { x, y, width, height };
}

export function createFullViewport(map: ViewportBounds): Viewport {
  return {
    x: 0,
    y: 0,
    width: map.canvasWidth,
    height: map.canvasHeight,
  };
}

export function centerViewportOn(map: ViewportBounds, point: Point, current: Viewport): Viewport {
  return clampViewport(
    {
      x: point.x - current.width / 2,
      y: point.y - current.height / 2,
      width: current.width,
      height: current.height,
    },
    map,
  );
}

export function zoomViewportAt(
  viewport: Viewport,
  map: ViewportBounds,
  multiplier: number,
  focusPoint?: Point,
): Viewport {
  const nextWidth = viewport.width * multiplier;
  const nextHeight = viewport.height * multiplier;

  if (!focusPoint) {
    return clampViewport(
      {
        x: viewport.x + (viewport.width - nextWidth) / 2,
        y: viewport.y + (viewport.height - nextHeight) / 2,
        width: nextWidth,
        height: nextHeight,
      },
      map,
    );
  }

  const focusRatioX = (focusPoint.x - viewport.x) / viewport.width;
  const focusRatioY = (focusPoint.y - viewport.y) / viewport.height;

  return clampViewport(
    {
      x: focusPoint.x - nextWidth * focusRatioX,
      y: focusPoint.y - nextHeight * focusRatioY,
      width: nextWidth,
      height: nextHeight,
    },
    map,
  );
}
