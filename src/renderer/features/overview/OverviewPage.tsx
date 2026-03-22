import { useEffect } from 'react';
import { WorldOverview } from '@renderer/features/world/WorldOverview';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useWorldStore } from '@renderer/store/worldStore';

export function OverviewPage() {
  const { committedTick, previewTick } = useTemporalStore();
  const tick = previewTick ?? committedTick;

  const { characters, locations, items, isLoading, overviewDelta, loadWorldData } = useWorldStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadWorldData(tick);
    }, 50);
    return () => clearTimeout(timeout);
  }, [tick, loadWorldData]);

  return (
    <WorldOverview
      changedCharacterIds={new Set()}
      changedItemIds={new Set()}
      changedLocationIds={new Set()}
      characters={characters}
      isLoading={isLoading}
      items={items}
      locations={locations}
      overviewDelta={overviewDelta}
      tick={tick}
    />
  );
}
