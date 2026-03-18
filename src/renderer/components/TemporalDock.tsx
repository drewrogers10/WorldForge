import type { TimelineAnchor, TimelineBounds } from '@shared/temporal';

type TemporalDockProps = {
  committedTick: number;
  onTimelineCommit: (tick: number) => void;
  onTimelineJump: (tick: number) => void;
  onTimelinePreview: (tick: number) => void;
  previewTick: number | null;
  timelineAnchors: TimelineAnchor[];
  timelineBounds: TimelineBounds | null;
};

export function TemporalDock({
  committedTick,
  onTimelineCommit,
  onTimelineJump,
  onTimelinePreview,
  previewTick,
  timelineAnchors,
  timelineBounds,
}: TemporalDockProps) {
  const sliderTick = previewTick ?? committedTick;
  const sliderMin = timelineBounds?.minTick ?? 0;
  const sliderMax = timelineBounds?.maxTick ?? Math.max(committedTick, 0);

  return (
    <div className="temporal-dock-shell">
      <aside aria-label="Temporal controls" className="temporal-dock" tabIndex={0}>
        <div className="temporal-dock-summary">
          <div className="temporal-dock-copy">
            <p className="eyebrow">World State</p>
            <p className="temporal-dock-title">Viewing tick {sliderTick}</p>
            <p className="muted helper-text temporal-dock-hint">
              Committed tick {committedTick}
              {previewTick === null ? '' : `, previewing tick ${previewTick}`}
            </p>
          </div>

          <span className="pill subtle temporal-dock-pill">
            {timelineBounds === null ? 'Loading timeline' : `${sliderMin} to ${sliderMax}`}
          </span>
        </div>

        <div className="temporal-dock-body">
          <div className="temporal-dock-range">
            <div className="temporal-dock-meta">
              <span>Scrub history</span>
              <span>{sliderMin === sliderMax ? 'Single point' : `${sliderMin} to ${sliderMax}`}</span>
            </div>

            <input
              aria-label="World-state timeline"
              className="temporal-dock-slider"
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

          <label className="temporal-dock-anchor">
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
      </aside>
    </div>
  );
}
