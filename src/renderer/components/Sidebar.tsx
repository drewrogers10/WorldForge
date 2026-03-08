import type { WorkspaceView } from '@renderer/lib/forms';

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
        <button
          aria-pressed={activeView === 'characters'}
          className={
            activeView === 'characters' ? 'workspace-button active' : 'workspace-button'
          }
          onClick={() => {
            onViewChange('characters');
          }}
          type="button"
        >
          Characters
        </button>
        <button
          aria-pressed={activeView === 'locations'}
          className={
            activeView === 'locations' ? 'workspace-button active' : 'workspace-button'
          }
          onClick={() => {
            onViewChange('locations');
          }}
          type="button"
        >
          Locations
        </button>
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
