/**
 * HR-Specific PostGraphile Plugins
 *
 * Custom plugins for SvelteHR with enhanced features:
 * - Computed fields for employee data
 * - Business logic integration
 * - Performance optimizations
 * - Security enhancements
 */
import { createLogger, format, transports } from 'winston';
// Logger for plugin
const logger = createLogger({
    level: 'debug',
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    transports: [new transports.Console()],
});
/**
 * HR Computed Fields Plugin
 * Automatically adds computed fields to employee-related types
 */
export class HRComputedFieldsPlugin {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    createPlugin() {
        return (build) => {
            // Add employee computed fields
            build.hook('GraphQLObjectType:fields:field', (field, build, context) => {
                const { Self } = context.scope;
                if (Self.name === 'Employees') {
                    switch (field.fieldName) {
                        /**
                         * Employee full name computed field
                         */
                        case 'fullName':
                            return {
                                ...field,
                                type: build.graphql.GraphQLString,
                                description: 'Employee full name (first + last)',
                                resolve: async (employee, args, context, info) => {
                                    const cacheKey = `employee:${employee.id}:full_name`;
                                    if (this.redis) {
                                        try {
                                            const cached = await this.redis.get(cacheKey);
                                            if (cached)
                                                return cached;
                                        }
                                        catch (error) {
                                            logger.warn('Cache read failed', {
                                                error: error.message,
                                            });
                                        }
                                    }
                                    const fullName = `${employee.firstName} ${employee.lastName}`.trim();
                                    if (this.redis) {
                                        try {
                                            await this.redis.setex(cacheKey, 3600, fullName);
                                        }
                                        catch (error) {
                                            logger.warn('Cache write failed', {
                                                error: error.message,
                                            });
                                        }
                                    }
                                    return fullName;
                                },
                            };
                        /**
                         * Employee status indicator
                         */
                        case 'statusIndicator':
                            return {
                                ...field,
                                type: build.graphql.GraphQLString,
                                description: 'Employee status indicator (Active, Inactive, On Leave, Terminated)',
                                resolve: async (employee, args, context, info) => {
                                    if (!employee.isActive)
                                        return 'Inactive';
                                    if (employee.terminationDate)
                                        return 'Terminated';
                                    if (employee.onLeaveUntil &&
                                        new Date(employee.onLeaveUntil) > new Date()) {
                                        return 'On Leave';
                                    }
                                    return 'Active';
                                },
                            };
                        /**
                         * Employee days of service
                         */
                        case 'daysOfService':
                            return {
                                ...field,
                                type: build.graphql.GraphQLInt,
                                description: 'Days since employee was hired',
                                resolve: (employee, args, context, info) => {
                                    const hireDate = new Date(employee.hireDate);
                                    const now = new Date();
                                    const diffTime = Math.abs(now.getTime() - hireDate.getTime());
                                    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                },
                            };
                        /**
                         * Employee performance rating
                         */
                        case 'performanceRating':
                            return {
                                ...field,
                                type: new build.graphql.GraphQLObjectType({
                                    name: 'PerformanceRating',
                                    fields: {
                                        average: { type: build.graphql.GraphQLFloat },
                                        rating: { type: build.graphql.GraphQLString },
                                        lastReviewDate: { type: build.graphql.GraphQLString },
                                    },
                                }),
                                description: 'Employee performance rating from latest review',
                                resolve: async (employee, args, context, info) => {
                                    try {
                                        const { pgSql } = context;
                                        const sqlFragment = pgSql.fragment `
                      SELECT (SELECT AVG(r.rating) 
                               FROM hr_public.performance_reviews r 
                               WHERE r.employee_id = ${pgSql.value(employee.id)}
                              ) as average,
                             (SELECT r.rating 
                              FROM hr_public.performance_reviews r 
                              WHERE r.employee_id = ${pgSql.value(employee.id)}
                              ORDER BY r.review_date DESC 
                              LIMIT 1
                             ) as rating,
                             (SELECT r.review_date::text 
                              FROM hr_public.performance_reviews r 
                              WHERE r.employee_id = ${pgSql.value(employee.id)}
                              ORDER BY r.review_date DESC 
                              LIMIT 1
                             ) as last_review_date
                    `;
                                        const result = await context.pgClient.query(sqlFragment);
                                        const row = result.rows[0];
                                        return {
                                            average: row.average || 0,
                                            rating: row.rating?.toString() || 'Not Rated',
                                            lastReviewDate: row.last_review_date,
                                        };
                                    }
                                    catch (error) {
                                        logger.error('Performance rating fetch failed', {
                                            employeeId: employee.id,
                                            error: error.message,
                                        });
                                        return {
                                            average: 0,
                                            rating: 'Error',
                                            lastReviewDate: null,
                                        };
                                    }
                                },
                            };
                    }
                }
                return field;
            });
            // Add department computed fields
            build.hook('GraphQLObjectType:fields:field', (field, build, context) => {
                const { Self } = context.scope;
                if (Self.name === 'Departments') {
                    switch (field.fieldName) {
                        /**
                         * Department employee count
                         */
                        case 'employeeCount':
                            return {
                                ...field,
                                type: build.graphql.GraphQLInt,
                                description: 'Number of active employees in department',
                                resolve: async (department, args, context, info) => {
                                    const cacheKey = `department:${department.id}:employee_count`;
                                    if (this.redis) {
                                        try {
                                            const cached = await this.redis.get(cacheKey);
                                            if (cached)
                                                return parseInt(cached);
                                        }
                                        catch (error) {
                                            logger.warn('Department count cache read failed', {
                                                error: error.message,
                                            });
                                        }
                                    }
                                    try {
                                        const { pgSql } = context;
                                        const sqlFragment = pgSql.fragment `
                      SELECT COUNT(*) as count
                      FROM hr_public.employees e
                      JOIN hr_public.users u ON e.id = u.employee_id
                      WHERE e.department_id = ${pgSql.value(department.id)}
                      AND u.is_active = true
                      AND e.termination_date IS NULL
                    `;
                                        const result = await context.pgClient.query(sqlFragment);
                                        const count = parseInt(result.rows[0].count);
                                        if (this.redis) {
                                            try {
                                                await this.redis.setex(cacheKey, 300, count.toString());
                                            }
                                            catch (error) {
                                                logger.warn('Department count cache write failed', {
                                                    error: error.message,
                                                });
                                            }
                                        }
                                        return count;
                                    }
                                    catch (error) {
                                        logger.error('Department employee count fetch failed', {
                                            departmentId: department.id,
                                            error: error.message,
                                        });
                                        return 0;
                                    }
                                },
                            };
                        /**
                         * Department head info
                         */
                        case 'departmentHead':
                            return {
                                ...field,
                                type: new build.graphql.GraphQLObjectType({
                                    name: 'DepartmentHead',
                                    fields: {
                                        id: { type: build.graphql.GraphQLInt },
                                        fullName: { type: build.graphql.GraphQLString },
                                        email: { type: build.graphql.GraphQLString },
                                        title: { type: build.graphql.GraphQLString },
                                    },
                                }),
                                description: 'Department head information',
                                resolve: async (department, args, context, info) => {
                                    try {
                                        const { pgSql } = context;
                                        const sqlFragment = pgSql.fragment `
                      SELECT 
                        e.id,
                        e.first_name || ' ' || e.last_name as full_name,
                        u.email,
                        e.title
                      FROM hr_public.employees e
                      JOIN hr_public.users u ON e.id = u.employee_id
                      JOIN hr_public.roles r ON u.role_id = r.id
                      WHERE e.department_id = ${pgSql.value(department.id)}
                      AND r.level >= 80 -- Management level
                      AND u.is_active = true
                      AND e.termination_date IS NULL
                      ORDER BY r.level DESC
                      LIMIT 1
                    `;
                                        const result = await context.pgClient.query(sqlFragment);
                                        if (result.rows.length === 0) {
                                            return null;
                                        }
                                        const row = result.rows[0];
                                        return {
                                            id: row.id,
                                            fullName: row.full_name,
                                            email: row.email,
                                            title: row.title,
                                        };
                                    }
                                    catch (error) {
                                        logger.error('Department head fetch failed', {
                                            departmentId: department.id,
                                            error: error.message,
                                        });
                                        return null;
                                    }
                                },
                            };
                    }
                }
                return field;
            });
            return build;
        };
    }
}
/**
 * HR Business Logic Plugin
 * Enforces business rules and provides advanced filtering
 */
export class HRBusinessLogicPlugin {
    createPlugin() {
        return (build) => {
            // Add employee filtering capabilities
            build.hook('GraphQLObjectType:fields:field', (field, build, context) => {
                const { Self } = context.scope;
                if (Self.name === 'EmployeesConnection') {
                    switch (field.fieldName) {
                        /**
                         * Employees by department filter
                         */
                        case 'byDepartment':
                            return {
                                ...field,
                                type: build.graphql.GraphQLList(Self),
                                description: 'Filter employees by departments',
                                args: {
                                    departmentIds: {
                                        type: new build.graphql.GraphQLList(build.graphql.GraphQLInt),
                                        description: 'Department IDs to filter by',
                                    },
                                    includeInactive: {
                                        type: build.graphql.GraphQLBoolean,
                                        defaultValue: false,
                                        description: 'Include inactive employees',
                                    },
                                },
                                resolve: async (root, args, context, info) => {
                                    const { departmentIds, includeInactive = false } = args;
                                    try {
                                        const { pgSql } = context;
                                        const sqlFragment = pgSql.fragment `
                      SELECT DISTINCT e.*
                      FROM hr_public.employees e
                      JOIN hr_public.users u ON e.id = u.employee_id
                      WHERE e.department_id = ANY(${pgSql.value(departmentIds)})
                      AND (${pgSql.value(includeInactive)} = true OR u.is_active = true)
                      AND (${pgSql.value(includeInactive)} = true OR e.termination_date IS NULL)
                      ORDER BY e.last_name, e.first_name
                    `;
                                        const result = await context.pgClient.query(sqlFragment);
                                        return result.rows;
                                    }
                                    catch (error) {
                                        logger.error('Department filter failed', {
                                            departmentIds,
                                            error: error.message,
                                        });
                                        return [];
                                    }
                                },
                            };
                        /**
                         * Employees by hire date range
                         */
                        case 'byHireDateRange':
                            return {
                                ...field,
                                type: build.graphql.GraphQLList(Self),
                                description: 'Filter employees by hire date range',
                                args: {
                                    startDate: {
                                        type: build.graphql.GraphQLString,
                                        description: 'Start date (YYYY-MM-DD)',
                                    },
                                    endDate: {
                                        type: build.graphql.GraphQLString,
                                        description: 'End date (YYYY-MM-DD)',
                                    },
                                },
                                resolve: async (root, args, context, info) => {
                                    const { startDate, endDate } = args;
                                    try {
                                        const { pgSql } = context;
                                        const sqlFragment = pgSql.fragment `
                      SELECT e.*
                      FROM hr_public.employees e
                      JOIN hr_public.users u ON e.id = u.employee_id
                      WHERE e.hire_date BETWEEN ${pgSql.value(startDate)}::date 
                                               AND ${pgSql.value(endDate)}::date
                      AND u.is_active = true
                      ORDER BY e.hire_date
                    `;
                                        const result = await context.pgClient.query(sqlFragment);
                                        return result.rows;
                                    }
                                    catch (error) {
                                        logger.error('Hire date range filter failed', {
                                            startDate,
                                            endDate,
                                            error: error.message,
                                        });
                                        return [];
                                    }
                                },
                            };
                    }
                }
                return field;
            });
            // Add leave time statistics
            build.hook('GraphQLObjectType:fields:field', (field, build, context) => {
                const { Self } = context.scope;
                if (Self.name === 'Employees') {
                    switch (field.fieldName) {
                        /**
                         * Leave time balance
                         */
                        case 'leaveBalance':
                            return {
                                ...field,
                                type: new build.graphql.GraphQLObjectType({
                                    name: 'LeaveBalance',
                                    fields: {
                                        vacationDaysUsed: { type: build.graphql.GraphQLInt },
                                        vacationDaysAvailable: { type: build.graphql.GraphQLInt },
                                        sickDaysUsed: { type: build.graphql.GraphQLInt },
                                        sickDaysAvailable: { type: build.graphql.GraphQLInt },
                                        emergencyLeaveUsed: { type: build.graphql.GraphQLInt },
                                        emergencyLeaveAvailable: {
                                            type: build.graphql.GraphQLInt,
                                        },
                                        lastUpdated: { type: build.graphql.GraphQLString },
                                    },
                                }),
                                description: 'Employee leave time balance',
                                resolve: async (employee, args, context, info) => {
                                    try {
                                        const { pgSql } = context;
                                        const sqlFragment = pgSql.fragment `
                      SELECT 
                        COALESCE(SUM(CASE WHEN t.leave_type_id = 1 THEN t.days_taken ELSE 0 END), 0) as vacation_used,
                        COALESCE(SUM(CASE WHEN t.leave_type_id = 2 THEN t.days_taken ELSE 0 END), 0) as sick_used,
                        COALESCE(SUM(CASE WHEN t.leave_type_id = 3 THEN t.days_taken ELSE 0 END), 0) as emergency_used,
                        lt.vacation_days,
                        lt.sick_days,
                        lt.emergency_days,
                        NOW() as last_updated
                      FROM hr_public.employees e
                      LEFT JOIN hr_public.leave_requests t ON e.id = t.employee_id 
                        AND t.status = 'approved'
                        AND t.date_range && CURRENT_DATE
                      LEFT JOIN hr_public.leave_types lt ON 1=1 -- Get company standard
                      WHERE e.id = ${pgSql.value(employee.id)}
                      GROUP BY lt.vacation_days, lt.sick_days, lt.emergency_days
                    `;
                                        const result = await context.pgClient.query(sqlFragment);
                                        const row = result.rows[0];
                                        return {
                                            vacationDaysUsed: row.vacation_used || 0,
                                            vacationDaysAvailable: Math.max(0, row.vacation_days - row.vacation_used) ||
                                                20,
                                            sickDaysUsed: row.sick_used || 0,
                                            sickDaysAvailable: Math.max(0, row.sick_days - row.sick_used) || 10,
                                            emergencyLeaveUsed: row.emergency_used || 0,
                                            emergencyLeaveAvailable: Math.max(0, row.emergency_days - row.emergency_used) || 5,
                                            lastUpdated: row.last_updated,
                                        };
                                    }
                                    catch (error) {
                                        logger.error('Leave balance fetch failed', {
                                            employeeId: employee.id,
                                            error: error.message,
                                        });
                                        return {
                                            vacationDaysUsed: 0,
                                            vacationDaysAvailable: 0,
                                            sickDaysUsed: 0,
                                            sickDaysAvailable: 0,
                                            emergencyLeaveUsed: 0,
                                            emergencyLeaveAvailable: 0,
                                            lastUpdated: null,
                                        };
                                    }
                                },
                            };
                    }
                }
                return field;
            });
            return build;
        };
    }
}
/**
 * HR Performance Optimization Plugin
 * Caching, query optimization, and performance monitoring
 */
export class HRPerformanceOptimizationPlugin {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    createPlugin() {
        return (build) => {
            // Query complexity analysis
            build.hook('GraphQLSchema', (schema, build) => {
                logger.debug('Schema built with HR performance optimizations');
                return schema;
            });
            // Add performance logging to field resolution
            build.hook('GraphQLObjectType:fields:field', (field, build, context) => {
                const originalResolve = field.resolve;
                const fieldName = field.fieldName;
                if (originalResolve) {
                    field.resolve = async (root, args, context, info) => {
                        const startTime = Date.now();
                        try {
                            const result = await originalResolve(root, args, context, info);
                            const duration = Date.now() - startTime;
                            if (duration > 100) {
                                // Log slow queries
                                logger.warn('Slow field resolution', {
                                    fieldName,
                                    duration,
                                    typeName: context.scope.Self?.name,
                                });
                            }
                            return result;
                        }
                        catch (error) {
                            const duration = Date.now() - startTime;
                            logger.error('Field resolution error', {
                                fieldName,
                                duration,
                                error: error.message,
                                typeName: context.scope.Self?.name,
                            });
                            throw error;
                        }
                    };
                }
                return field;
            });
            // Add connection optimization
            build.hook('GraphQLObjectType:fields:field', (field, build, context) => {
                const { Self } = context.scope;
                if (Self.name && Self.name.endsWith('Connection')) {
                    const originalResolve = field.resolve;
                    if (originalResolve) {
                        field.resolve = async (root, args, context, info) => {
                            const startTime = Date.now();
                            try {
                                // Optimize pagination
                                const { first = 20, after } = args;
                                if (first > 100) {
                                    args.first = 100; // Limit page size
                                }
                                const result = await originalResolve(root, args, context, info);
                                const duration = Date.now() - startTime;
                                logger.debug('Connection query executed', {
                                    connectionType: Self.name,
                                    duration,
                                    pageSize: first,
                                    hasAfterCursor: !!after,
                                });
                                return result;
                            }
                            catch (error) {
                                const duration = Date.now() - startTime;
                                logger.error('Connection query error', {
                                    connectionType: Self.name,
                                    duration,
                                    error: error.message,
                                });
                                throw error;
                            }
                        };
                    }
                }
                return field;
            });
            return build;
        };
    }
}
// Export plugins for easy import
export const hrComputedFieldsPlugin = (redis) => new HRComputedFieldsPlugin(redis).createPlugin();
export const hrBusinessLogicPlugin = () => new HRBusinessLogicPlugin().createPlugin();
export const hrPerformanceOptimizationPlugin = (redis) => new HRPerformanceOptimizationPlugin(redis).createPlugin();
// Default plugin set for PostGraphile
export const hrPlugins = (redis) => [
    hrComputedFieldsPlugin(redis),
    hrBusinessLogicPlugin(),
    hrPerformanceOptimizationPlugin(redis),
];
//# sourceMappingURL=hr-plugins.js.map