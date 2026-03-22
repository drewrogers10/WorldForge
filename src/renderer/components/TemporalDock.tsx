import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import {
  formatWorldTick,
  temporalCalendarUnits,
  type TimelineAnchor,
  type TimelineBounds,
} from '@shared/temporal';
import {
  buildTimelinePresentation,
  formatTimelineRangeSummary,
} from '@renderer/lib/temporalDock';
import styles from './TemporalDock.module.css';

type TemporalDockProps = {
  committedTick: number;
  isCompact: boolean;
  onTimelineCommit: (tick: number) => void;
  onTimelineJump: (tick: number) => void;
  onTimelinePreview: (tick: number) => void;
  previewTick: number | null;
  timelineAnchors: TimelineAnchor[];
  timelineBounds: TimelineBounds | null;
};

function createOffsetStyle(offset: number, lane?: number): CSSProperties {
  const style: Record<string, string> = {
    '--timeline-offset': `${(offset * 100).toFixed(3)}%`,
  };

  if (lane !== undefined) {
    style['--timeline-lane'] = String(lane);
  }

  return style as CSSProperties;
}

function getMarkerMetaLabel(
  reason: 'anchor' | 'committed' | 'maximum' | 'minimum' | 'present' | 'preview',
  changeCount: number | null,
): string {
  const changeLabel =
    changeCount === null
      ? null
      : `${changeCount} ${changeCount === 1 ? 'change' : 'changes'}`;

  switch (reason) {
    case 'preview':
      return changeLabel ? `Preview · ${changeLabel}` : 'Preview';
    case 'committed':
      return changeLabel ? `Committed · ${changeLabel}` : 'Committed';
    case 'present':
      return changeLabel ? `Present · ${changeLabel}` : 'Present';
    case 'minimum':
      return changeLabel ? `Start · ${changeLabel}` : 'Timeline start';
    case 'maximum':
      return changeLabel ? `End · ${changeLabel}` : 'Timeline end';
    case 'anchor':
    default:
      return changeLabel ?? 'Change point';
  }
}

export function TemporalDock({
  committedTick,
  isCompact,
  onTimelineCommit,
  onTimelineJump,
  onTimelinePreview,
  previewTick,
  timelineAnchors,
  timelineBounds,
}: TemporalDockProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isCompactSheetOpen, setIsCompactSheetOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubBoost, setScrubBoost] = useState(0);
  const dockRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();

  const fallbackBounds = timelineBounds ?? {
    minTick: 0,
    maxTick: Math.max(committedTick, 0),
    presentTick: Math.max(committedTick, 0),
  };
  const isOpen = isCompact
    ? isPinned || isCompactSheetOpen
    : isPinned || isPointerInside || isFocusWithin;
  const defaultScrubDepth =
    isOpen && fallbackBounds.maxTick - fallbackBounds.minTick > temporalCalendarUnits.day
      ? 1
      : 0;
  const presentation = buildTimelinePresentation({
    anchors: timelineAnchors,
    bounds: fallbackBounds,
    committedTick,
    previewTick,
    scrubDepth: defaultScrubDepth + scrubBoost,
  });
  const sliderTick = presentation.activeTick;
  const sliderLabel = formatWorldTick(sliderTick, 'short');
  const sliderDetailLabel = formatWorldTick(sliderTick);
  const committedLabel = formatWorldTick(committedTick, 'short');
  const previewLabel = previewTick === null ? null : formatWorldTick(previewTick, 'short');
  const boundsLabel =
    timelineBounds === null
      ? 'Loading timeline'
      : presentation.projectRangeLabel;
  const focusWindowLabel = formatTimelineRangeSummary(
    presentation.scrub.bounds,
    presentation.scrub.ruler.scale.majorStepName,
  );
  const changePointCountLabel =
    timelineAnchors.length === 1
      ? '1 change point'
      : `${timelineAnchors.length} change points`;

  const updateScrubBoost = (clientX: number, clientY: number) => {
    if (!sliderRef.current) {
      return;
    }

    const rect = sliderRef.current.getBoundingClientRect();
    const distance = isCompact
      ? Math.max(0, rect.bottom - clientY)
      : Math.max(0, rect.right - clientX);

    setScrubBoost(Math.min(2, Math.floor(distance / 72)));
  };

  useEffect(() => {
    if (!isCompact) {
      setIsCompactSheetOpen(false);
      return;
    }

    setIsPointerInside(false);
  }, [isCompact]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setIsPinned(false);
      setIsCompactSheetOpen(false);
      setIsPointerInside(false);
      setIsFocusWithin(false);
      triggerRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setIsScrubbing(false);
    setScrubBoost(0);
  }, [isOpen]);

  return (
    <aside
      aria-label="Temporal controls"
      className={clsx(
        styles['temporal-dock'],
        isOpen && styles['open'],
        isPinned && styles['pinned'],
        isCompact && styles['compact'],
      )}
      onBlurCapture={(event) => {
        if (!dockRef.current?.contains(event.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
        }
      }}
      onFocusCapture={() => {
        setIsFocusWithin(true);
      }}
      onMouseEnter={() => {
        if (!isCompact) {
          setIsPointerInside(true);
        }
      }}
      onMouseLeave={() => {
        if (!isCompact) {
          setIsPointerInside(false);
        }
      }}
      ref={dockRef}
    >
      {isCompact ? (
        <button
          aria-hidden={!isOpen}
          className={clsx(styles['compact-scrim'], isOpen && styles['compact-scrim-visible'])}
          onClick={() => {
            setIsCompactSheetOpen(false);
            if (!isPinned) {
              setIsFocusWithin(false);
            }
          }}
          tabIndex={isOpen ? 0 : -1}
          type="button"
        />
      ) : null}

      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isCompact ? (isOpen ? 'Close timeline' : 'Open timeline') : 'Timeline controls'}
        className={clsx(styles['temporal-trigger'], isPinned && styles['temporal-trigger-pinned'])}
        onClick={() => {
          if (isCompact) {
            setIsCompactSheetOpen((current) => !current);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className={styles['temporal-trigger-label']}>Timeline</span>
        <div className={styles['temporal-trigger-track']} aria-hidden="true">
          <span className={styles['temporal-trigger-line']} />
          {presentation.overview.changeMarks.map((changeMark) => (
            <span
              className={styles['temporal-trigger-mark']}
              key={`trigger-${changeMark.tick}`}
              style={createOffsetStyle(changeMark.offset)}
            />
          ))}
          <span
            className={styles['temporal-trigger-thumb']}
            style={createOffsetStyle(presentation.overview.activeOffset)}
          />
        </div>
        <span className={styles['temporal-trigger-footer']}>
          {isPinned ? 'Pinned' : isCompact ? 'Open' : 'Hover'}
        </span>
      </button>

      <section
        className={clsx(
          styles['temporal-panel'],
          isOpen && styles['temporal-panel-open'],
          isCompact && styles['temporal-panel-sheet'],
        )}
        id={panelId}
      >
        <div className={styles['temporal-panel-header']}>
          <div className={styles['temporal-panel-copy']}>
            <p className="eyebrow">Timeline</p>
            <p className={styles['temporal-panel-title']}>Viewing {sliderLabel}</p>
            <p className={`muted helper-text ${styles['temporal-panel-hint']}`}>
              Committed {committedLabel}
              {previewLabel === null ? '' : `, previewing ${previewLabel}`}
            </p>
          </div>

          <div className={styles['temporal-panel-actions']}>
            <button
              className={clsx('secondary-button', styles['temporal-panel-button'])}
              onClick={() => {
                setIsPinned((current) => !current);
                if (isCompact && !isOpen) {
                  setIsCompactSheetOpen(true);
                }
              }}
              type="button"
            >
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
            {isCompact ? (
              <button
                className={clsx('secondary-button', styles['temporal-panel-button'])}
                onClick={() => {
                  setIsCompactSheetOpen(false);
                  if (!isPinned) {
                    setIsFocusWithin(false);
                  }
                }}
                type="button"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles['temporal-panel-meta']}>
          <span className={`pill subtle ${styles['temporal-panel-pill']}`}>{boundsLabel}</span>
          <span className="pill subtle">{focusWindowLabel}</span>
          <span className={clsx('pill', isScrubbing || scrubBoost > 0 ? 'highlight' : 'subtle')}>
            Precision {presentation.precisionLabel}
          </span>
          <span className="pill subtle">{changePointCountLabel}</span>
        </div>

        <div
          className={clsx(
            styles['temporal-ruler'],
            isScrubbing && styles['temporal-ruler-scrubbing'],
            isCompact ? styles['temporal-ruler-horizontal'] : styles['temporal-ruler-vertical'],
          )}
        >
          <span className={styles['temporal-ruler-track']} aria-hidden="true" />

          {presentation.scrub.ruler.ticks.map((tick) => (
            <span
              aria-hidden="true"
              className={clsx(
                styles['temporal-ruler-tick'],
                tick.kind === 'major'
                  ? styles['temporal-ruler-tick-major']
                  : styles['temporal-ruler-tick-minor'],
              )}
              key={`tick-${tick.tick}`}
              style={createOffsetStyle(tick.offset)}
            >
              {tick.label ? (
                <span className={styles['temporal-ruler-tick-label']}>{tick.label}</span>
              ) : null}
            </span>
          ))}

          {presentation.scrub.changeMarks.map((changeMark) => (
            <span
              aria-hidden="true"
              className={styles['temporal-change-mark']}
              key={`change-${changeMark.tick}`}
              style={createOffsetStyle(changeMark.offset)}
            />
          ))}

          {presentation.scrub.promotedMarkers.map((marker, index) => (
            <button
              className={clsx(
                styles['temporal-marker'],
                isCompact &&
                  (index % 2 === 1
                    ? styles['temporal-marker-lane-alt']
                    : styles['temporal-marker-lane-base']),
              )}
              key={`marker-${marker.tick}`}
              onClick={() => {
                onTimelineJump(marker.tick);
              }}
              style={createOffsetStyle(marker.offset, index % 2)}
              title={`${formatWorldTick(marker.tick)} · ${getMarkerMetaLabel(
                marker.reason,
                marker.changeCount,
              )}`}
              type="button"
            >
              <span className={styles['temporal-marker-copy']}>
                <span className={styles['temporal-marker-label']}>{marker.label}</span>
              </span>
              <span className={styles['temporal-marker-stem']} aria-hidden="true" />
              <span className={styles['temporal-marker-dot']} aria-hidden="true" />
            </button>
          ))}

          <span
            aria-hidden="true"
            className={styles['temporal-active-thumb']}
            style={createOffsetStyle(presentation.scrub.activeOffset)}
          />

          <div
            className={styles['temporal-active-callout']}
            style={createOffsetStyle(presentation.scrub.activeOffset)}
          >
            <span className={styles['temporal-active-label']}>
              {previewTick === null ? 'Viewing' : 'Preview'}
            </span>
            <strong>{sliderLabel}</strong>
            <span className={styles['temporal-active-detail']}>{sliderDetailLabel}</span>
          </div>

          <input
            aria-label="World-state timeline"
            aria-valuetext={sliderDetailLabel}
            className={clsx(
              styles['temporal-slider'],
              isCompact ? styles['temporal-slider-horizontal'] : styles['temporal-slider-vertical'],
            )}
            disabled={timelineBounds === null}
            max={presentation.scrub.bounds.maxTick}
            min={presentation.scrub.bounds.minTick}
            onBlur={() => {
              onTimelineCommit(sliderTick);
              setIsScrubbing(false);
              setScrubBoost(0);
            }}
            onChange={(event) => {
              onTimelinePreview(Number(event.target.value));
            }}
            onKeyDown={(event) => {
              let nextTick: number | null = null;

              switch (event.key) {
                case 'ArrowUp':
                case 'ArrowRight':
                  nextTick = Math.min(
                    fallbackBounds.maxTick,
                    sliderTick + presentation.scrub.ruler.scale.minorStep,
                  );
                  break;
                case 'ArrowDown':
                case 'ArrowLeft':
                  nextTick = Math.max(
                    fallbackBounds.minTick,
                    sliderTick - presentation.scrub.ruler.scale.minorStep,
                  );
                  break;
                case 'PageUp':
                  nextTick = Math.min(
                    fallbackBounds.maxTick,
                    sliderTick + presentation.scrub.ruler.scale.majorStep,
                  );
                  break;
                case 'PageDown':
                  nextTick = Math.max(
                    fallbackBounds.minTick,
                    sliderTick - presentation.scrub.ruler.scale.majorStep,
                  );
                  break;
                case 'Home':
                  nextTick = fallbackBounds.minTick;
                  break;
                case 'End':
                  nextTick = fallbackBounds.maxTick;
                  break;
                default:
                  break;
              }

              if (nextTick === null) {
                return;
              }

              event.preventDefault();
              onTimelineCommit(nextTick);
            }}
            onMouseUp={() => {
              onTimelineCommit(sliderTick);
              setIsScrubbing(false);
              setScrubBoost(0);
            }}
            onPointerCancel={() => {
              setIsScrubbing(false);
              setScrubBoost(0);
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsScrubbing(true);
              updateScrubBoost(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (!isScrubbing) {
                return;
              }

              updateScrubBoost(event.clientX, event.clientY);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }

              onTimelineCommit(sliderTick);
              setIsScrubbing(false);
              setScrubBoost(0);
            }}
            onTouchEnd={() => {
              onTimelineCommit(sliderTick);
              setIsScrubbing(false);
              setScrubBoost(0);
            }}
            ref={sliderRef}
            step={1}
            type="range"
            value={sliderTick}
          />
        </div>

        <div className={styles['temporal-panel-footer']}>
          <p className="muted helper-text">
            {presentation.scrubInstruction}
          </p>
          <p className="muted helper-text">
            Click change markers to jump. Arrow keys nudge by {presentation.scrub.ruler.scale.minorLabel};
            Page Up and Page Down move by {presentation.scrub.ruler.scale.majorLabel}.
          </p>
        </div>
      </section>
    </aside>
  );
}
