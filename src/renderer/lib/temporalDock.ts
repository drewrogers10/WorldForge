import {
  formatWorldTick,
  getTimelinePosition,
  temporalCalendarUnits,
  type TimelineAnchor,
  type TimelineBounds,
} from '@shared/temporal';

export type TimelineRulerTickKind = 'major' | 'minor';

export type TimelineRulerScaleName =
  | 'minute'
  | 'quarterHour'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

export type TimelineRulerTick = {
  kind: TimelineRulerTickKind;
  label: string | null;
  offset: number;
  tick: number;
};

export type TimelineChangeMark = {
  changeCount: number;
  offset: number;
  tick: number;
};

export type TimelinePromotedMarkerReason =
  | 'anchor'
  | 'committed'
  | 'maximum'
  | 'minimum'
  | 'present'
  | 'preview';

export type TimelinePromotedMarker = {
  changeCount: number | null;
  label: string;
  offset: number;
  reason: TimelinePromotedMarkerReason;
  tick: number;
};

export type TimelineRulerScale = {
  majorLabel: string;
  majorStep: number;
  majorStepName: TimelineRulerScaleName;
  minorLabel: string;
  minorStep: number;
  minorStepName: TimelineRulerScaleName;
  windowSpan: number;
};

export type TimelineTrackPresentation = {
  activeOffset: number;
  bounds: TimelineBounds;
  changeMarks: TimelineChangeMark[];
  promotedMarkers: TimelinePromotedMarker[];
  ruler: {
    scale: TimelineRulerScale;
    ticks: TimelineRulerTick[];
  };
};

export type TimelinePresentation = {
  activeTick: number;
  overview: {
    activeOffset: number;
    bounds: TimelineBounds;
    changeMarks: TimelineChangeMark[];
  };
  precisionLabel: string;
  projectRangeLabel: string;
  scrub: TimelineTrackPresentation;
  scrubDepth: number;
  scrubInstruction: string;
};

type MarkerCandidate = {
  changeCount: number | null;
  label: string;
  offset: number;
  priority: number;
  reason: TimelinePromotedMarkerReason;
  tick: number;
};

type TimelineScaleSpec = TimelineRulerScale;

const TIMELINE_SCALE_SPECS: TimelineScaleSpec[] = [
  {
    majorStep: 15,
    majorStepName: 'minute',
    majorLabel: '15 minutes',
    minorStep: 1,
    minorStepName: 'minute',
    minorLabel: 'minute',
    windowSpan: temporalCalendarUnits.hour * 2,
  },
  {
    majorStep: temporalCalendarUnits.hour,
    majorStepName: 'quarterHour',
    majorLabel: 'hour',
    minorStep: 15,
    minorStepName: 'quarterHour',
    minorLabel: '15 minutes',
    windowSpan: temporalCalendarUnits.hour * 8,
  },
  {
    majorStep: temporalCalendarUnits.hour * 6,
    majorStepName: 'hour',
    majorLabel: '6 hours',
    minorStep: temporalCalendarUnits.hour,
    minorStepName: 'hour',
    minorLabel: 'hour',
    windowSpan: temporalCalendarUnits.day * 2,
  },
  {
    majorStep: temporalCalendarUnits.day,
    majorStepName: 'day',
    majorLabel: 'day',
    minorStep: temporalCalendarUnits.hour * 6,
    minorStepName: 'hour',
    minorLabel: '6 hours',
    windowSpan: temporalCalendarUnits.day * 12,
  },
  {
    majorStep: temporalCalendarUnits.week,
    majorStepName: 'week',
    majorLabel: 'week',
    minorStep: temporalCalendarUnits.day,
    minorStepName: 'day',
    minorLabel: 'day',
    windowSpan: temporalCalendarUnits.week * 10,
  },
  {
    majorStep: temporalCalendarUnits.month,
    majorStepName: 'month',
    majorLabel: 'month',
    minorStep: temporalCalendarUnits.week,
    minorStepName: 'week',
    minorLabel: 'week',
    windowSpan: temporalCalendarUnits.month * 10,
  },
  {
    majorStep: temporalCalendarUnits.year,
    majorStepName: 'year',
    majorLabel: 'year',
    minorStep: temporalCalendarUnits.month,
    minorStepName: 'month',
    minorLabel: 'month',
    windowSpan: temporalCalendarUnits.year * 6,
  },
];

function padTime(value: number): string {
  return value.toString().padStart(2, '0');
}

function getTimelineOffset(tick: number, bounds: TimelineBounds): number {
  if (bounds.maxTick <= bounds.minTick) {
    return 0;
  }

  return (tick - bounds.minTick) / (bounds.maxTick - bounds.minTick);
}

function alignUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTimelineScaleIndex(span: number): number {
  if (span <= temporalCalendarUnits.day) {
    return 2;
  }

  if (span <= temporalCalendarUnits.day * 14) {
    return 3;
  }

  if (span <= temporalCalendarUnits.month * 6) {
    return 4;
  }

  if (span <= temporalCalendarUnits.year * 3) {
    return 5;
  }

  return 6;
}

function getTimelineScale(
  bounds: TimelineBounds,
  detailBoost: number,
): TimelineScaleSpec {
  const span = Math.max(0, bounds.maxTick - bounds.minTick);
  const baseScaleIndex = getTimelineScaleIndex(span);
  const focusedIndex = clamp(baseScaleIndex - detailBoost, 0, TIMELINE_SCALE_SPECS.length - 1);

  return TIMELINE_SCALE_SPECS[focusedIndex]!;
}

function formatScaleLabel(tick: number, scaleName: TimelineRulerScaleName): string {
  const position = getTimelinePosition(tick);

  switch (scaleName) {
    case 'year':
      return `Y${position.year}`;
    case 'month':
      return `Y${position.year} · M${position.month}`;
    case 'week':
      return `M${position.month} · W${position.week}`;
    case 'day':
      return `W${position.week} · D${position.day}`;
    case 'hour':
      return `D${position.day} · ${padTime(position.hour)}:00`;
    case 'quarterHour':
      return `${padTime(position.hour)}:${padTime(position.minute)}`;
    case 'minute':
      return `${padTime(position.hour)}:${padTime(position.minute)}`;
    default:
      return formatWorldTick(tick, 'short');
  }
}

function formatMarkerLabel(tick: number, scaleName: TimelineRulerScaleName): string {
  const position = getTimelinePosition(tick);

  switch (scaleName) {
    case 'year':
      return `Year ${position.year}`;
    case 'month':
      return `Y${position.year} M${position.month}`;
    case 'week':
      return `M${position.month} W${position.week}`;
    case 'day':
      return `W${position.week} D${position.day}`;
    case 'hour':
      return `D${position.day} · ${padTime(position.hour)}:00`;
    case 'quarterHour':
    case 'minute':
      return `${padTime(position.hour)}:${padTime(position.minute)}`;
    default:
      return formatWorldTick(tick, 'short');
  }
}

function formatRangeEndpoint(tick: number, scaleName: TimelineRulerScaleName): string {
  const position = getTimelinePosition(tick);

  switch (scaleName) {
    case 'year':
      return `Y${position.year}`;
    case 'month':
      return `Y${position.year} M${position.month}`;
    case 'week':
      return `M${position.month} W${position.week}`;
    case 'day':
      return `W${position.week} D${position.day}`;
    case 'hour':
      return `D${position.day} ${padTime(position.hour)}:00`;
    case 'quarterHour':
    case 'minute':
      return `${padTime(position.hour)}:${padTime(position.minute)}`;
    default:
      return formatWorldTick(tick, 'short');
  }
}

function buildFocusBounds(
  bounds: TimelineBounds,
  focusTick: number,
  scale: TimelineScaleSpec,
): TimelineBounds {
  const span = Math.max(0, bounds.maxTick - bounds.minTick);

  if (span === 0 || span <= scale.windowSpan) {
    return bounds;
  }

  const halfWindow = Math.floor(scale.windowSpan / 2);
  let minTick = focusTick - halfWindow;
  let maxTick = focusTick + halfWindow;

  if (minTick < bounds.minTick) {
    maxTick += bounds.minTick - minTick;
    minTick = bounds.minTick;
  }

  if (maxTick > bounds.maxTick) {
    minTick -= maxTick - bounds.maxTick;
    maxTick = bounds.maxTick;
  }

  minTick = clamp(minTick, bounds.minTick, bounds.maxTick);
  maxTick = clamp(maxTick, bounds.minTick, bounds.maxTick);

  return {
    minTick,
    maxTick,
    presentTick: bounds.presentTick,
  };
}

function addMarkerCandidate(
  candidates: Map<number, MarkerCandidate>,
  bounds: TimelineBounds,
  tick: number,
  reason: TimelinePromotedMarkerReason,
  priority: number,
  scale: TimelineRulerScale,
  changeCount: number | null = null,
) {
  if (tick < bounds.minTick || tick > bounds.maxTick) {
    return;
  }

  const existing = candidates.get(tick);
  const nextCandidate: MarkerCandidate = {
    changeCount,
    label: formatMarkerLabel(tick, scale.majorStepName),
    offset: getTimelineOffset(tick, bounds),
    priority,
    reason,
    tick,
  };

  if (!existing) {
    candidates.set(tick, nextCandidate);
    return;
  }

  candidates.set(tick, {
    ...existing,
    changeCount:
      changeCount === null
        ? existing.changeCount
        : Math.max(existing.changeCount ?? 0, changeCount),
    label: existing.priority >= priority ? existing.label : nextCandidate.label,
    offset: existing.offset,
    priority: Math.max(existing.priority, priority),
    reason: existing.priority >= priority ? existing.reason : reason,
  });
}

export function buildTimelineRuler(
  bounds: TimelineBounds,
  scale = getTimelineScale(bounds, 0),
): {
  scale: TimelineRulerScale;
  ticks: TimelineRulerTick[];
} {
  const ticksByValue = new Map<number, TimelineRulerTick>();

  for (
    let tick = alignUp(bounds.minTick, scale.minorStep);
    tick <= bounds.maxTick;
    tick += scale.minorStep
  ) {
    ticksByValue.set(tick, {
      kind: 'minor',
      label: null,
      offset: getTimelineOffset(tick, bounds),
      tick,
    });
  }

  for (
    let tick = alignUp(bounds.minTick, scale.majorStep);
    tick <= bounds.maxTick;
    tick += scale.majorStep
  ) {
    ticksByValue.set(tick, {
      kind: 'major',
      label: formatScaleLabel(tick, scale.majorStepName),
      offset: getTimelineOffset(tick, bounds),
      tick,
    });
  }

  return {
    scale,
    ticks: [...ticksByValue.values()].sort((left, right) => left.tick - right.tick),
  };
}

export function buildTimelineChangeMarks(
  bounds: TimelineBounds,
  anchors: TimelineAnchor[],
): TimelineChangeMark[] {
  return anchors
    .filter((anchor) => anchor.tick >= bounds.minTick && anchor.tick <= bounds.maxTick)
    .map((anchor) => ({
      changeCount: anchor.changeCount,
      offset: getTimelineOffset(anchor.tick, bounds),
      tick: anchor.tick,
    }))
    .sort((left, right) => left.tick - right.tick);
}

export function selectPromotedTimelineMarkers(input: {
  anchors: TimelineAnchor[];
  bounds: TimelineBounds;
  committedTick: number;
  maxMarkers?: number;
  minSpacing?: number;
  previewTick: number | null;
  scale: TimelineRulerScale;
}): TimelinePromotedMarker[] {
  const {
    anchors,
    bounds,
    committedTick,
    maxMarkers = 4,
    minSpacing = 0.18,
    previewTick,
    scale,
  } = input;
  const candidates = new Map<number, MarkerCandidate>();

  addMarkerCandidate(candidates, bounds, bounds.minTick, 'minimum', 1000, scale);
  addMarkerCandidate(candidates, bounds, bounds.maxTick, 'maximum', 980, scale);
  addMarkerCandidate(candidates, bounds, bounds.presentTick, 'present', 960, scale);
  addMarkerCandidate(candidates, bounds, committedTick, 'committed', 940, scale);

  if (previewTick !== null) {
    addMarkerCandidate(candidates, bounds, previewTick, 'preview', 1020, scale);
  }

  anchors.forEach((anchor) => {
    addMarkerCandidate(
      candidates,
      bounds,
      anchor.tick,
      'anchor',
      100 + anchor.changeCount,
      scale,
      anchor.changeCount,
    );
  });

  const selected: MarkerCandidate[] = [];
  const sortedCandidates = [...candidates.values()].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    if (right.changeCount !== left.changeCount) {
      return (right.changeCount ?? 0) - (left.changeCount ?? 0);
    }

    return left.tick - right.tick;
  });

  for (const candidate of sortedCandidates) {
    if (selected.length >= maxMarkers) {
      continue;
    }

    const collides = selected.some(
      (selectedCandidate) =>
        Math.abs(selectedCandidate.offset - candidate.offset) < minSpacing,
    );

    if (collides) {
      continue;
    }

    selected.push(candidate);
  }

  return selected
    .sort((left, right) => left.tick - right.tick)
    .map(({ changeCount, label, offset, reason, tick }) => ({
      changeCount,
      label,
      offset,
      reason,
      tick,
    }));
}

export function formatTimelineRangeSummary(
  bounds: TimelineBounds,
  scaleName?: TimelineRulerScaleName,
): string {
  if (bounds.maxTick === bounds.minTick) {
    return 'Single moment';
  }

  const effectiveScale = scaleName ?? getTimelineScale(bounds, 0).majorStepName;

  return `${formatRangeEndpoint(bounds.minTick, effectiveScale)} → ${formatRangeEndpoint(
    bounds.maxTick,
    effectiveScale,
  )}`;
}

export function buildTimelinePresentation(input: {
  anchors: TimelineAnchor[];
  bounds: TimelineBounds;
  committedTick: number;
  previewTick: number | null;
  scrubDepth?: number;
}) : TimelinePresentation {
  const {
    anchors,
    bounds,
    committedTick,
    previewTick,
    scrubDepth = 0,
  } = input;
  const activeTick = previewTick ?? committedTick;
  const scale = getTimelineScale(bounds, scrubDepth);
  const scrubBounds = buildFocusBounds(bounds, activeTick, scale);
  const scrubRuler = buildTimelineRuler(scrubBounds, scale);

  return {
    activeTick,
    overview: {
      activeOffset: getTimelineOffset(activeTick, bounds),
      bounds,
      changeMarks: buildTimelineChangeMarks(bounds, anchors),
    },
    precisionLabel: scale.minorLabel,
    projectRangeLabel: formatTimelineRangeSummary(bounds),
    scrub: {
      activeOffset: getTimelineOffset(activeTick, scrubBounds),
      bounds: scrubBounds,
      changeMarks: buildTimelineChangeMarks(scrubBounds, anchors),
      promotedMarkers: selectPromotedTimelineMarkers({
        anchors,
        bounds: scrubBounds,
        committedTick,
        previewTick,
        scale: scrubRuler.scale,
      }),
      ruler: scrubRuler,
    },
    scrubDepth,
    scrubInstruction:
      bounds.maxTick === bounds.minTick
        ? 'Timeline expands around the active moment when more history exists.'
        : 'Drag along the ruler, then pull away from it for finer scrubbing.',
  };
}
