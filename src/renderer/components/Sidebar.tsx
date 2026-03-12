import { workspaceOptions, type WorkspaceView } from '@renderer/lib/forms';

type SidebarProps = {
  activeView: WorkspaceView;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onViewChange: (view: WorkspaceView) => void;
};

export function Sidebar({
  activeView,
  isRefreshing,
  onRefresh,
  onViewChange,
}: SidebarProps) {
  return (
    <div className="shell-sidebar">
      <div className="entity-switcher" aria-label="Entity Workspace">
        {workspaceOptions.map((workspace) => (
          <button
            key={workspace.id}
            aria-pressed={activeView === workspace.id}
            className={
              activeView === workspace.id ? 'workspace-button active' : 'workspace-button'
            }
            onClick={() => {
              onViewChange(workspace.id);
            }}
            type="button"
          >
            {workspace.label}
          </button>
        ))}
      </div>

      <button
        className="secondary-button"
        disabled={isRefreshing}
        onClick={() => {
          void onRefresh();
        }}
        type="button"
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
