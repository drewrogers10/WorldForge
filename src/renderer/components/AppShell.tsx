import { useState, type ReactNode } from 'react';
import {
  workspaceOptions,
  type WorkspaceOption,
  type WorkspaceView,
} from '@renderer/lib/forms';
import type { TimelineAnchor, TimelineBounds } from '@shared/temporal';
import { Sidebar } from './Sidebar';
import { TemporalDock } from './TemporalDock';

type AppShellProps = {
  activeView: WorkspaceView;
  children: ReactNode;
  committedTick: number;
  errorMessage: string | null;
  isRefreshing: boolean;
  onTimelineCommit: (tick: number) => void;
  onTimelineJump: (tick: number) => void;
  onTimelinePreview: (tick: number) => void;
  onRefresh: () => Promise<void>;
  onViewChange: (view: WorkspaceView) => void;
  previewTick: number | null;
  timelineAnchors: TimelineAnchor[];
  timelineBounds: TimelineBounds | null;
};

export function AppShell({
  activeView,
  children,
  committedTick,
  errorMessage,
  isRefreshing,
  onTimelineCommit,
  onTimelineJump,
  onTimelinePreview,
  onRefresh,
  onViewChange,
  previewTick,
  timelineAnchors,
  timelineBounds,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const activeWorkspace: WorkspaceOption =
    workspaceOptions.find((workspace) => workspace.id === activeView) ?? {
      id: 'overview',
      label: 'Overview',
      description: 'Review world coverage, recent additions, and where to work next.',
      group: 'Workspace',
    };

  return (
    <div className={isSidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      {isSidebarCollapsed ? null : (
        <Sidebar
          activeView={activeView}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onViewChange={onViewChange}
        />
      )}

      <div className="app-main">
        <div aria-label="Application functions" className="app-topbar" role="toolbar">
          <div className="topbar-leading">
            <div className="topbar-summary">
              <p className="eyebrow">Function bar</p>
              <p className="topbar-title">General navigation and shell controls</p>
            </div>

            <div className="topbar-actions">
              <button
                aria-controls="app-sidebar"
                aria-expanded={!isSidebarCollapsed}
                className="secondary-button"
                onClick={() => {
                  setIsSidebarCollapsed((current) => !current);
                }}
                type="button"
              >
                {isSidebarCollapsed ? 'Show sidebar' : 'Collapse sidebar'}
              </button>

              <button
                className="secondary-button"
                disabled={isRefreshing}
                onClick={() => {
                  void onRefresh();
                }}
                type="button"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh data'}
              </button>
            </div>
          </div>

          <nav aria-label="General workspace navigation" className="function-bar-nav">
            {workspaceOptions.map((workspace) => (
              <button
                key={workspace.id}
                aria-pressed={activeView === workspace.id}
                className={
                  activeView === workspace.id
                    ? 'function-bar-link active'
                    : 'function-bar-link'
                }
                onClick={() => {
                  onViewChange(workspace.id);
                }}
                type="button"
              >
                <span className="function-bar-link-label">{workspace.label}</span>
                <span className="function-bar-link-group">{workspace.group}</span>
              </button>
            ))}
          </nav>
        </div>

        <header className="app-header">
          <div className="header-copy">
            <p className="eyebrow">{activeWorkspace.group}</p>
            <h2>{activeWorkspace.label}</h2>
            <p className="muted shell-intro">{activeWorkspace.description}</p>
          </div>

          <span className="pill subtle">{activeWorkspace.group}</span>
        </header>

        {errorMessage ? <div className="status error">{errorMessage}</div> : null}

        <TemporalDock
          committedTick={committedTick}
          onTimelineCommit={onTimelineCommit}
          onTimelineJump={onTimelineJump}
          onTimelinePreview={onTimelinePreview}
          previewTick={previewTick}
          timelineAnchors={timelineAnchors}
          timelineBounds={timelineBounds}
        />

        <div className="app-body">{children}</div>
      </div>
    </div>
  );
}
