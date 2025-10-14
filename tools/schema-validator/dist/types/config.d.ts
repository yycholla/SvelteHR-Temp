/**
 * Configuration types for schema validator
 */
import type { ComputedFieldConfig } from './models.js';
/**
 * Main configuration for schema validator tool
 */
export interface SchemaValidatorConfig {
    /** PostgreSQL connection string */
    databaseUrl: string;
    /** Rust GraphQL API URL */
    apiUrl: string;
    /** Paths to GraphQL operation files (glob patterns) */
    graphqlPaths: string[];
    /** Cache directory path */
    cacheDir: string;
    /** Cache TTL in seconds */
    cacheTtl: number;
    /** Computed field configurations */
    computedFields: ComputedFieldConfig[];
    /** Type mapping overrides */
    typeMappings?: Record<string, string> | undefined;
    /** Strict mode (fail on warnings) */
    strict: boolean;
    /** Ignore patterns (glob) */
    ignore: string[];
}
/**
 * Options for validate command
 */
export interface ValidateOptions {
    /** Run full validation (no cache) */
    full?: boolean;
    /** Validate only staged files */
    staged?: boolean;
    /** Output JSON instead of terminal */
    json?: boolean;
    /** Skip cache usage */
    noCache?: boolean;
    /** Filter by field path pattern */
    filterField?: string;
    /** Filter by type name */
    filterType?: string;
    /** Filter by page/file pattern */
    filterPage?: string;
    /** Verbose output */
    verbose?: boolean;
}
/**
 * Options for report command
 */
export interface ReportOptions {
    /** Report format */
    format: 'markdown' | 'json' | 'html' | 'terminal';
    /** Filter by misalignment type */
    filter?: 'field' | 'type' | 'page';
    /** Output file path */
    output?: string;
    /** Include only errors (no warnings) */
    errorsOnly?: boolean;
}
/**
 * Parser configuration
 */
export interface ParserConfig {
    /** File extensions to parse */
    extensions: string[];
    /** Template tag patterns (gql, graphql) */
    tagPatterns: string[];
    /** Maximum file size in bytes */
    maxFileSize: number;
}
/**
 * Reporter configuration
 */
export interface ReporterConfig {
    /** Use colors in terminal output */
    colors: boolean;
    /** Show source code snippets */
    showSnippets: boolean;
    /** Maximum snippet lines */
    maxSnippetLines: number;
    /** Include suggestions in reports */
    includeSuggestions: boolean;
}
/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Cache directory path */
    dir: string;
    /** TTL for database cache (seconds) */
    databaseTtl: number;
    /** TTL for API cache (seconds) */
    apiTtl: number;
    /** TTL for operations cache (seconds) */
    operationsTtl: number;
    /** Enable cache compression */
    compress: boolean;
}
//# sourceMappingURL=config.d.ts.map