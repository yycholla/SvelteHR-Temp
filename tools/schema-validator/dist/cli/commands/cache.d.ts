/**
 * Cache commands - Manage validation cache
 */
interface CacheClearOptions {
    all?: boolean;
    database?: boolean;
    api?: boolean;
    operations?: boolean;
    config?: string;
}
declare function clearCache(options: CacheClearOptions): Promise<void>;
declare function showCacheStats(options: {
    config?: string;
}): Promise<void>;
export declare const cacheCommand: {
    clear: typeof clearCache;
    stats: typeof showCacheStats;
};
export {};
//# sourceMappingURL=cache.d.ts.map