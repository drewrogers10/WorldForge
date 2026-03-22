import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { workspaceOptions, type WorkspaceView } from '@renderer/lib/forms';
import { appCopy } from '@renderer/lib/copy';
import { Sidebar } from './Sidebar';
import { TemporalDock } from './TemporalDock';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './AppShell.module.css';

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCompactShell, setIsCompactShell] = useState(false);
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [shellTopHeight, setShellTopHeight] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const topbarRef = useRef<HTMLDivElement | null>(null);

  const activeView = (location.pathname.replace('/', '') || 'overview') as WorkspaceView;

  const {
    committedTick,
    previewTick,
    timelineAnchors,
    timelineBounds,
    setCommittedTick,
    setPreviewTick,
    refreshTimeline,
  } = useTemporalStore();

  const { errorMessage, isRefreshing, setIsRefreshing } = useUiStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1180px)');

    const syncShellMode = () => {
      const nextIsCompactShell = mediaQuery.matches;
      setIsCompactShell(nextIsCompactShell);

      if (!nextIsCompactShell) {
        setIsSidebarDrawerOpen(false);
      }
    };

    syncShellMode();
    mediaQuery.addEventListener('change', syncShellMode);

    return () => {
      mediaQuery.removeEventListener('change', syncShellMode);
    };
  }, []);

  useEffect(() => {
    if (isCompactShell) {
      setIsSidebarDrawerOpen(false);
    }
  }, [isCompactShell, location.pathname]);

  useEffect(() => {
    const topbarNode = topbarRef.current;

    if (!topbarNode) {
      return;
    }

    const updateShellTopHeight = () => {
      setShellTopHeight(`${Math.ceil(topbarNode.getBoundingClientRect().height)}px`);
    };

    updateShellTopHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateShellTopHeight();
    });

    observer.observe(topbarNode);
    window.addEventListener('resize', updateShellTopHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateShellTopHeight);
    };
  }, []);

  const handleTimelineJump = (tick: number) => {
    setCommittedTick(tick);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTimeline();
      window.dispatchEvent(new Event('app:refreshList'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSidebarToggle = () => {
    if (isCompactShell) {
      setIsSidebarDrawerOpen((previousValue) => !previousValue);
      return;
    }

    setIsSidebarCollapsed((previousValue) => !previousValue);
  };

  const sidebarToggleLabel = isCompactShell
    ? isSidebarDrawerOpen
      ? 'Close navigation'
      : 'Open navigation'
    : isSidebarCollapsed
      ? 'Show sidebar'
      : 'Collapse sidebar';

  const shellClassName = [
    styles['app-shell'],
    !isCompactShell && isSidebarCollapsed ? styles['sidebar-collapsed'] : '',
    isCompactShell && isSidebarDrawerOpen ? styles['sidebar-drawer-open'] : '',
    isTimelineExpanded ? styles['timeline-expanded'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shellStyle = shellTopHeight
    ? ({ '--shell-top-height': shellTopHeight } as CSSProperties)
    : undefined;

  return (
    <div className={shellClassName} style={shellStyle}>
      {isCompactShell && isSidebarDrawerOpen && (
        <button
          aria-label="Close navigation"
          className={styles['shell-scrim']}
          onClick={() => setIsSidebarDrawerOpen(false)}
          type="button"
        />
      )}

      <div className={styles['sidebar-slot']}>
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => {
            navigate(`/${view}`);
            setIsSidebarDrawerOpen(false);
          }}
        />
      </div>

      <div className={styles['topbar-slot']}>
        <div
          aria-label="Application functions"
          className={styles['app-topbar']}
          ref={topbarRef}
          role="toolbar"
        >
          <div className={styles['topbar-leading']}>
            <div className={styles['topbar-summary']}>
              <p className="eyebrow">{appCopy.brand}</p>
              <p className={styles['topbar-title']}>{appCopy.shellName}</p>
            </div>

            <div className={styles['topbar-actions']}>
              <ThemeSwitcher />
              <button
                className="secondary-button"
                onClick={handleSidebarToggle}
                type="button"
              >
                {sidebarToggleLabel}
              </button>
              <button
                className="secondary-button"
                disabled={isRefreshing}
                onClick={() => { void handleRefresh(); }}
                type="button"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh data'}
              </button>
            </div>
          </div>

          <nav aria-label="General workspace navigation" className={styles['function-bar-nav']}>
            {workspaceOptions.map((workspace) => (
              <button
                key={workspace.id}
                aria-pressed={activeView === workspace.id}
                className={activeView === workspace.id ? `${styles['function-bar-link']} ${styles['active']}` : styles['function-bar-link']}
                onClick={() => navigate(`/${workspace.id}`)}
                type="button"
              >
                <span className={styles['function-bar-link-label']}>{workspace.label}</span>
                <span className={styles['function-bar-link-group']}>{workspace.group}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className={styles['timeline-slot']}>
        <TemporalDock
          committedTick={committedTick}
          onExpandedChange={setIsTimelineExpanded}
          onTimelineCommit={setCommittedTick}
          onTimelineJump={handleTimelineJump}
          onTimelinePreview={setPreviewTick}
          previewTick={previewTick}
          timelineAnchors={timelineAnchors}
          timelineBounds={timelineBounds}
        />
      </div>

      <main className={styles['app-main']}>
        {errorMessage && <div className="status error">{errorMessage}</div>}

        <div className={styles['app-body']}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -5 }}
              initial={{ opacity: 0, scale: 0.99, y: 5 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
