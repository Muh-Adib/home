/**
 * Request Cache Utility - React Query Pattern
 * 
 * Features:
 * - Request deduplication (prevent duplicate fetches)
 * - In-memory caching with TTL
 * - Exponential backoff retry
 * - AbortController for cleanup
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface PendingRequest<T> {
    promise: Promise<T>;
    abortController: AbortController;
}

class RequestCache {
    private cache = new Map<string, CacheEntry<any>>();
    private pendingRequests = new Map<string, PendingRequest<any>>();
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Generate cache key from URL and params
     */
    private getCacheKey(url: string, params?: Record<string, any>): string {
        const paramStr = params ? JSON.stringify(params) : '';
        return `${url}::${paramStr}`;
    }

    /**
     * Get cached data if valid
     */
    private getCached<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cache entry
     */
    private setCache<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttl,
        });
    }

    /**
     * Fetch with deduplication, caching, and retry
     */
    async fetch<T>(
        url: string,
        options: {
            params?: Record<string, any>;
            ttl?: number;
            maxRetries?: number;
            skipCache?: boolean;
        } = {}
    ): Promise<T> {
        const { params, ttl = this.defaultTTL, maxRetries = 3, skipCache = false } = options;
        const cacheKey = this.getCacheKey(url, params);

        // 1. Check cache first (unless skipped)
        if (!skipCache) {
            const cached = this.getCached<T>(cacheKey);
            if (cached) {
                console.log('[RequestCache] ✅ Cache HIT:', cacheKey);
                return cached;
            }
        }

        // 2. Check if request is already pending (deduplication)
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
            console.log('[RequestCache] ⏳ Request PENDING, reusing:', cacheKey);
            return pending.promise as Promise<T>;
        }

        // 3. Create new request with AbortController
        const abortController = new AbortController();

        const requestPromise = this.executeWithRetry<T>(
            url,
            params,
            abortController,
            maxRetries
        ).then((data) => {
            // Success - cache the result
            this.setCache(cacheKey, data, ttl);
            this.pendingRequests.delete(cacheKey);
            return data;
        }).catch((error) => {
            // Failure - remove from pending
            this.pendingRequests.delete(cacheKey);
            throw error;
        });

        // Store as pending
        this.pendingRequests.set(cacheKey, {
            promise: requestPromise,
            abortController,
        });

        return requestPromise;
    }

    /**
     * Execute request with exponential backoff retry
     */
    private async executeWithRetry<T>(
        url: string,
        params: Record<string, any> | undefined,
        abortController: AbortController,
        maxRetries: number,
        attempt: number = 1
    ): Promise<T> {
        try {
            // Build query string
            const queryString = params
                ? '?' + new URLSearchParams(params as Record<string, string>).toString()
                : '';

            const response = await fetch(url + queryString, {
                signal: abortController.signal,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            console.log(`[RequestCache] ✅ Fetch SUCCESS (attempt ${attempt}):`, url);
            return data as T;

        } catch (error: any) {
            // Don't retry if aborted
            if (error.name === 'AbortError') {
                console.log('[RequestCache] ⚠️ Request aborted:', url);
                throw error;
            }

            // Retry with exponential backoff
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
                console.log(`[RequestCache] 🔄 Retry ${attempt}/${maxRetries} after ${delay}ms:`, url);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeWithRetry(url, params, abortController, maxRetries, attempt + 1);
            }

            // Max retries reached
            console.error(`[RequestCache] ❌ Failed after ${maxRetries} attempts:`, error);
            throw error;
        }
    }

    /**
     * Cancel pending request
     */
    cancel(url: string, params?: Record<string, any>): void {
        const cacheKey = this.getCacheKey(url, params);
        const pending = this.pendingRequests.get(cacheKey);

        if (pending) {
            pending.abortController.abort();
            this.pendingRequests.delete(cacheKey);
            console.log('[RequestCache] 🛑 Request cancelled:', cacheKey);
        }
    }

    /**
     * Clear cache entry
     */
    invalidate(url: string, params?: Record<string, any>): void {
        const cacheKey = this.getCacheKey(url, params);
        this.cache.delete(cacheKey);
        console.log('[RequestCache] 🗑️ Cache invalidated:', cacheKey);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        this.pendingRequests.forEach(req => req.abortController.abort());
        this.pendingRequests.clear();
        console.log('[RequestCache] 🗑️ All cache cleared');
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            pendingRequests: this.pendingRequests.size,
        };
    }
}

// Export singleton instance
export const requestCache = new RequestCache();
