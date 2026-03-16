import {
  workspaceGroups,
  workspaceOptions,
  type WorkspaceView,
} from '@renderer/lib/forms';

type SidebarProps = {
  activeView: WorkspaceView;
  isCollapsed: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onViewChange: (view: WorkspaceView) => void;
};

export function Sidebar({
  activeView,
  isCollapsed,
  isRefreshing,
  onRefresh,
  onViewChange,
}: SidebarProps) {
  return (
    <aside
      aria-hidden={isCollapsed}
      className="shell-sidebar"
      hidden={isCollapsed}
      id="app-sidebar"
    >
      <div className="sidebar-brand">
        <p className="eyebrow">WorldForge</p>
        <h1>World Workshop</h1>
        <p className="muted">
          Keep your setting arranged by foundations, map data, and deeper lore.
        </p>
      </div>

      <nav aria-label="Application sections" className="sidebar-nav">
        {workspaceGroups.map((group) => (
          <section className="sidebar-section" key={group}>
            <p className="sidebar-section-label">{group}</p>

            <div className="sidebar-link-list">
              {workspaceOptions
                .filter((workspace) => workspace.group === group)
                .map((workspace) => (
                  <button
                    key={workspace.id}
                    aria-pressed={activeView === workspace.id}
                    className={
                      activeView === workspace.id ? 'sidebar-link active' : 'sidebar-link'
                    }
                    onClick={() => {
                      onViewChange(workspace.id);
                    }}
                    type="button"
                  >
                    <span className="sidebar-link-copy">
                      <strong>{workspace.label}</strong>
                      <span>{workspace.description}</span>
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-title">Sync</p>
        <p className="muted sidebar-footer-copy">
          Reload people, places, and items before jumping between workspaces.
        </p>

        <button
          className="secondary-button sidebar-refresh"
          disabled={isRefreshing}
          onClick={() => {
            void onRefresh();
          }}
          type="button"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh data'}
        </button>
      </div>
    </aside>
  );
}
