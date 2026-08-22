type Listener = () => void;

const completed = new Set<string>();
const listeners = new Map<string, Set<Listener>>();

/** Relie un loader modal à une génération déjà pilotée par l'écran sous-jacent. */
export function completeGenerationLoading(key: string) {
  completed.add(key);
  listeners.get(key)?.forEach((listener) => listener());
}

export function subscribeGenerationLoading(key: string, listener: Listener) {
  const keyListeners = listeners.get(key) ?? new Set<Listener>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);

  if (completed.has(key)) listener();

  return () => {
    const current = listeners.get(key);
    current?.delete(listener);
    if (current?.size === 0) listeners.delete(key);
    completed.delete(key);
  };
}
