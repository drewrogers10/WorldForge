import { create } from 'zustand';
import type { TimelineAnchor, TimelineBounds } from '@shared/temporal';

type TemporalState = {
  committedTick: number;
  previewTick: number | null;
  timelineBounds: TimelineBounds | null;
  timelineAnchors: TimelineAnchor[];
  hasInitializedTimeline: boolean;

  setCommittedTick: (tick: number) => void;
  setPreviewTick: (tick: number | null) => void;
  refreshTimeline: () => Promise<void>;
};

export const useTemporalStore = create<TemporalState>((set) => ({
  committedTick: 0,
  previewTick: null,
  timelineBounds: null,
  timelineAnchors: [],
  hasInitializedTimeline: false,

  setCommittedTick: (tick) => set({ committedTick: tick, previewTick: null }),
  setPreviewTick: (tick) => set({ previewTick: tick }),

  refreshTimeline: async () => {
    const [bounds, anchors] = await Promise.all([
      window.worldForge.getTimelineBounds(),
      window.worldForge.listTimelineAnchors(),
    ]);

    set((state) => {
      let nextCommittedTick = state.committedTick;
      if (!state.hasInitializedTimeline) {
        nextCommittedTick = bounds.presentTick;
      } else {
        nextCommittedTick = Math.min(bounds.maxTick, Math.max(bounds.minTick, nextCommittedTick));
      }

      return {
        timelineBounds: bounds,
        timelineAnchors: anchors,
        committedTick: nextCommittedTick,
        hasInitializedTimeline: true,
      };
    });
  },
}));
