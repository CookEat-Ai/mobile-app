import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@cookeat_catalog_response_cache_v1';
const MAX_ENTRIES = 80;
const MAX_MEMORY_CHARS = 3_000_000;
const MAX_DISK_CHARS = 1_000_000;
const CATALOG_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export type ReadOptions = { forceRefresh?: boolean };
type Group = 'catalog' | 'personal';
export type CachePolicy = { group: Group; ttl: number };
type Response<T> = { data?: T; error?: string; status?: number; message?: string };
type Entry = { key: string; body: string; writtenAt: number; group: Group };

// Only these reads may be cached. Health, config, credentials and access checks
// always reach the server. All query parameters are retained in the cache key.
export function responseCachePolicy(endpoint: string): CachePolicy | null {
  const path = endpoint.split('?')[0];
  if (path === '/catalog/cuisines') return { group: 'catalog', ttl: 24 * 60 * 60 * 1000 };
  if (/^\/catalog\/recipes\/[^/]+$/.test(path)) return { group: 'catalog', ttl: 30 * 60 * 1000 };
  if (path === '/catalog/recipes') return { group: 'catalog', ttl: 5 * 60 * 1000 };
  if (path === '/recipe' || /^\/recipe\/(?:detail|history)\/[^/]+$/.test(path)
      || /^\/recipe\/favorites\/[^/]+(?:\/check\/[^/]+)?$/.test(path)) {
    return { group: 'personal', ttl: 30 * 1000 };
  }
  if (/^\/meal-plans\/(?:user\/[^/]+(?:\/all)?|[^/]+)$/.test(path)) {
    return { group: 'personal', ttl: 15 * 1000 };
  }
  return null;
}

export class ResponseCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, { group: Group; request: Promise<Response<unknown>> }>();
  private revisions = { catalog: 0, personal: 0 };
  private hydration: Promise<void> | null = null;
  private nextSnapshot: string | null = null;
  private writing = false;

  invalidatePersonal() {
    this.revisions.personal++;
    for (const [key, entry] of this.entries) {
      if (entry.group === 'personal') this.entries.delete(key);
    }
    // Old requests may finish, but can neither refill the cache nor be reused.
    for (const [key, pending] of this.pending) {
      if (pending.group === 'personal') this.pending.delete(key);
    }
  }

  private async hydrate() {
    this.hydration ??= (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || raw.length > MAX_DISK_CHARS) return;
        const saved: unknown = JSON.parse(raw);
        if (!Array.isArray(saved)) return;
        for (const entry of saved.slice(-MAX_ENTRIES)) {
          if (entry?.group !== 'catalog' || typeof entry.key !== 'string'
              || typeof entry.body !== 'string' || !Number.isFinite(entry.writtenAt)) continue;
          const age = Date.now() - entry.writtenAt;
          if (age < 0 || age >= CATALOG_MAX_AGE) continue;
          try {
            const response = JSON.parse(entry.body);
            if (response?.data?.success !== true || response.error) continue;
            this.entries.set(entry.key, entry);
          } catch { /* Corrupt entries cannot prevent a network request. */ }
        }
        this.trim();
      } catch { /* Storage is optional; keep the network path available. */ }
    })();
    await this.hydration;
  }

  private trim() {
    let size = [...this.entries.values()].reduce((sum, entry) => sum + entry.key.length + entry.body.length, 0);
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= MAX_ENTRIES && size <= MAX_MEMORY_CHARS) break;
      this.entries.delete(key);
      size -= key.length + entry.body.length;
    }
  }

  private persist() {
    // Coalesce snapshots while a write is running: slow storage must not build
    // an unbounded queue of large strings. Only public data goes to disk.
    const entries = [...this.entries.values()].filter(entry => entry.group === 'catalog'
      && Date.now() - entry.writtenAt < CATALOG_MAX_AGE);
    let snapshot = JSON.stringify(entries);
    while (snapshot.length > MAX_DISK_CHARS && entries.length) {
      entries.shift();
      snapshot = JSON.stringify(entries);
    }
    this.nextSnapshot = snapshot;
    if (this.writing) return;
    this.writing = true;
    void (async () => {
      try {
        while (this.nextSnapshot !== null) {
          const latest = this.nextSnapshot;
          this.nextSnapshot = null;
          try { await AsyncStorage.setItem(STORAGE_KEY, latest); }
          catch { /* The in-memory cache remains usable if storage is full. */ }
        }
      } finally { this.writing = false; }
    })();
  }

  async read<T>(key: string, policy: CachePolicy, load: () => Promise<Response<T>>, options: ReadOptions = {}): Promise<Response<T>> {
    if (policy.group === 'catalog') await this.hydrate();
    const candidate = this.entries.get(key);
    const cached = candidate?.group === policy.group ? candidate : undefined;
    const age = cached ? Date.now() - cached.writtenAt : Infinity;
    if (!options.forceRefresh && cached && age >= 0 && age < policy.ttl) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      // Screens can edit their own state without mutating the cached snapshot.
      return JSON.parse(cached.body);
    }

    const existing = this.pending.get(key);
    if (existing && !options.forceRefresh) return existing.request as Promise<Response<T>>;
    const revision = this.revisions[policy.group];
    let request!: Promise<Response<T>>;
    request = (async () => {
      const response = await load();
      if (revision !== this.revisions[policy.group] || this.pending.get(key)?.request !== request) return response;
      const fallbackAge = cached ? Date.now() - cached.writtenAt : Infinity;
      if (response.data != null && !response.error
          && (response.data as { success?: boolean }).success === true) {
        try {
          const body = JSON.stringify(response);
          if (body.length + key.length <= MAX_MEMORY_CHARS) {
            this.entries.delete(key);
            this.entries.set(key, { key, body, writtenAt: Date.now(), group: policy.group });
            this.trim();
            if (policy.group === 'catalog') this.persist();
          }
        } catch { /* Non-serializable responses are simply not cached. */ }
      } else if (cached && fallbackAge >= 0 && fallbackAge < CATALOG_MAX_AGE
          && policy.group === 'catalog' && response.error
          && (response.status === undefined || response.status >= 500)) {
        // Public recipes remain readable during an outage. Never mask 4xx,
        // entitlement errors, or return stale personal data.
        return options.forceRefresh ? response : JSON.parse(cached.body);
      } else {
        this.entries.delete(key);
        if (policy.group === 'catalog') this.persist();
      }
      return response;
    })();
    this.pending.set(key, { group: policy.group, request: request as Promise<Response<unknown>> });
    try { return await request; }
    finally { if (this.pending.get(key)?.request === request) this.pending.delete(key); }
  }
}

export const responseCache = new ResponseCache();
