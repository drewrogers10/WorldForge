export type WorkspaceMode = 'browse' | 'create' | 'edit';
export type TopBarActionVariant = 'primary' | 'secondary' | 'danger';

export type TopBarActionSpec = {
  disabled?: boolean | undefined;
  id: string;
  label: string;
  onSelect: () => void | Promise<void>;
  variant: TopBarActionVariant;
  visible?: boolean | undefined;
};

export type TopBarConfig = {
  actions: TopBarActionSpec[];
  isBusy?: boolean | undefined;
  modeLabel?: string | undefined;
  selectionLabel?: string | undefined;
};

export type RegisteredTopBarConfig = Omit<Partial<TopBarConfig>, 'actions'> & {
  actions?: TopBarActionSpec[];
  confirmNavigation?: () => boolean;
};

export function isVisibleTopBarAction(action: TopBarActionSpec): boolean {
  return action.visible !== false;
}
