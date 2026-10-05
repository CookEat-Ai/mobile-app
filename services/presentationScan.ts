import { useSyncExternalStore } from 'react';
const empty: readonly string[] = [];
let startedAt = 0;
export const PRESENTATION_SCAN_PHOTO_MS = 2600;
export function presentationScanPhotoIndex(count: number, now = Date.now()) { return count ? Math.floor(Math.max(0, now - startedAt) / PRESENTATION_SCAN_PHOTO_MS) % count : 0; }
let photos: readonly string[] = empty;
const listeners = new Set<() => void>();
export function startPresentationScan(uris: string[]) { startedAt = Date.now(); photos = [...uris]; listeners.forEach(listener => listener()); }
export function finishPresentationScan() { photos = empty; listeners.forEach(listener => listener()); }
export function usePresentationScanPhotos() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => photos, () => empty);
}
