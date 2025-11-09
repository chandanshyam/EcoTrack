/**
 * Caching utilities for EcoTrack application
 */

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export type CacheOptions = {
    
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
}

/**
 * In-memory cache with TTL support
 */
export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100; // 100 entries default
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.maxSize
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      cleaned++;
    });

    return cleaned;
  }
}

/**
 * Browser storage cache with TTL support
 */
export class StorageCache<T> {
  private readonly storageKey: string;
  private readonly defaultTTL: number;
  private readonly storage: Storage;

  constructor(
    storageKey: string, 
    options: CacheOptions = {},
    useSessionStorage = false
  ) {
    this.storageKey = storageKey;
    this.defaultTTL = options.ttl || 30 * 60 * 1000; // 30 minutes default
    this.storage = typeof window !== 'undefined' 
      ? (useSessionStorage ? sessionStorage : localStorage)
      : {} as Storage; // Fallback for SSR
  }

  /**
   * Generate cache key
   */
  private getCacheKey(key: string): string {
    return `${this.storageKey}:${key}`;
  }

  /**
   * Get item from storage cache
   */
  get(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = this.getCacheKey(key);
      const stored = this.storage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.storage.removeItem(cacheKey);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Storage cache get error:', error);
      return null;
    }
  }

  /**
   * Set item in storage cache
   */
  set(key: string, data: T, ttl?: number): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = this.getCacheKey(key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL
      };

      this.storage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error: unknown) {
      console.warn('Storage cache set error:', error);
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanup();
        // Try again after cleanup
        try {
          const cacheKey = this.getCacheKey(key);
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
          };
          this.storage.setItem(cacheKey, JSON.stringify(entry));
        } catch (retryError) {
          console.warn('Storage cache retry failed:', retryError);
        }
      }
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete item from storage cache
   */
  delete(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = this.getCacheKey(key);
      this.storage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Storage cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries for this storage key
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      const prefix = `${this.storageKey}:`;

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.warn('Storage cache clear error:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    if (typeof window === 'undefined') return 0;

    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      const prefix = `${this.storageKey}:`;

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const stored = this.storage.getItem(key);
            if (stored) {
              const entry: CacheEntry<any> = JSON.parse(stored);
              if (now - entry.timestamp > entry.ttl) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            // Remove invalid entries
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
      return keysToRemove.length;
    } catch (error) {
      console.warn('Storage cache cleanup error:', error);
      return 0;
    }
  }
}

// Cache instances for different data types
export const routeCache = new MemoryCache<any>({
  ttl: 60 * 60 * 1000, // 1 hour for routes
  maxSize: 50
});

export const locationCache = new StorageCache<any>('ecotrack-locations', {
  ttl: 24 * 60 * 60 * 1000, // 24 hours for locations
});

export const userPreferencesCache = new StorageCache<any>('ecotrack-preferences', {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days for user preferences
});

/**
 * Generate cache key for route requests
 */
export function generateRouteKey(
  origin: string,
  destination: string,
  transportModes?: string[],
  preferences?: any
): string {
  const key = [
    origin.toLowerCase().trim(),
    destination.toLowerCase().trim(),
    transportModes?.sort().join(',') || 'default',
    preferences ? JSON.stringify(preferences) : 'no-prefs'
  ].join('|');

  // Create a simple hash to keep keys manageable
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

/**
 * Cache wrapper for async functions
 */
export function withCache<T extends any[], R>(
  cache: MemoryCache<R> | StorageCache<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return function cacheWrapper(fn: (...args: T) => Promise<R>) {
    return async (...args: T): Promise<R> => {
      const key = keyGenerator(...args);
      
      // Try to get from cache first
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn(...args);
      cache.set(key, result, ttl);
      
      return result;
    };
  };
}

// Periodic cleanup for memory cache
if (typeof window !== 'undefined') {
  // Clean up expired entries every 10 minutes
  setInterval(() => {
    routeCache.cleanup();
  }, 10 * 60 * 1000);

  // Clean up storage caches every hour
  setInterval(() => {
    locationCache.cleanup();
    userPreferencesCache.cleanup();
  }, 60 * 60 * 1000);
}