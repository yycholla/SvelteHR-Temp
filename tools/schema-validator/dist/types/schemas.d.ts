/**
 * Zod validation schemas for runtime type checking
 */
import { z } from 'zod';
/**
 * Field reference schema (with explicit type for recursive definition)
 * Note: With exactOptionalPropertyTypes, optional properties have Type | undefined
 */
export declare const FieldReferenceSchema: z.ZodType<{
    name: string;
    graphqlType: string;
    nullable: boolean;
    isList: boolean;
    children: Array<any>;
    alias?: string | undefined;
}>;
/**
 * Variable definition schema
 */
export declare const VariableDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    nullable: z.ZodBoolean;
    defaultValue: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    nullable: boolean;
    defaultValue?: unknown;
}, {
    type: string;
    name: string;
    nullable: boolean;
    defaultValue?: unknown;
}>;
/**
 * GraphQL operation schema
 */
export declare const GraphQLOperationSchema: z.ZodObject<{
    name: z.ZodString;
    operationType: z.ZodEnum<["query", "mutation", "subscription"]>;
    selections: z.ZodArray<z.ZodType<{
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    }, z.ZodTypeDef, {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    }>, "many">;
    variables: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        nullable: z.ZodBoolean;
        defaultValue: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }, {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }>, "many">;
    filePath: z.ZodString;
    line: z.ZodNumber;
    column: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    operationType: "query" | "mutation" | "subscription";
    selections: {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    }[];
    variables: {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }[];
    filePath: string;
    line: number;
    column: number;
}, {
    name: string;
    operationType: "query" | "mutation" | "subscription";
    selections: {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    }[];
    variables: {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }[];
    filePath: string;
    line: number;
    column: number;
}>;
/**
 * Database column schema
 */
export declare const DatabaseColumnSchema: z.ZodObject<{
    tableName: z.ZodString;
    columnName: z.ZodString;
    pgType: z.ZodString;
    graphqlType: z.ZodString;
    nullable: z.ZodBoolean;
    isArray: z.ZodBoolean;
    isPrimaryKey: z.ZodBoolean;
    foreignKey: z.ZodOptional<z.ZodObject<{
        table: z.ZodString;
        column: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        column: string;
        table: string;
    }, {
        column: string;
        table: string;
    }>>;
    defaultValue: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    graphqlType: string;
    nullable: boolean;
    tableName: string;
    columnName: string;
    pgType: string;
    isArray: boolean;
    isPrimaryKey: boolean;
    defaultValue?: string | undefined;
    foreignKey?: {
        column: string;
        table: string;
    } | undefined;
}, {
    graphqlType: string;
    nullable: boolean;
    tableName: string;
    columnName: string;
    pgType: string;
    isArray: boolean;
    isPrimaryKey: boolean;
    defaultValue?: string | undefined;
    foreignKey?: {
        column: string;
        table: string;
    } | undefined;
}>;
/**
 * Argument info schema
 */
export declare const ArgumentInfoSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    nullable: z.ZodBoolean;
    defaultValue: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    nullable: boolean;
    defaultValue?: unknown;
}, {
    type: string;
    name: string;
    nullable: boolean;
    defaultValue?: unknown;
}>;
/**
 * API field schema
 */
export declare const ApiFieldSchema: z.ZodObject<{
    parentType: z.ZodString;
    fieldName: z.ZodString;
    graphqlType: z.ZodString;
    nullable: z.ZodBoolean;
    isList: z.ZodBoolean;
    args: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        nullable: z.ZodBoolean;
        defaultValue: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }, {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }>, "many">;
    resolverLocation: z.ZodOptional<z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        line: number;
        file: string;
    }, {
        line: number;
        file: string;
    }>>;
    alias: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    graphqlType: string;
    nullable: boolean;
    isList: boolean;
    parentType: string;
    fieldName: string;
    args: {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }[];
    alias?: string | undefined;
    resolverLocation?: {
        line: number;
        file: string;
    } | undefined;
}, {
    graphqlType: string;
    nullable: boolean;
    isList: boolean;
    parentType: string;
    fieldName: string;
    args: {
        type: string;
        name: string;
        nullable: boolean;
        defaultValue?: unknown;
    }[];
    alias?: string | undefined;
    resolverLocation?: {
        line: number;
        file: string;
    } | undefined;
}>;
/**
 * Source location schema
 */
export declare const SourceLocationSchema: z.ZodObject<{
    file: z.ZodString;
    line: z.ZodNumber;
    column: z.ZodNumber;
    snippet: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    line: number;
    column: number;
    file: string;
    snippet?: string | undefined;
}, {
    line: number;
    column: number;
    file: string;
    snippet?: string | undefined;
}>;
/**
 * Field alignment schema
 */
export declare const FieldAlignmentSchema: z.ZodObject<{
    fieldPath: z.ZodString;
    graphqlField: z.ZodType<{
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    }, z.ZodTypeDef, {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    }>;
    dbColumn: z.ZodOptional<z.ZodObject<{
        tableName: z.ZodString;
        columnName: z.ZodString;
        pgType: z.ZodString;
        graphqlType: z.ZodString;
        nullable: z.ZodBoolean;
        isArray: z.ZodBoolean;
        isPrimaryKey: z.ZodBoolean;
        foreignKey: z.ZodOptional<z.ZodObject<{
            table: z.ZodString;
            column: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            column: string;
            table: string;
        }, {
            column: string;
            table: string;
        }>>;
        defaultValue: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    }, {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    }>>;
    apiField: z.ZodOptional<z.ZodObject<{
        parentType: z.ZodString;
        fieldName: z.ZodString;
        graphqlType: z.ZodString;
        nullable: z.ZodBoolean;
        isList: z.ZodBoolean;
        args: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            nullable: z.ZodBoolean;
            defaultValue: z.ZodOptional<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }, {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }>, "many">;
        resolverLocation: z.ZodOptional<z.ZodObject<{
            file: z.ZodString;
            line: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            line: number;
            file: string;
        }, {
            line: number;
            file: string;
        }>>;
        alias: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    }, {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    }>>;
    status: z.ZodEnum<["aligned", "missing_db", "missing_api", "type_mismatch", "nullability_mismatch"]>;
    error: z.ZodOptional<z.ZodString>;
    suggestion: z.ZodOptional<z.ZodString>;
    sourceLocation: z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
        column: z.ZodNumber;
        snippet: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    }, {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "aligned" | "missing_db" | "missing_api" | "type_mismatch" | "nullability_mismatch";
    fieldPath: string;
    graphqlField: {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    };
    sourceLocation: {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    };
    error?: string | undefined;
    dbColumn?: {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    } | undefined;
    apiField?: {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    } | undefined;
    suggestion?: string | undefined;
}, {
    status: "aligned" | "missing_db" | "missing_api" | "type_mismatch" | "nullability_mismatch";
    fieldPath: string;
    graphqlField: {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
    };
    sourceLocation: {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    };
    error?: string | undefined;
    dbColumn?: {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    } | undefined;
    apiField?: {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    } | undefined;
    suggestion?: string | undefined;
}>;
/**
 * Schema snapshot schema
 */
export declare const SchemaSnapshotSchema: z.ZodObject<{
    timestamp: z.ZodDate;
    databaseSchema: z.ZodArray<z.ZodObject<{
        tableName: z.ZodString;
        columnName: z.ZodString;
        pgType: z.ZodString;
        graphqlType: z.ZodString;
        nullable: z.ZodBoolean;
        isArray: z.ZodBoolean;
        isPrimaryKey: z.ZodBoolean;
        foreignKey: z.ZodOptional<z.ZodObject<{
            table: z.ZodString;
            column: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            column: string;
            table: string;
        }, {
            column: string;
            table: string;
        }>>;
        defaultValue: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    }, {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    }>, "many">;
    apiSchema: z.ZodArray<z.ZodObject<{
        parentType: z.ZodString;
        fieldName: z.ZodString;
        graphqlType: z.ZodString;
        nullable: z.ZodBoolean;
        isList: z.ZodBoolean;
        args: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            nullable: z.ZodBoolean;
            defaultValue: z.ZodOptional<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }, {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }>, "many">;
        resolverLocation: z.ZodOptional<z.ZodObject<{
            file: z.ZodString;
            line: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            line: number;
            file: string;
        }, {
            line: number;
            file: string;
        }>>;
        alias: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    }, {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    }>, "many">;
    operations: z.ZodMap<z.ZodString, z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        operationType: z.ZodEnum<["query", "mutation", "subscription"]>;
        selections: z.ZodArray<z.ZodType<{
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
        }, z.ZodTypeDef, {
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
        }>, "many">;
        variables: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            nullable: z.ZodBoolean;
            defaultValue: z.ZodOptional<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }, {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }>, "many">;
        filePath: z.ZodString;
        line: z.ZodNumber;
        column: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        operationType: "query" | "mutation" | "subscription";
        selections: {
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
        }[];
        variables: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        filePath: string;
        line: number;
        column: number;
    }, {
        name: string;
        operationType: "query" | "mutation" | "subscription";
        selections: {
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
        }[];
        variables: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        filePath: string;
        line: number;
        column: number;
    }>, "many">>;
    databaseHash: z.ZodString;
    apiHash: z.ZodString;
    operationsHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    operations: Map<string, {
        name: string;
        operationType: "query" | "mutation" | "subscription";
        selections: {
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
        }[];
        variables: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        filePath: string;
        line: number;
        column: number;
    }[]>;
    timestamp: Date;
    databaseSchema: {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    }[];
    apiSchema: {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    }[];
    databaseHash: string;
    apiHash: string;
    operationsHash: string;
}, {
    operations: Map<string, {
        name: string;
        operationType: "query" | "mutation" | "subscription";
        selections: {
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
        }[];
        variables: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        filePath: string;
        line: number;
        column: number;
    }[]>;
    timestamp: Date;
    databaseSchema: {
        graphqlType: string;
        nullable: boolean;
        tableName: string;
        columnName: string;
        pgType: string;
        isArray: boolean;
        isPrimaryKey: boolean;
        defaultValue?: string | undefined;
        foreignKey?: {
            column: string;
            table: string;
        } | undefined;
    }[];
    apiSchema: {
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        parentType: string;
        fieldName: string;
        args: {
            type: string;
            name: string;
            nullable: boolean;
            defaultValue?: unknown;
        }[];
        alias?: string | undefined;
        resolverLocation?: {
            line: number;
            file: string;
        } | undefined;
    }[];
    databaseHash: string;
    apiHash: string;
    operationsHash: string;
}>;
/**
 * Validation run schema
 */
export declare const ValidationRunSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodDate;
    runType: z.ZodEnum<["full", "incremental", "cached"]>;
    commit: z.ZodOptional<z.ZodString>;
    alignedCount: z.ZodNumber;
    misalignedCount: z.ZodNumber;
    totalFields: z.ZodNumber;
    durationMs: z.ZodNumber;
    passed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    timestamp: Date;
    id: string;
    runType: "full" | "incremental" | "cached";
    alignedCount: number;
    misalignedCount: number;
    totalFields: number;
    durationMs: number;
    passed: boolean;
    commit?: string | undefined;
}, {
    timestamp: Date;
    id: string;
    runType: "full" | "incremental" | "cached";
    alignedCount: number;
    misalignedCount: number;
    totalFields: number;
    durationMs: number;
    passed: boolean;
    commit?: string | undefined;
}>;
/**
 * Computed field config schema
 */
export declare const ComputedFieldConfigSchema: z.ZodObject<{
    fieldPath: z.ZodString;
    sourceColumns: z.ZodArray<z.ZodString, "many">;
    resolverLocation: z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        line: number;
        file: string;
    }, {
        line: number;
        file: string;
    }>;
    description: z.ZodString;
    returnType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    resolverLocation: {
        line: number;
        file: string;
    };
    fieldPath: string;
    sourceColumns: string[];
    description: string;
    returnType: string;
}, {
    resolverLocation: {
        line: number;
        file: string;
    };
    fieldPath: string;
    sourceColumns: string[];
    description: string;
    returnType: string;
}>;
/**
 * Schema validator config schema
 */
export declare const SchemaValidatorConfigSchema: z.ZodObject<{
    databaseUrl: z.ZodEffects<z.ZodString, string, string>;
    apiUrl: z.ZodEffects<z.ZodString, string, string>;
    graphqlPaths: z.ZodArray<z.ZodString, "many">;
    cacheDir: z.ZodString;
    cacheTtl: z.ZodNumber;
    computedFields: z.ZodArray<z.ZodObject<{
        fieldPath: z.ZodString;
        sourceColumns: z.ZodArray<z.ZodString, "many">;
        resolverLocation: z.ZodObject<{
            file: z.ZodString;
            line: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            line: number;
            file: string;
        }, {
            line: number;
            file: string;
        }>;
        description: z.ZodString;
        returnType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        resolverLocation: {
            line: number;
            file: string;
        };
        fieldPath: string;
        sourceColumns: string[];
        description: string;
        returnType: string;
    }, {
        resolverLocation: {
            line: number;
            file: string;
        };
        fieldPath: string;
        sourceColumns: string[];
        description: string;
        returnType: string;
    }>, "many">;
    typeMappings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    strict: z.ZodBoolean;
    ignore: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    databaseUrl: string;
    apiUrl: string;
    graphqlPaths: string[];
    cacheDir: string;
    cacheTtl: number;
    computedFields: {
        resolverLocation: {
            line: number;
            file: string;
        };
        fieldPath: string;
        sourceColumns: string[];
        description: string;
        returnType: string;
    }[];
    strict: boolean;
    ignore: string[];
    typeMappings?: Record<string, string> | undefined;
}, {
    databaseUrl: string;
    apiUrl: string;
    graphqlPaths: string[];
    cacheDir: string;
    cacheTtl: number;
    computedFields: {
        resolverLocation: {
            line: number;
            file: string;
        };
        fieldPath: string;
        sourceColumns: string[];
        description: string;
        returnType: string;
    }[];
    strict: boolean;
    ignore: string[];
    typeMappings?: Record<string, string> | undefined;
}>;
/**
 * Validation error schema
 */
export declare const ValidationErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    fieldPath: z.ZodString;
    location: z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
        column: z.ZodNumber;
        snippet: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    }, {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    }>;
    severity: z.ZodEnum<["error", "warning", "info"]>;
    suggestion: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    fieldPath: string;
    location: {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    };
    severity: "error" | "warning" | "info";
    suggestion?: string | undefined;
    context?: Record<string, unknown> | undefined;
}, {
    code: string;
    message: string;
    fieldPath: string;
    location: {
        line: number;
        column: number;
        file: string;
        snippet?: string | undefined;
    };
    severity: "error" | "warning" | "info";
    suggestion?: string | undefined;
    context?: Record<string, unknown> | undefined;
}>;
/**
 * Type for validated GraphQL operation
 */
export type ValidatedGraphQLOperation = z.infer<typeof GraphQLOperationSchema>;
/**
 * Type for validated database column
 */
export type ValidatedDatabaseColumn = z.infer<typeof DatabaseColumnSchema>;
/**
 * Type for validated API field
 */
export type ValidatedApiField = z.infer<typeof ApiFieldSchema>;
/**
 * Type for validated field alignment
 */
export type ValidatedFieldAlignment = z.infer<typeof FieldAlignmentSchema>;
/**
 * Type for validated config
 */
export type ValidatedSchemaValidatorConfig = z.infer<typeof SchemaValidatorConfigSchema>;
//# sourceMappingURL=schemas.d.ts.map