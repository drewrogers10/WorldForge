import { useRef, useState } from 'react';
import { AppShell } from '@renderer/components/AppShell';
import { WorldWorkshop, type WorldWorkshopHandle } from '@renderer/features/world/WorldWorkshop';
import type { WorkspaceView } from '@renderer/lib/forms';

export default function App() {
  const workshopRef = useRef<WorldWorkshopHandle>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>('overview');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  async function handleRefreshAll(): Promise<void> {
    setIsRefreshingAll(true);

    try {
      await workshopRef.current?.refreshAll();
    } finally {
      setIsRefreshingAll(false);
    }
  }

  return (
    <AppShell
      activeView={activeView}
      errorMessage={errorMessage}
      isRefreshing={isRefreshingAll}
      onRefresh={handleRefreshAll}
      onViewChange={setActiveView}
    >
      <WorldWorkshop
        activeView={activeView}
        onErrorChange={setErrorMessage}
        onViewChange={setActiveView}
        ref={workshopRef}
      />
    </AppShell>
  );
}
