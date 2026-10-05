import { useEffect, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { PRESENTATION_CODE_HASH } from '../config/presentationMode';

const KEY = 'cookeat_presentation_mode';
let enabled = false;
let hydrated: Promise<void> | undefined;
const listeners = new Set<() => void>();
function emit() { listeners.forEach(listener => listener()); }
export function hydratePresentationMode() {
  return hydrated ||= SecureStore.getItemAsync(KEY).then(value => { enabled = value === PRESENTATION_CODE_HASH; emit(); }).catch(() => undefined);
}
export function usePresentationMode() {
  useEffect(() => { void hydratePresentationMode(); }, []);
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => enabled, () => false);
}
export function validPresentationCode(code: string) {
  return bytesToHex(sha256(utf8ToBytes(code.trim().toUpperCase()))) === PRESENTATION_CODE_HASH;
}
export async function activatePresentationMode(code: string) {
  await hydratePresentationMode();
  if (!validPresentationCode(code)) return false;
  await SecureStore.setItemAsync(KEY, PRESENTATION_CODE_HASH);
  enabled = true; emit(); return true;
}
export async function disablePresentationMode() {
  await hydratePresentationMode();
  await SecureStore.deleteItemAsync(KEY);
  enabled = false; emit();
}
