import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { WorkspaceView } from '@renderer/lib/forms';
import {
  buildSidebarTreeNodes,
  isSidebarFolderExpanded,
  resolveSidebarSelection,
  type SidebarFolderExpansionState,
  type SidebarFolderId,
  type SidebarSelectableNode,
} from '@renderer/lib/sidebarTree';
import { appCopy } from '@renderer/lib/copy';
import { Sidebar } from './Sidebar';
import { TemporalDock } from './TemporalDock';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './AppShell.module.css';

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCompactShell, setIsCompactShell] = useState(false);
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const [sidebarExpansionState, setSidebarExpansionState] = useState<SidebarFolderExpansionState>({});
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [shellTopHeight, setShellTopHeight] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const topbarRef = useRef<HTMLDivElement | null>(null);

  const activeView = (location.pathname.replace('/', '') || 'overview') as WorkspaceView;
  const isMapsView = activeView === 'maps';

  const {
    committedTick,
    previewTick,
    timelineAnchors,
    timelineBounds,
    setCommittedTick,
    setPreviewTick,
    refreshTimeline,
  } = useTemporalStore();
  const tick = previewTick ?? committedTick;

  const {
    characters: sidebarCharacters,
    events: sidebarEvents,
    isLoading: isSidebarLoading,
    items: sidebarItems,
    loadSidebarData,
    locations: sidebarLocations,
    maps: sidebarMaps,
  } = useSidebarStore();
  const {
    selectedCharacterId,
    selectedEventId,
    selectedItemId,
    selectedLocationId,
    selectedMapId,
    setSelectedCharacterId,
    setSelectedEventId,
    setSelectedItemId,
    setSelectedLocationId,
    setSelectedMapId,
  } = useEntityStore();

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
    void loadSidebarData(tick);
  }, [loadSidebarData, tick]);

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
      await Promise.all([
        refreshTimeline(),
        loadSidebarData(tick),
      ]);
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

  const sidebarNodes = buildSidebarTreeNodes({
    activeView,
    data: {
      characters: sidebarCharacters,
      events: sidebarEvents,
      items: sidebarItems,
      locations: sidebarLocations,
      maps: sidebarMaps,
    },
    expansionState: sidebarExpansionState,
    selectionState: {
      selectedCharacterId,
      selectedEventId,
      selectedItemId,
      selectedLocationId,
      selectedMapId,
    },
  });

  const handleSidebarFolderToggle = (folderId: SidebarFolderId) => {
    setSidebarExpansionState((current) => ({
      ...current,
      [folderId]: !isSidebarFolderExpanded(folderId, activeView, current),
    }));
  };

  const handleSidebarNodeSelect = (node: SidebarSelectableNode) => {
    const selection = resolveSidebarSelection(node);

    if (!selection) {
      return;
    }

    switch (selection.entitySelection?.kind) {
      case 'character':
        setSelectedCharacterId(selection.entitySelection.id);
        break;
      case 'event':
        setSelectedEventId(selection.entitySelection.id);
        break;
      case 'item':
        setSelectedItemId(selection.entitySelection.id);
        break;
      case 'location':
        setSelectedLocationId(selection.entitySelection.id);
        break;
      case 'map':
        setSelectedMapId(selection.entitySelection.id);
        break;
      default:
        break;
    }

    navigate(`/${selection.route}`);
    setIsSidebarDrawerOpen(false);
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
  const appMainClassName = [
    styles['app-main'],
    isMapsView ? styles['app-main-full-bleed'] : '',
  ]
    .filter(Boolean)
    .join(' ');
  const appBodyClassName = [
    styles['app-body'],
    isMapsView ? styles['app-body-full-bleed'] : '',
  ]
    .filter(Boolean)
    .join(' ');
  const routeFrameClassName = [
    styles['route-frame'],
    isMapsView ? styles['route-frame-full-bleed'] : '',
  ]
    .filter(Boolean)
    .join(' ');

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
          isLoading={isSidebarLoading}
          nodes={sidebarNodes}
          onFolderToggle={handleSidebarFolderToggle}
          onNodeSelect={handleSidebarNodeSelect}
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

          <div aria-hidden="true" className={styles['function-bar-slot']} />
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

      <main className={appMainClassName}>
        {errorMessage && <div className="status error">{errorMessage}</div>}

        <div className={appBodyClassName}>
          <AnimatePresence mode="wait">
            <motion.div
              className={routeFrameClassName}
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
