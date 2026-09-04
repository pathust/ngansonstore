// High-performance Multi-tier Cache Manager (In-Memory + LocalStorage fallback)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private prefix = 'omnierp_cache_';
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  public get<T>(key: string, maxAgeMs: number = this.defaultTTL): T | null {
    // 1. Check in-memory cache (0ms)
    const mem = this.memoryCache.get(key);
    const now = Date.now();
    if (mem && now - mem.timestamp < maxAgeMs) {
      return mem.data as T;
    }

    // 2. Check localStorage cache
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (now - parsed.timestamp < maxAgeMs) {
          // Re-populate memory cache
          this.memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch (e) {
      // ignore JSON error
    }

    return null;
  }

  public set<T>(key: string, data: T, etag?: string): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag,
    };
    // Keep 100% full dataset in memory for instant access
    this.memoryCache.set(key, entry);
    try {
      // For localStorage fallback, cap large arrays to 200 to strictly avoid 5MB quota exhaustion
      let storageData: any = data;
      if (Array.isArray(data) && data.length > 200) {
        storageData = data.slice(0, 200);
      }
      const storageEntry: CacheEntry<any> = {
        ...entry,
        data: storageData,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(storageEntry));
    } catch (e) {
      // LocalStorage quota might be exceeded, clear older keys
      this.pruneOldest();
    }
  }

  public invalidate(keyOrPrefix: string): void {
    // Remove from memory
    for (const k of this.memoryCache.keys()) {
      if (k.startsWith(keyOrPrefix)) {
        this.memoryCache.delete(k);
      }
    }
    // Remove from localStorage - collect keys first to avoid index shifting
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix + keyOrPrefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  public clearAll(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  private pruneOldest(): void {
    try {
      const entries: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '{}');
            entries.push({ key: k, timestamp: parsed.timestamp || 0 });
          } catch {}
        }
      }
      entries.sort((a, b) => a.timestamp - b.timestamp);
      // Remove oldest 20%
      const removeCount = Math.max(1, Math.floor(entries.length * 0.2));
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(entries[i].key);
      }
    } catch {}
  }
}

export const cacheManager = new CacheManager();
