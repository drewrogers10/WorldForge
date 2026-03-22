import type { MapRecord } from '@shared/map';
import type { Viewport } from './mapViewport';

type MapCanvasBounds = Pick<MapRecord, 'canvasWidth' | 'canvasHeight'>;
type ViewportBounds = Pick<Viewport, 'width' | 'height'>;

export const FEATURE_MARKER_STROKE_WIDTH = 80;
export const FEATURE_LABEL_FONT_SIZE = 220;
export const FEATURE_LABEL_STROKE_WIDTH = 45;
export const FEATURE_LABEL_Y_OFFSET = 180;
export const FEATURE_HANDLE_RADIUS = 180;
export const FEATURE_HANDLE_STROKE_WIDTH = 60;
export const ANCHOR_RADIUS = 160;
export const ANCHOR_STROKE_WIDTH = 70;
export const ANCHOR_LABEL_FONT_SIZE = 180;
export const ANCHOR_LABEL_STROKE_WIDTH = 40;
export const ANCHOR_LABEL_X_OFFSET = 180;
export const ANCHOR_LABEL_Y_OFFSET = 180;
export const DRAFT_STROKE_WIDTH = 90;
export const DRAFT_POINT_RADIUS = 120;

export function getOverlayScale(viewport: ViewportBounds, map: MapCanvasBounds): number {
  return viewport.width / map.canvasWidth;
}

export function scaleOverlayLength(
  baseLength: number,
  viewport: ViewportBounds,
  map: MapCanvasBounds,
): number {
  return baseLength * getOverlayScale(viewport, map);
}

export function getFeatureStrokeWidth(
  baseStrokeWidth: number,
  viewport: ViewportBounds,
  map: MapCanvasBounds,
): number {
  return scaleOverlayLength(baseStrokeWidth, viewport, map);
}

export function getFeatureMarkerMetrics(
  baseRadius: number,
  viewport: ViewportBounds,
  map: MapCanvasBounds,
) {
  return {
    radius: scaleOverlayLength(baseRadius, viewport, map),
    strokeWidth: scaleOverlayLength(FEATURE_MARKER_STROKE_WIDTH, viewport, map),
  };
}

export function getFeatureLabelMetrics(viewport: ViewportBounds, map: MapCanvasBounds) {
  return {
    fontSize: scaleOverlayLength(FEATURE_LABEL_FONT_SIZE, viewport, map),
    strokeWidth: scaleOverlayLength(FEATURE_LABEL_STROKE_WIDTH, viewport, map),
    yOffset: scaleOverlayLength(FEATURE_LABEL_Y_OFFSET, viewport, map),
  };
}

export function getFeatureHandleMetrics(viewport: ViewportBounds, map: MapCanvasBounds) {
  return {
    radius: scaleOverlayLength(FEATURE_HANDLE_RADIUS, viewport, map),
    strokeWidth: scaleOverlayLength(FEATURE_HANDLE_STROKE_WIDTH, viewport, map),
  };
}

export function getAnchorBadgeMetrics(viewport: ViewportBounds, map: MapCanvasBounds) {
  return {
    radius: scaleOverlayLength(ANCHOR_RADIUS, viewport, map),
    strokeWidth: scaleOverlayLength(ANCHOR_STROKE_WIDTH, viewport, map),
  };
}

export function getAnchorLabelMetrics(viewport: ViewportBounds, map: MapCanvasBounds) {
  return {
    fontSize: scaleOverlayLength(ANCHOR_LABEL_FONT_SIZE, viewport, map),
    strokeWidth: scaleOverlayLength(ANCHOR_LABEL_STROKE_WIDTH, viewport, map),
    xOffset: scaleOverlayLength(ANCHOR_LABEL_X_OFFSET, viewport, map),
    yOffset: scaleOverlayLength(ANCHOR_LABEL_Y_OFFSET, viewport, map),
  };
}

export function getDraftOverlayMetrics(viewport: ViewportBounds, map: MapCanvasBounds) {
  return {
    strokeWidth: scaleOverlayLength(DRAFT_STROKE_WIDTH, viewport, map),
    pointRadius: scaleOverlayLength(DRAFT_POINT_RADIUS, viewport, map),
  };
}
