import { useRef, useState } from 'react';
import { formatWorldTick, type TimelineAnchor, type TimelineBounds } from '@shared/temporal';
import styles from './TemporalDock.module.css';

type TemporalDockProps = {
  committedTick: number;
  onExpandedChange?: (expanded: boolean) => void;
  onTimelineCommit: (tick: number) => void;
  onTimelineJump: (tick: number) => void;
  onTimelinePreview: (tick: number) => void;
  previewTick: number | null;
  timelineAnchors: TimelineAnchor[];
  timelineBounds: TimelineBounds | null;
};

export function TemporalDock({
  committedTick,
  onExpandedChange,
  onTimelineCommit,
  onTimelineJump,
  onTimelinePreview,
  previewTick,
  timelineAnchors,
  timelineBounds,
}: TemporalDockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dockRef = useRef<HTMLElement | null>(null);
  const sliderTick = previewTick ?? committedTick;
  const sliderMin = timelineBounds?.minTick ?? 0;
  const sliderMax = timelineBounds?.maxTick ?? Math.max(committedTick, 0);
  const sliderLabel = formatWorldTick(sliderTick);
  const committedLabel = formatWorldTick(committedTick);
  const previewLabel = previewTick === null ? null : formatWorldTick(previewTick);
  const boundsLabel =
    timelineBounds === null
      ? 'Loading timeline'
      : `${formatWorldTick(sliderMin, 'short')} to ${formatWorldTick(sliderMax, 'short')}`;

  const percentage = sliderMax === sliderMin ? 0 : ((sliderTick - sliderMin) / (sliderMax - sliderMin)) * 100;

  const setExpanded = (nextExpanded: boolean) => {
    setIsExpanded((currentExpanded) => {
      if (currentExpanded !== nextExpanded) {
        onExpandedChange?.(nextExpanded);
      }

      return nextExpanded;
    });
  };

  return (
    <aside
      aria-label="Temporal controls"
      className={isExpanded ? `${styles['temporal-dock']} ${styles['active']}` : styles['temporal-dock']}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setExpanded(false);
        }
      }}
      onFocusCapture={() => {
        setExpanded(true);
      }}
      onMouseEnter={() => {
        setExpanded(true);
      }}
      onMouseLeave={() => {
        if (!dockRef.current?.matches(':focus-within')) {
          setExpanded(false);
        }
      }}
      ref={dockRef}
      tabIndex={0}
    >
      <div className={styles['temporal-dock-content']}>
        <div className={styles['temporal-dock-summary']}>
          <div className={styles['temporal-dock-copy']}>
            <p className="eyebrow">Timeline</p>
            <p className={styles['temporal-dock-title']}>Viewing {sliderLabel}</p>
            <p className={`muted helper-text ${styles['temporal-dock-hint']}`}>
              Committed {committedLabel}
              {previewLabel === null ? '' : `, previewing ${previewLabel}`}
            </p>
          </div>

          <span className={`pill subtle ${styles['temporal-dock-pill']}`}>
            {boundsLabel}
          </span>
        </div>

        <div className={styles['temporal-dock-body']}>
          <div className={styles['temporal-dock-meta']}>
            <span>Move through time</span>
            <span>{sliderMin === sliderMax ? 'Single point' : boundsLabel}</span>
          </div>

          <p className={`muted helper-text ${styles['temporal-dock-hint']}`}>
            Custom calendar: 12 months per year and 4 weeks per month.
          </p>

          <label className={styles['temporal-dock-anchor']}>
            <span>Jump to saved point</span>
            <select
              disabled={timelineAnchors.length === 0}
              onChange={(event) => {
                const nextTick = Number(event.target.value);

                if (!Number.isNaN(nextTick)) {
                  onTimelineJump(nextTick);
                }
              }}
              value=""
            >
              <option value="">Select a saved point</option>
              {timelineAnchors.map((anchor) => (
                <option key={anchor.tick} value={String(anchor.tick)}>
                  {anchor.label} · {anchor.changeCount} changes
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={styles['temporal-rail']}>
        <span className={styles['temporal-rail-label']}>Timeline</span>

        <div className={styles['temporal-dock-track']}>
          <div className={styles['temporal-ticks']} />
          <div className={styles['temporal-thumb']} style={{ top: `${percentage}%` }} />
          <input
            aria-label="World-state timeline"
            className={styles['invisible-slider']}
            disabled={timelineBounds === null}
            max={sliderMax}
            min={sliderMin}
            onBlur={() => {
              onTimelineCommit(sliderTick);
            }}
            onChange={(event) => {
              onTimelinePreview(Number(event.target.value));
            }}
            onKeyUp={() => {
              onTimelineCommit(sliderTick);
            }}
            onMouseUp={() => {
              onTimelineCommit(sliderTick);
            }}
            onTouchEnd={() => {
              onTimelineCommit(sliderTick);
            }}
            step={1}
            type="range"
            value={sliderTick}
          />
        </div>
      </div>
    </aside>
  );
}
