import { appCopy } from '@renderer/lib/copy';
import type {
  SidebarExpandableId,
  SidebarRecordNode,
  SidebarSectionNode,
  SidebarSelectableNode,
  SidebarTreeNode,
  SidebarWorkspaceNode,
} from '@renderer/lib/sidebarTree';
import styles from './Sidebar.module.css';

type SidebarProps = {
  isLoading: boolean;
  nodes: SidebarTreeNode[];
  onNodeSelect: (node: SidebarSelectableNode) => void;
  onNodeToggle: (nodeId: SidebarExpandableId) => void;
};

export function Sidebar({
  isLoading,
  nodes,
  onNodeSelect,
  onNodeToggle,
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
            if (node.type === 'home') {
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

            return (
              <SidebarSection
                key={node.id}
                node={node}
                onNodeSelect={onNodeSelect}
                onNodeToggle={onNodeToggle}
              />
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

type SidebarSectionProps = {
  node: SidebarSectionNode;
  onNodeSelect: (node: SidebarSelectableNode) => void;
  onNodeToggle: (nodeId: SidebarExpandableId) => void;
};

function SidebarSection({
  node,
  onNodeSelect,
  onNodeToggle,
}: SidebarSectionProps) {
  return (
    <li className={styles['sidebar-tree-item']}>
      <div
        className={`${styles['sidebar-row']} ${node.isCurrent ? styles['current'] : ''}`}
      >
        {node.isExpandable ? (
          <button
            aria-expanded={node.isExpanded}
            aria-label={node.isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            className={styles['sidebar-toggle']}
            onClick={() => {
              onNodeToggle(node.id as SidebarExpandableId);
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
        ) : (
          <span aria-hidden="true" className={styles['sidebar-row-spacer']} />
        )}

        <button
          aria-current={node.isCurrent ? 'page' : undefined}
          className={styles['sidebar-row-button']}
          onClick={() => {
            onNodeSelect(node);
          }}
          type="button"
        >
          <span className={styles['sidebar-row-label']}>{node.label}</span>
          {node.count !== null ? <span className={styles['sidebar-badge']}>{node.count}</span> : null}
        </button>
      </div>

      {node.isExpandable && node.isExpanded ? (
        <ul className={styles['sidebar-section-children']}>
          {node.children.map((child) => (
            <SidebarWorkspace
              key={child.id}
              node={child}
              onNodeSelect={onNodeSelect}
              onNodeToggle={onNodeToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type SidebarWorkspaceProps = {
  node: SidebarWorkspaceNode;
  onNodeSelect: (node: SidebarSelectableNode) => void;
  onNodeToggle: (nodeId: SidebarExpandableId) => void;
};

function SidebarWorkspace({
  node,
  onNodeSelect,
  onNodeToggle,
}: SidebarWorkspaceProps) {
  return (
    <li className={styles['sidebar-workspace-item']}>
      <div
        className={`${styles['sidebar-row']} ${styles['sidebar-workspace-row']} ${node.isCurrent ? styles['current'] : ''}`}
      >
        {node.isExpandable ? (
          <button
            aria-expanded={node.isExpanded}
            aria-label={node.isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            className={`${styles['sidebar-toggle']} ${styles['sidebar-workspace-toggle']}`}
            onClick={() => {
              onNodeToggle(node.id as SidebarExpandableId);
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
        ) : (
          <span
            aria-hidden="true"
            className={`${styles['sidebar-row-spacer']} ${styles['sidebar-workspace-spacer']}`}
          />
        )}

        <button
          aria-current={node.isCurrent ? 'page' : undefined}
          className={`${styles['sidebar-row-button']} ${styles['sidebar-workspace-button']}`}
          onClick={() => {
            onNodeSelect(node);
          }}
          type="button"
        >
          <span className={`${styles['sidebar-row-label']} ${styles['sidebar-workspace-label']}`}>
            {node.label}
          </span>
          {node.count !== null ? <span className={styles['sidebar-badge']}>{node.count}</span> : null}
        </button>
      </div>

      {node.isExpandable && node.isExpanded ? (
        <ul className={styles['sidebar-workspace-children']}>
          {node.children.length === 0 ? (
            <li className={styles['sidebar-empty']}>No records yet.</li>
          ) : null}

          {node.children.map((child) => (
            <SidebarRecord key={child.id} node={child} onNodeSelect={onNodeSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type SidebarRecordProps = {
  node: SidebarRecordNode;
  onNodeSelect: (node: SidebarSelectableNode) => void;
};

function SidebarRecord({
  node,
  onNodeSelect,
}: SidebarRecordProps) {
  return (
    <li className={styles['sidebar-child-item']}>
      <button
        aria-current={node.isCurrent ? 'page' : undefined}
        className={`${styles['sidebar-child-button']} ${node.isCurrent ? styles['currentChild'] : ''}`}
        onClick={() => {
          onNodeSelect(node);
        }}
        type="button"
      >
        <span aria-hidden="true" className={styles['sidebar-child-marker']} />
        <span className={styles['sidebar-child-label']}>{node.label}</span>
      </button>
    </li>
  );
}
