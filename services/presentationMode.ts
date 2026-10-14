import { useEffect, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { PRESENTATION_CODE_HASH } from '../config/presentationMode';

const KEY = 'cookeat_presentation_mode';
let enabled = false;
let preference: string | null = null;
let hydrated: Promise<void> | undefined;
const listeners = new Set<() => void>();
function emit() { listeners.forEach(listener => listener()); }
export function hydratePresentationMode() {
  return hydrated ||= SecureStore.getItemAsync(KEY).then(value => { preference = value; enabled = value === PRESENTATION_CODE_HASH; emit(); }).catch(error => { hydrated = undefined; throw error; });
}
export async function isPresentationModeEnabled() {
  await hydratePresentationMode();
  return enabled;
}
export function usePresentationMode() {
  useEffect(() => { void hydratePresentationMode().catch(() => undefined); }, []);
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => enabled, () => false);
}
export function validPresentationCode(code: string) {
  return bytesToHex(sha256(utf8ToBytes(code.trim().toUpperCase()))) === PRESENTATION_CODE_HASH;
}
export async function activatePresentationMode(code: string) {
  await hydratePresentationMode();
  if (!validPresentationCode(code)) return false;
  await SecureStore.setItemAsync(KEY, PRESENTATION_CODE_HASH);
  preference = PRESENTATION_CODE_HASH;
  enabled = true; emit(); return true;
}
/** Called only after the server confirms bypass access; keep manual opt-outs. */
export async function enablePresentationModeByDefault() {
  await hydratePresentationMode();
  if (preference !== null) return;
  await SecureStore.setItemAsync(KEY, PRESENTATION_CODE_HASH);
  preference = PRESENTATION_CODE_HASH;
  enabled = true; emit();
}
export async function disablePresentationMode() {
  await hydratePresentationMode();
  await SecureStore.setItemAsync(KEY, 'disabled');
  preference = 'disabled';
  enabled = false; emit();
}
