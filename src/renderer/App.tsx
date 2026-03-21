import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@renderer/components/AppShell';
import { OverviewPage } from '@renderer/features/overview/OverviewPage';
import { CharacterPage } from '@renderer/features/characters/CharacterPage';
import { LocationPage } from '@renderer/features/locations/LocationPage';
import { ItemPage } from '@renderer/features/items/ItemPage';
import { useTemporalStore } from '@renderer/store/temporalStore';

export default function App() {
  const refreshTimeline = useTemporalStore((state) => state.refreshTimeline);

  useEffect(() => {
    void refreshTimeline();
  }, [refreshTimeline]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="people" element={<CharacterPage />} />
          <Route path="places" element={<LocationPage />} />
          <Route path="items" element={<ItemPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
