/**
 * HR-Specific PostGraphile Plugins
 *
 * Custom plugins for SvelteHR with enhanced features:
 * - Computed fields for employee data
 * - Business logic integration
 * - Performance optimizations
 * - Security enhancements
 */
import { PluginHookFn } from 'graphile-build';
import { Redis } from 'ioredis';
/**
 * HR Computed Fields Plugin
 * Automatically adds computed fields to employee-related types
 */
export declare class HRComputedFieldsPlugin {
    private redis?;
    constructor(redis?: Redis);
    createPlugin(): PluginHookFn;
}
/**
 * HR Business Logic Plugin
 * Enforces business rules and provides advanced filtering
 */
export declare class HRBusinessLogicPlugin {
    createPlugin(): PluginHookFn;
}
/**
 * HR Performance Optimization Plugin
 * Caching, query optimization, and performance monitoring
 */
export declare class HRPerformanceOptimizationPlugin {
    private redis?;
    constructor(redis?: Redis);
    createPlugin(): PluginHookFn;
}
export declare const hrComputedFieldsPlugin: (redis?: Redis) => PluginHookFn;
export declare const hrBusinessLogicPlugin: () => PluginHookFn;
export declare const hrPerformanceOptimizationPlugin: (redis?: Redis) => PluginHookFn;
export declare const hrPlugins: (redis?: Redis) => any[];
