import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@renderer/components/AppShell';
import { WorldWorkshop, type WorldWorkshopHandle } from '@renderer/features/world/WorldWorkshop';
import type { WorkspaceView } from '@renderer/lib/forms';
import type { TimelineAnchor, TimelineBounds } from '@shared/temporal';

export default function App() {
  const workshopRef = useRef<WorldWorkshopHandle>(null);
  const hasInitializedTimelineRef = useRef(false);
  const [activeView, setActiveView] = useState<WorkspaceView>('overview');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [timelineBounds, setTimelineBounds] = useState<TimelineBounds | null>(null);
  const [timelineAnchors, setTimelineAnchors] = useState<TimelineAnchor[]>([]);
  const [committedTick, setCommittedTick] = useState(0);
  const [previewTick, setPreviewTick] = useState<number | null>(null);

  useEffect(() => {
    void refreshTimeline();
  }, []);

  async function refreshTimeline(): Promise<void> {
    const [bounds, anchors] = await Promise.all([
      window.worldForge.getTimelineBounds(),
      window.worldForge.listTimelineAnchors(),
    ]);

    setTimelineBounds(bounds);
    setTimelineAnchors(anchors);
    setCommittedTick((current) => {
      if (!hasInitializedTimelineRef.current) {
        hasInitializedTimelineRef.current = true;
        return bounds.presentTick;
      }

      return Math.min(bounds.maxTick, Math.max(bounds.minTick, current));
    });
  }

  async function handleRefreshAll(): Promise<void> {
    setIsRefreshingAll(true);

    try {
      await refreshTimeline();
      await workshopRef.current?.refreshAll();
    } finally {
      setIsRefreshingAll(false);
    }
  }

  return (
    <AppShell
      activeView={activeView}
      committedTick={committedTick}
      errorMessage={errorMessage}
      isRefreshing={isRefreshingAll}
      onTimelineCommit={(tick) => {
        setCommittedTick(tick);
        setPreviewTick(null);
      }}
      onTimelinePreview={(tick) => {
        setPreviewTick(tick);
      }}
      onRefresh={handleRefreshAll}
      onTimelineJump={(tick) => {
        setCommittedTick(tick);
        setPreviewTick(null);
      }}
      onViewChange={setActiveView}
      previewTick={previewTick}
      timelineAnchors={timelineAnchors}
      timelineBounds={timelineBounds}
    >
      <WorldWorkshop
        activeView={activeView}
        committedTick={committedTick}
        onErrorChange={setErrorMessage}
        onTimelineMetadataRefresh={refreshTimeline}
        onViewChange={setActiveView}
        previewTick={previewTick}
        ref={workshopRef}
      />
    </AppShell>
  );
}
