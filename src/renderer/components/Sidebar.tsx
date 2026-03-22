import { appCopy } from '@renderer/lib/copy';
import type {
  SidebarFolderId,
  SidebarSelectableNode,
  SidebarTreeNode,
} from '@renderer/lib/sidebarTree';
import styles from './Sidebar.module.css';

type SidebarProps = {
  isLoading: boolean;
  nodes: SidebarTreeNode[];
  onFolderToggle: (folderId: SidebarFolderId) => void;
  onNodeSelect: (node: SidebarSelectableNode) => void;
};

export function Sidebar({
  isLoading,
  nodes,
  onFolderToggle,
  onNodeSelect,
}: SidebarProps) {
  return (
    <aside className={styles['shell-sidebar']} id="app-sidebar">
      <div className={styles['sidebar-brand']}>
        <p className="eyebrow">{appCopy.brand}</p>
        <h1>{appCopy.shellName}</h1>
        <p className="muted">{appCopy.shellDescription}</p>
      </div>

      <nav aria-label="Application sections" className={styles['sidebar-nav']}>
        {isLoading ? (
          <p className={`muted ${styles['sidebar-status']}`}>Syncing record tree...</p>
        ) : null}

        <ul className={styles['sidebar-tree']}>
          {nodes.map((node) => {
            if (node.type === 'item') {
              return (
                <li className={styles['sidebar-tree-item']} key={node.id}>
                  <div
                    className={`${styles['sidebar-row']} ${node.isCurrent ? styles['current'] : ''}`}
                  >
                    <span aria-hidden="true" className={styles['sidebar-row-spacer']} />
                    <button
                      aria-current={node.isCurrent ? 'page' : undefined}
                      className={styles['sidebar-row-button']}
                      onClick={() => {
                        onNodeSelect(node);
                      }}
                      type="button"
                    >
                      <span className={styles['sidebar-row-label']}>{node.label}</span>
                    </button>
                  </div>
                </li>
              );
            }

            if (node.type === 'disabled-folder') {
              return (
                <li className={styles['sidebar-tree-item']} key={node.id}>
                  <div className={`${styles['sidebar-row']} ${styles['disabled']}`}>
                    <span aria-hidden="true" className={styles['sidebar-row-spacer']} />
                    <button
                      aria-disabled="true"
                      className={styles['sidebar-row-button']}
                      disabled
                      type="button"
                    >
                      <span className={styles['sidebar-row-label']}>{node.label}</span>
                      <span className={styles['sidebar-badge']}>Soon</span>
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li className={styles['sidebar-tree-item']} key={node.id}>
                <div
                  className={`${styles['sidebar-row']} ${node.isCurrent ? styles['current'] : ''}`}
                >
                  <button
                    aria-expanded={node.isExpanded}
                    aria-label={node.isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
                    className={styles['sidebar-toggle']}
                    onClick={() => {
                      onFolderToggle(node.id);
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`${styles['sidebar-toggle-indicator']} ${node.isExpanded ? styles['expanded'] : ''}`}
                    >
                      &gt;
                    </span>
                  </button>
                  <button
                    aria-current={node.isCurrent ? 'page' : undefined}
                    className={styles['sidebar-row-button']}
                    onClick={() => {
                      onNodeSelect(node);
                    }}
                    type="button"
                  >
                    <span className={styles['sidebar-row-label']}>{node.label}</span>
                    <span className={styles['sidebar-badge']}>{node.count}</span>
                  </button>
                </div>

                {node.isExpanded ? (
                  <ul className={styles['sidebar-children']}>
                    {node.children.length === 0 ? (
                      <li className={styles['sidebar-empty']}>No records yet.</li>
                    ) : null}

                    {node.children.map((child) => (
                      <li className={styles['sidebar-child-item']} key={child.id}>
                        <button
                          aria-current={child.isCurrent ? 'page' : undefined}
                          className={`${styles['sidebar-child-button']} ${child.isCurrent ? styles['currentChild'] : ''}`}
                          onClick={() => {
                            onNodeSelect(child);
                          }}
                          type="button"
                        >
                          <span aria-hidden="true" className={styles['sidebar-child-marker']} />
                          <span className={styles['sidebar-child-label']}>{child.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles['sidebar-footer']}>
        <p className={styles['sidebar-footer-title']}>{appCopy.shellControlsTitle}</p>
        <p className={`muted ${styles['sidebar-footer-copy']}`}>{appCopy.shellControlsDescription}</p>
      </div>
    </aside>
  );
}
