import {
  workspaceGroups,
  workspaceOptions,
  type WorkspaceView,
} from '@renderer/lib/forms';
import { appCopy } from '@renderer/lib/copy';
import styles from './Sidebar.module.css';

type SidebarProps = {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
};

export function Sidebar({
  activeView,
  onViewChange,
}: SidebarProps) {
  return (
    <aside className={styles['shell-sidebar']} id="app-sidebar">
      <div className={styles['sidebar-brand']}>
        <p className="eyebrow">{appCopy.brand}</p>
        <h1>{appCopy.shellName}</h1>
        <p className="muted">{appCopy.shellDescription}</p>
      </div>

      <nav aria-label="Application sections" className={styles['sidebar-nav']}>
        {workspaceGroups.map((group) => (
          <section className={styles['sidebar-section']} key={group}>
            <p className={styles['sidebar-section-label']}>{group}</p>

            <div className={styles['sidebar-link-list']}>
              {workspaceOptions
                .filter((workspace) => workspace.group === group)
                .map((workspace) => (
                  <button
                    key={workspace.id}
                    aria-pressed={activeView === workspace.id}
                    className={
                      activeView === workspace.id ? `${styles['sidebar-link']} ${styles['active']}` : styles['sidebar-link']
                    }
                    onClick={() => {
                      onViewChange(workspace.id);
                    }}
                    type="button"
                  >
                    <span className={styles['sidebar-link-copy']}>
                      <strong>{workspace.label}</strong>
                      <span>{workspace.description}</span>
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </nav>

      <div className={styles['sidebar-footer']}>
        <p className={styles['sidebar-footer-title']}>{appCopy.shellControlsTitle}</p>
        <p className={`muted ${styles['sidebar-footer-copy']}`}>{appCopy.shellControlsDescription}</p>
      </div>
    </aside>
  );
}
