import { describe, expect, it } from 'vitest';
import {
  ANCHOR_LABEL_FONT_SIZE,
  ANCHOR_LABEL_STROKE_WIDTH,
  ANCHOR_LABEL_X_OFFSET,
  ANCHOR_LABEL_Y_OFFSET,
  ANCHOR_RADIUS,
  ANCHOR_STROKE_WIDTH,
  DRAFT_POINT_RADIUS,
  DRAFT_STROKE_WIDTH,
  FEATURE_HANDLE_RADIUS,
  FEATURE_HANDLE_STROKE_WIDTH,
  FEATURE_LABEL_FONT_SIZE,
  FEATURE_LABEL_STROKE_WIDTH,
  FEATURE_LABEL_Y_OFFSET,
  FEATURE_MARKER_STROKE_WIDTH,
  getAnchorBadgeMetrics,
  getAnchorLabelMetrics,
  getDraftOverlayMetrics,
  getFeatureHandleMetrics,
  getFeatureLabelMetrics,
  getFeatureMarkerMetrics,
  getFeatureStrokeWidth,
  getOverlayScale,
  scaleOverlayLength,
} from './mapOverlayScale';

const map = {
  canvasWidth: 10_000,
  canvasHeight: 8_000,
};

const fullViewport = {
  width: 10_000,
  height: 8_000,
};

const zoomedViewport = {
  width: 2_500,
  height: 2_000,
};

describe('mapOverlayScale', () => {
  it('returns a scale of 1 for the full-map viewport', () => {
    expect(getOverlayScale(fullViewport, map)).toBe(1);
    expect(scaleOverlayLength(120, fullViewport, map)).toBe(120);
  });

  it('reduces overlay lengths in map space as the viewport zooms in', () => {
    expect(getOverlayScale(zoomedViewport, map)).toBe(0.25);
    expect(scaleOverlayLength(120, zoomedViewport, map)).toBe(30);
    expect(getFeatureStrokeWidth(120, zoomedViewport, map)).toBe(30);
  });

  it('matches the width-based overlay ratio to the viewport height ratio for preserved aspect zooms', () => {
    const widthRatio = zoomedViewport.width / map.canvasWidth;
    const heightRatio = zoomedViewport.height / map.canvasHeight;

    expect(widthRatio).toBe(heightRatio);
    expect(getOverlayScale(zoomedViewport, map)).toBe(widthRatio);
  });

  it('scales point marker metrics from their base radius', () => {
    expect(getFeatureMarkerMetrics(260, zoomedViewport, map)).toEqual({
      radius: 65,
      strokeWidth: FEATURE_MARKER_STROKE_WIDTH * 0.25,
    });
  });

  it('scales feature label metrics and drag handles', () => {
    expect(getFeatureLabelMetrics(zoomedViewport, map)).toEqual({
      fontSize: FEATURE_LABEL_FONT_SIZE * 0.25,
      strokeWidth: FEATURE_LABEL_STROKE_WIDTH * 0.25,
      yOffset: FEATURE_LABEL_Y_OFFSET * 0.25,
    });
    expect(getFeatureHandleMetrics(zoomedViewport, map)).toEqual({
      radius: FEATURE_HANDLE_RADIUS * 0.25,
      strokeWidth: FEATURE_HANDLE_STROKE_WIDTH * 0.25,
    });
  });

  it('scales anchor badge and label metrics', () => {
    expect(getAnchorBadgeMetrics(zoomedViewport, map)).toEqual({
      radius: ANCHOR_RADIUS * 0.25,
      strokeWidth: ANCHOR_STROKE_WIDTH * 0.25,
    });
    expect(getAnchorLabelMetrics(zoomedViewport, map)).toEqual({
      fontSize: ANCHOR_LABEL_FONT_SIZE * 0.25,
      strokeWidth: ANCHOR_LABEL_STROKE_WIDTH * 0.25,
      xOffset: ANCHOR_LABEL_X_OFFSET * 0.25,
      yOffset: ANCHOR_LABEL_Y_OFFSET * 0.25,
    });
  });

  it('scales draft overlay metrics', () => {
    expect(getDraftOverlayMetrics(zoomedViewport, map)).toEqual({
      strokeWidth: DRAFT_STROKE_WIDTH * 0.25,
      pointRadius: DRAFT_POINT_RADIUS * 0.25,
    });
  });
});
