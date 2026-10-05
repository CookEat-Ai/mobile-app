import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { getUniqueDeviceId } from './deviceStorage';

const KEY = 'cookeat_anonymous_session_v1';
let pending: Promise<string> | null = null;
let ready: { mobileId: string; token: string } | null = null;

export async function getAnonymousSessionToken(): Promise<string> {
  const mobileId = await getUniqueDeviceId();
  if (ready?.mobileId === mobileId) return ready.token;
  if (!pending) pending = (async () => {
    const raw = await SecureStore.getItemAsync(KEY);
    let stored = raw ? JSON.parse(raw) as { mobileId: string; token: string } : null;
    if (!stored || stored.mobileId !== mobileId) {
      const response = await fetch(`${API_BASE_URL}/user/session/credential`, {
        method: 'POST', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error('session_unavailable');
      const data = await response.json();
      if (!/^[a-f0-9]{64}$/.test(data.token)) throw new Error('session_unavailable');
      stored = { mobileId, token: data.token };
      // Persist before binding so retrying never loses ownership.
      await SecureStore.setItemAsync(KEY, JSON.stringify(stored));
    }
    const response = await fetch(`${API_BASE_URL}/user/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stored.token}` },
      body: JSON.stringify({ mobileId }), signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('session_unavailable');
    const data = await response.json();
    if (!data.userId) throw new Error('session_unavailable');
    await AsyncStorage.setItem('userId', String(data.userId));
    ready = stored;
    return stored.token;
  })().finally(() => { pending = null; });
  return pending;
}

export function invalidateAnonymousSession(): void { ready = null; }

/** Recover identity when onboarding continued while the API was unavailable. */
export async function getAnonymousUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem('userId');
  if (existing) return existing;
  // A cached token alone cannot restore an AsyncStorage entry that was removed.
  invalidateAnonymousSession();
  await getAnonymousSessionToken();
  const userId = await AsyncStorage.getItem('userId');
  if (!userId) throw new Error('session_unavailable');
  return userId;
}
