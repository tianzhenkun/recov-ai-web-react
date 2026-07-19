export type FloatingProcessPanelDefaultMode = 'normal' | 'docked';

const storageKey = 'recov:floating-process-panel-default-mode';

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const isDefaultMode = (
  value: string | null,
): value is FloatingProcessPanelDefaultMode =>
  value === 'normal' || value === 'docked';

export const getStoredFloatingProcessPanelDefaultMode =
  (): FloatingProcessPanelDefaultMode => {
    if (!canUseStorage()) return 'normal';
    const storedValue = localStorage.getItem(storageKey);
    return isDefaultMode(storedValue) ? storedValue : 'normal';
  };

export const setStoredFloatingProcessPanelDefaultMode = (
  value: FloatingProcessPanelDefaultMode,
) => {
  if (canUseStorage()) localStorage.setItem(storageKey, value);
};
