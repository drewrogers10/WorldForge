import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { RegisteredTopBarConfig } from '@renderer/lib/topBar';

type TopBarControlsContextValue = {
  clearConfig: () => void;
  setConfig: (config: RegisteredTopBarConfig) => void;
};

const TopBarControlsContext = createContext<TopBarControlsContextValue | null>(null);

type TopBarControlsProviderProps = {
  children: ReactNode;
  value: TopBarControlsContextValue;
};

export function TopBarControlsProvider({
  children,
  value,
}: TopBarControlsProviderProps) {
  return (
    <TopBarControlsContext.Provider value={value}>
      {children}
    </TopBarControlsContext.Provider>
  );
}

export function useTopBarControls(config: RegisteredTopBarConfig | null): void {
  const controls = useContext(TopBarControlsContext);

  if (!controls) {
    throw new Error('useTopBarControls must be used within TopBarControlsProvider.');
  }

  useEffect(() => {
    if (!config) {
      controls.clearConfig();
      return;
    }

    controls.setConfig(config);
  }, [config, controls]);

  useEffect(
    () => () => {
      controls.clearConfig();
    },
    [controls],
  );
}
