/**
 * Enum types for schema validator
 */
/**
 * Alignment status for a field
 */
export declare enum AlignmentStatus {
    /** Field is fully aligned across all layers */
    Aligned = "aligned",
    /** Field exists in GraphQL but missing database column */
    MissingDb = "missing_db",
    /** Field exists in GraphQL and DB but missing API resolver */
    MissingApi = "missing_api",
    /** Field exists everywhere but types don't match */
    TypeMismatch = "type_mismatch",
    /** Field exists everywhere but nullability differs */
    NullabilityMismatch = "nullability_mismatch"
}
/**
 * Report output format
 */
export declare enum ReportFormat {
    /** Markdown format for documentation */
    Markdown = "markdown",
    /** JSON format for programmatic use */
    Json = "json",
    /** HTML format for web viewing */
    Html = "html",
    /** Terminal format with colors */
    Terminal = "terminal"
}
/**
 * Validation run type
 */
export declare enum RunType {
    /** Full validation without cache */
    Full = "full",
    /** Incremental validation (staged files only) */
    Incremental = "incremental",
    /** Cached validation (from cache only) */
    Cached = "cached"
}
/**
 * Error codes for validation errors
 */
export declare enum ErrorCode {
    /** Field missing in database */
    FIELD_MISSING_DB = "E001",
    /** Field missing in API */
    FIELD_MISSING_API = "E002",
    /** Type mismatch between layers */
    TYPE_MISMATCH = "E003",
    /** Nullability mismatch */
    NULLABILITY_MISMATCH = "E004",
    /** Computed field source column missing */
    COMPUTED_FIELD_INVALID = "E005",
    /** Resolver location not found */
    RESOLVER_NOT_FOUND = "E006",
    /** GraphQL syntax error */
    GRAPHQL_SYNTAX_ERROR = "E007",
    /** Database connection failed */
    DB_CONNECTION_FAILED = "E008",
    /** API connection failed */
    API_CONNECTION_FAILED = "E009",
    /** Cache read/write error */
    CACHE_ERROR = "E010",
    /** Configuration error */
    CONFIG_ERROR = "E011",
    /** File read error */
    FILE_READ_ERROR = "E012",
    /** Unknown error */
    UNKNOWN = "E999"
}
/**
 * Cache entry type
 */
export declare enum CacheType {
    /** Database schema cache */
    Database = "database",
    /** API schema cache */
    Api = "api",
    /** GraphQL operations cache */
    Operations = "operations"
}
/**
 * GraphQL operation type
 */
export declare enum OperationType {
    /** Query operation */
    Query = "query",
    /** Mutation operation */
    Mutation = "mutation",
    /** Subscription operation */
    Subscription = "subscription"
}
/**
 * Severity level for validation issues
 */
export declare enum Severity {
    /** Critical error that must be fixed */
    Error = "error",
    /** Warning that should be addressed */
    Warning = "warning",
    /** Informational message */
    Info = "info"
}
/**
 * Warning category
 */
export declare enum WarningCategory {
    /** Performance-related warning */
    Performance = "performance",
    /** Deprecation warning */
    Deprecation = "deprecation",
    /** Best practice suggestion */
    BestPractice = "best_practice",
    /** Computed field configuration issue */
    ComputedField = "computed_field"
}
//# sourceMappingURL=enums.d.ts.map