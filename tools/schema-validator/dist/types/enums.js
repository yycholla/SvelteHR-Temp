/**
 * Enum types for schema validator
 */
/**
 * Alignment status for a field
 */
export var AlignmentStatus;
(function (AlignmentStatus) {
    /** Field is fully aligned across all layers */
    AlignmentStatus["Aligned"] = "aligned";
    /** Field exists in GraphQL but missing database column */
    AlignmentStatus["MissingDb"] = "missing_db";
    /** Field exists in GraphQL and DB but missing API resolver */
    AlignmentStatus["MissingApi"] = "missing_api";
    /** Field exists everywhere but types don't match */
    AlignmentStatus["TypeMismatch"] = "type_mismatch";
    /** Field exists everywhere but nullability differs */
    AlignmentStatus["NullabilityMismatch"] = "nullability_mismatch";
})(AlignmentStatus || (AlignmentStatus = {}));
/**
 * Report output format
 */
export var ReportFormat;
(function (ReportFormat) {
    /** Markdown format for documentation */
    ReportFormat["Markdown"] = "markdown";
    /** JSON format for programmatic use */
    ReportFormat["Json"] = "json";
    /** HTML format for web viewing */
    ReportFormat["Html"] = "html";
    /** Terminal format with colors */
    ReportFormat["Terminal"] = "terminal";
})(ReportFormat || (ReportFormat = {}));
/**
 * Validation run type
 */
export var RunType;
(function (RunType) {
    /** Full validation without cache */
    RunType["Full"] = "full";
    /** Incremental validation (staged files only) */
    RunType["Incremental"] = "incremental";
    /** Cached validation (from cache only) */
    RunType["Cached"] = "cached";
})(RunType || (RunType = {}));
/**
 * Error codes for validation errors
 */
export var ErrorCode;
(function (ErrorCode) {
    /** Field missing in database */
    ErrorCode["FIELD_MISSING_DB"] = "E001";
    /** Field missing in API */
    ErrorCode["FIELD_MISSING_API"] = "E002";
    /** Type mismatch between layers */
    ErrorCode["TYPE_MISMATCH"] = "E003";
    /** Nullability mismatch */
    ErrorCode["NULLABILITY_MISMATCH"] = "E004";
    /** Computed field source column missing */
    ErrorCode["COMPUTED_FIELD_INVALID"] = "E005";
    /** Resolver location not found */
    ErrorCode["RESOLVER_NOT_FOUND"] = "E006";
    /** GraphQL syntax error */
    ErrorCode["GRAPHQL_SYNTAX_ERROR"] = "E007";
    /** Database connection failed */
    ErrorCode["DB_CONNECTION_FAILED"] = "E008";
    /** API connection failed */
    ErrorCode["API_CONNECTION_FAILED"] = "E009";
    /** Cache read/write error */
    ErrorCode["CACHE_ERROR"] = "E010";
    /** Configuration error */
    ErrorCode["CONFIG_ERROR"] = "E011";
    /** File read error */
    ErrorCode["FILE_READ_ERROR"] = "E012";
    /** Unknown error */
    ErrorCode["UNKNOWN"] = "E999";
})(ErrorCode || (ErrorCode = {}));
/**
 * Cache entry type
 */
export var CacheType;
(function (CacheType) {
    /** Database schema cache */
    CacheType["Database"] = "database";
    /** API schema cache */
    CacheType["Api"] = "api";
    /** GraphQL operations cache */
    CacheType["Operations"] = "operations";
})(CacheType || (CacheType = {}));
/**
 * GraphQL operation type
 */
export var OperationType;
(function (OperationType) {
    /** Query operation */
    OperationType["Query"] = "query";
    /** Mutation operation */
    OperationType["Mutation"] = "mutation";
    /** Subscription operation */
    OperationType["Subscription"] = "subscription";
})(OperationType || (OperationType = {}));
/**
 * Severity level for validation issues
 */
export var Severity;
(function (Severity) {
    /** Critical error that must be fixed */
    Severity["Error"] = "error";
    /** Warning that should be addressed */
    Severity["Warning"] = "warning";
    /** Informational message */
    Severity["Info"] = "info";
})(Severity || (Severity = {}));
/**
 * Warning category
 */
export var WarningCategory;
(function (WarningCategory) {
    /** Performance-related warning */
    WarningCategory["Performance"] = "performance";
    /** Deprecation warning */
    WarningCategory["Deprecation"] = "deprecation";
    /** Best practice suggestion */
    WarningCategory["BestPractice"] = "best_practice";
    /** Computed field configuration issue */
    WarningCategory["ComputedField"] = "computed_field";
})(WarningCategory || (WarningCategory = {}));
//# sourceMappingURL=enums.js.map