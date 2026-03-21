import { useRef, useState } from 'react';
import type { TimelineAnchor, TimelineBounds } from '@shared/temporal';
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
            <p className="eyebrow">World State</p>
            <p className={styles['temporal-dock-title']}>Viewing tick {sliderTick}</p>
            <p className={`muted helper-text ${styles['temporal-dock-hint']}`}>
              Committed tick {committedTick}
              {previewTick === null ? '' : `, previewing tick ${previewTick}`}
            </p>
          </div>

          <span className={`pill subtle ${styles['temporal-dock-pill']}`}>
            {timelineBounds === null ? 'Loading timeline' : `${sliderMin} to ${sliderMax}`}
          </span>
        </div>

        <div className={styles['temporal-dock-body']}>
          <div className={styles['temporal-dock-meta']}>
            <span>Scrub history</span>
            <span>{sliderMin === sliderMax ? 'Single point' : `${sliderMin} to ${sliderMax}`}</span>
          </div>

          <label className={styles['temporal-dock-anchor']}>
            <span>Jump to anchor</span>
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
              <option value="">Select an anchor</option>
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
