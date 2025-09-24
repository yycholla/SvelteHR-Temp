/**
 * HR-Specific GraphQL Plugins for PostGraphile
 *
 * Provides custom resolvers and middleware for HR user journeys functionality
 * including time tracking, leave management, goals, and performance reviews.
 */
export declare const HRExtensionsPlugin: import("graphile-build").Plugin;
export declare const HRContextPlugin: (builder: any) => any;
export declare const hrPlugins: (import("graphile-build").Plugin | ((builder: any) => any))[];
