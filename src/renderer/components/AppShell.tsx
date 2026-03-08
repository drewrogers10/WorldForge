import type { ReactNode } from 'react';
import type { WorkspaceView } from '@renderer/lib/forms';
import { Sidebar } from './Sidebar';

type AppShellProps = {
  activeView: WorkspaceView;
  children: ReactNode;
  errorMessage: string | null;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onViewChange: (view: WorkspaceView) => void;
};

export function AppShell({
  activeView,
  children,
  errorMessage,
  isRefreshing,
  onRefresh,
  onViewChange,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-copy">
          <div>
            <p className="eyebrow">WorldForge</p>
            <h1>World Workshop</h1>
          </div>
        </div>

        <Sidebar
          activeView={activeView}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onViewChange={onViewChange}
        />
      </header>

      {errorMessage ? <div className="status error">{errorMessage}</div> : null}

      {children}
    </div>
  );
}
