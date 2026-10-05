import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pantryIngredientKey } from './planningPantry';

const STORAGE = 'cookeat_pantry_category_assignments';
let assignments: Record<string, string> = {};
let loading: Promise<void> | undefined;
let writes = Promise.resolve();
const listeners = new Set<() => void>();
function emit() { listeners.forEach(listener => listener()); }
function load() {
  return loading ||= AsyncStorage.getItem(STORAGE).then(raw => {
    const parsed = raw ? JSON.parse(raw) : {};
    const valid = Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
    assignments = { ...valid, ...assignments }; emit();
  }).catch(() => undefined);
}
export function usePantryCategoryAssignments() {
  useEffect(() => { void load(); }, []);
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => assignments, () => assignments);
}
export async function rememberPantryCategory(name: string, categoryId: string) {
  await load();
  assignments = { ...assignments, [pantryIngredientKey(name)]: categoryId }; emit();
  const snapshot = JSON.stringify(assignments);
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE, snapshot));
  await writes;
}
