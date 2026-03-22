import { describe, expect, it } from 'vitest';
import { temporalCalendarUnits, type TimelineAnchor, type TimelineBounds } from '@shared/temporal';
import {
  buildTimelinePresentation,
  buildTimelineRuler,
  formatTimelineRangeSummary,
  selectPromotedTimelineMarkers,
} from './temporalDock';

function createBounds(minTick: number, maxTick: number): TimelineBounds {
  return {
    minTick,
    maxTick,
    presentTick: maxTick,
  };
}

function createAnchor(tick: number, changeCount: number): TimelineAnchor {
  return {
    tick,
    label: `Tick ${tick}`,
    changeCount,
  };
}

describe('temporal dock ruler helpers', () => {
  it('uses an hourly-focused ruler for short spans', () => {
    const bounds = createBounds(45, 45 + temporalCalendarUnits.hour * 8);
    const ruler = buildTimelineRuler(bounds);

    expect(ruler.scale.majorStep).toBe(temporalCalendarUnits.hour * 6);
    expect(ruler.scale.minorStep).toBe(temporalCalendarUnits.hour);
    expect(ruler.ticks.some((tick) => tick.kind === 'major')).toBe(true);
    expect(ruler.ticks.some((tick) => tick.kind === 'minor')).toBe(true);
  });

  it('uses a weekly-focused ruler for medium spans', () => {
    const bounds = createBounds(0, temporalCalendarUnits.day * 50);
    const ruler = buildTimelineRuler(bounds);

    expect(ruler.scale.majorStep).toBe(temporalCalendarUnits.week);
    expect(ruler.scale.minorStep).toBe(temporalCalendarUnits.day);
    expect(ruler.ticks.filter((tick) => tick.kind === 'major').length).toBeGreaterThan(4);
  });

  it('uses a yearly-focused ruler for long spans', () => {
    const bounds = createBounds(0, temporalCalendarUnits.year * 5);
    const ruler = buildTimelineRuler(bounds);

    expect(ruler.scale.majorStep).toBe(temporalCalendarUnits.year);
    expect(ruler.scale.minorStep).toBe(temporalCalendarUnits.month);
    expect(ruler.ticks.some((tick) => tick.label?.startsWith('Y'))).toBe(true);
  });
});

describe('temporal dock presentation', () => {
  it('shrinks the scrub window to a finer local span when scrub depth increases', () => {
    const bounds = createBounds(0, temporalCalendarUnits.year * 5);

    const overviewPresentation = buildTimelinePresentation({
      anchors: [],
      bounds,
      committedTick: temporalCalendarUnits.year * 2,
      previewTick: null,
      scrubDepth: 0,
    });
    const focusedPresentation = buildTimelinePresentation({
      anchors: [],
      bounds,
      committedTick: temporalCalendarUnits.year * 2,
      previewTick: null,
      scrubDepth: 2,
    });

    const overviewSpan =
      overviewPresentation.scrub.bounds.maxTick - overviewPresentation.scrub.bounds.minTick;
    const focusedSpan =
      focusedPresentation.scrub.bounds.maxTick - focusedPresentation.scrub.bounds.minTick;

    expect(focusedSpan).toBeLessThan(overviewSpan);
    expect(focusedPresentation.precisionLabel).not.toBe(overviewPresentation.precisionLabel);
  });

  it('formats a zero-span range as a single moment', () => {
    expect(formatTimelineRangeSummary(createBounds(25, 25))).toBe('Single moment');
  });
});

describe('temporal dock promoted markers', () => {
  it('prioritizes preview and committed markers over dense nearby anchors', () => {
    const bounds = createBounds(0, 100);
    const scale = buildTimelineRuler(bounds).scale;
    const markers = selectPromotedTimelineMarkers({
      anchors: [
        createAnchor(10, 4),
        createAnchor(12, 9),
        createAnchor(60, 3),
        createAnchor(62, 8),
      ],
      bounds,
      committedTick: 11,
      minSpacing: 0.05,
      previewTick: 61,
      scale,
    });

    expect(markers.map((marker) => marker.tick)).toContain(11);
    expect(markers.map((marker) => marker.tick)).toContain(61);
    expect(markers.map((marker) => marker.tick)).not.toContain(12);
    expect(markers.map((marker) => marker.tick)).not.toContain(62);
  });

  it('keeps only the highest-signal anchor within a tight collision cluster', () => {
    const bounds = createBounds(0, 200);
    const scale = buildTimelineRuler(bounds).scale;
    const markers = selectPromotedTimelineMarkers({
      anchors: [
        createAnchor(40, 2),
        createAnchor(44, 11),
        createAnchor(48, 5),
        createAnchor(160, 6),
      ],
      bounds,
      committedTick: 0,
      maxMarkers: 6,
      minSpacing: 0.05,
      previewTick: null,
      scale,
    });

    expect(markers.map((marker) => marker.tick)).toContain(44);
    expect(markers.map((marker) => marker.tick)).not.toContain(40);
    expect(markers.map((marker) => marker.tick)).not.toContain(48);
    expect(markers.map((marker) => marker.tick)).toContain(160);
  });
});
