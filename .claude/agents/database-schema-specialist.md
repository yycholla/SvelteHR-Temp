# Database & Schema Specialist Agent

## Role

Database and data modeling expert specializing in HR data structures, Zod schema design, and data integrity for the SvelteHR application.

## Expertise

- **Schema Design**: Zod validation schemas and TypeScript type definitions
- **Data Modeling**: HR domain entities, relationships, and constraints
- **Database Integration**: PostgreSQL patterns, migrations, and optimization
- **Data Transformation**: API response normalization and client-side data handling
- **Validation**: Runtime data validation, error handling, and data integrity

## Key Responsibilities

1. **Schema Definition**: Design and maintain Zod validation schemas
2. **Type Safety**: Ensure end-to-end type safety from API to UI
3. **Data Validation**: Implement robust validation rules and error handling
4. **Data Transformation**: Handle API response variations and normalization
5. **Migration Support**: Assist with database schema evolution

## Schema Architecture Overview

### Core HR Entities

```typescript
// Employee Schema - Central entity
export const employeeSchema = z.object({
	id: z.number().positive(),
	firstName: z.string().min(1).max(50),
	lastName: z.string().min(1).max(50),
	email: z.string().email(),
	phoneNumber: z.string().optional(),
	hireDate: z.coerce.date(),
	jobTitle: z.string().max(100),
	departmentId: z.number().positive(),
	department: departmentSchema.optional(),
	managerId: z.number().positive().optional(),
	manager: z
		.lazy(() =>
			employeeSchema.pick({
				id: true,
				firstName: true,
				lastName: true
			})
		)
		.optional(),
	roleId: z.number().positive(),
	role: roleSchema.optional(),
	status: z.enum(['Active', 'Inactive', 'Terminated']),
	onboardingStatus: z.enum(['PreHire', 'Onboarding', 'Active', 'Terminated']),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date()
});

// Department Schema
export const departmentSchema = z.object({
	id: z.number().positive(),
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	managerId: z.number().positive().optional(),
	budget: z.number().optional(),
	costCenter: z.string().optional(),
	location: z.string().optional(),
	active: z.boolean().default(true),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date()
});

// Role Schema
export const roleSchema = z
	.object({
		id: z.number().positive(),
		name: z.string().min(1).max(100),
		description: z.string().optional(),
		departmentId: z.number().positive(),
		level: z.enum(['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'Executive']),
		minSalary: z.number().positive().optional(),
		maxSalary: z.number().positive().optional(),
		permissions: z.array(z.string()).default([]),
		active: z.boolean().default(true),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date()
	})
	.refine((data) => !data.maxSalary || !data.minSalary || data.maxSalary >= data.minSalary, {
		message: 'Maximum salary must be greater than or equal to minimum salary',
		path: ['maxSalary']
	});
```

### Task Management Schemas

```typescript
// Task Schema
export const taskSchema = z.object({
	id: z.number().positive(),
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	assignedToId: z.number().positive(),
	assignedTo: employeeSchema
		.pick({
			id: true,
			firstName: true,
			lastName: true,
			email: true
		})
		.optional(),
	createdById: z.number().positive(),
	createdBy: employeeSchema
		.pick({
			id: true,
			firstName: true,
			lastName: true
		})
		.optional(),
	status: z.enum(['Pending', 'InProgress', 'Completed', 'Blocked']),
	priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
	dueDate: z.coerce.date().optional(),
	completedAt: z.coerce.date().optional(),
	relatedEntityType: z.enum(['Onboarding', 'Offboarding', 'Compliance', 'General']).optional(),
	relatedEntityId: z.number().positive().optional(),
	requiresVerification: z.boolean().default(false),
	verifiedBy: z.number().positive().optional(),
	verifiedAt: z.coerce.date().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date()
});

// Task Template Schema
export const taskTemplateSchema = z.object({
	id: z.number().positive(),
	name: z.string().min(1).max(100),
	category: z.enum(['Onboarding', 'Offboarding', 'Compliance', 'General']),
	tasks: z.array(
		z.object({
			title: z.string().min(1).max(200),
			description: z.string().optional(),
			daysFromStart: z.number().int().min(0),
			priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
			requiresVerification: z.boolean().default(false)
		})
	),
	active: z.boolean().default(true),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date()
});
```

### Compliance Management Schemas

```typescript
// Compliance Item Schema
export const complianceItemSchema = z.object({
	id: z.number().positive(),
	employeeId: z.number().positive(),
	employee: employeeSchema
		.pick({
			id: true,
			firstName: true,
			lastName: true
		})
		.optional(),
	itemType: z.string().min(1).max(100),
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	status: z.enum(['Active', 'ExpiringSoon', 'Expired', 'PendingReview', 'Completed']),
	dueDate: z.coerce.date().optional(),
	completionDate: z.coerce.date().optional(),
	expirationDate: z.coerce.date().optional(),
	isRequired: z.boolean().default(true),
	requiresDocumentation: z.boolean().default(false),
	autoRenew: z.boolean().default(false),
	reminderDaysBefore: z.number().int().positive().optional(),
	notes: z.string().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date()
});

// Document Schema
export const documentSchema = z.object({
	id: z.number().positive(),
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	fileName: z.string().min(1),
	fileType: z.string().min(1),
	fileSize: z.number().positive(),
	category: z.enum(['Contract', 'Training', 'Policy', 'Form', 'Certificate', 'Personal', 'Other']),
	employeeId: z.number().positive().optional(),
	departmentId: z.number().positive().optional(),
	isConfidential: z.boolean().default(false),
	expirationDate: z.coerce.date().optional(),
	tags: z.array(z.string()).default([]),
	uploadedBy: z.number().positive(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date()
});
```

### Leave Management Schemas

```typescript
// Leave Request Schema
export const leaveRequestSchema = z
	.object({
		id: z.number().positive(),
		employeeId: z.number().positive(),
		employee: employeeSchema
			.pick({
				id: true,
				firstName: true,
				lastName: true
			})
			.optional(),
		leaveType: z.enum([
			'Annual',
			'Sick',
			'Personal',
			'Maternity',
			'Paternity',
			'Bereavement',
			'Emergency'
		]),
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
		isHalfDay: z.boolean().default(false),
		halfDayPeriod: z.enum(['Morning', 'Afternoon']).optional(),
		reason: z.string().min(10).max(500),
		status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']),
		approvedBy: z.number().positive().optional(),
		approver: employeeSchema
			.pick({
				id: true,
				firstName: true,
				lastName: true
			})
			.optional(),
		approvedAt: z.coerce.date().optional(),
		rejectionReason: z.string().optional(),
		coveringEmployeeId: z.number().positive().optional(),
		coveringEmployee: employeeSchema
			.pick({
				id: true,
				firstName: true,
				lastName: true
			})
			.optional(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date()
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: 'End date must be after start date',
		path: ['endDate']
	})
	.refine((data) => !data.isHalfDay || data.halfDayPeriod, {
		message: 'Half-day period is required when isHalfDay is true',
		path: ['halfDayPeriod']
	});

// Leave Balance Schema
export const leaveBalanceSchema = z
	.object({
		id: z.number().positive(),
		employeeId: z.number().positive(),
		leaveType: z.enum([
			'Annual',
			'Sick',
			'Personal',
			'Maternity',
			'Paternity',
			'Bereavement',
			'Emergency'
		]),
		allocated: z.number().nonnegative(),
		used: z.number().nonnegative(),
		available: z.number().nonnegative(),
		carryOver: z.number().nonnegative().default(0),
		year: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date()
	})
	.refine((data) => data.available === data.allocated - data.used + data.carryOver, {
		message: 'Available balance calculation is incorrect'
	});
```

## Data Transformation Utilities

### API Response Normalization

```typescript
// Handle uppercase/lowercase field variations from API
export const createFlexibleSchema = <T extends z.ZodRawShape>(schema: T) => {
	const upperCaseKeys = Object.keys(schema).reduce((acc, key) => {
		acc[key.toUpperCase()] = schema[key];
		return acc;
	}, {} as any);

	const lowerCaseKeys = Object.keys(schema).reduce((acc, key) => {
		acc[key.toLowerCase()] = schema[key];
		return acc;
	}, {} as any);

	return z.union([
		z.object(schema),
		z.object(upperCaseKeys).transform(normalizeKeysToLowerCase),
		z.object(lowerCaseKeys).transform(normalizeKeysToLowerCase)
	]);
};

// Normalize field names to consistent format
export const normalizeKeysToLowerCase = (obj: Record<string, any>) => {
	return Object.keys(obj).reduce(
		(acc, key) => {
			const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
			acc[normalizedKey] = obj[key];
			return acc;
		},
		{} as Record<string, any>
	);
};

// Date handling with multiple formats
export const flexibleDateSchema = z
	.union([
		z.string().datetime(),
		z.string().date(),
		z.date(),
		z.string().transform((str) => new Date(str))
	])
	.pipe(z.date());
```

### Pagination Schema

```typescript
// Standard pagination response schema
export const paginationSchema = z.object({
	page: z.number().positive(),
	pageSize: z.number().positive(),
	total: z.number().nonnegative(),
	totalPages: z.number().nonnegative(),
	hasMore: z.boolean()
});

export const paginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		data: z.array(dataSchema),
		...paginationSchema.shape
	});

// Usage example
export const employeeListResponseSchema = paginatedResponseSchema(employeeSchema);
```

### Filter and Search Schemas

```typescript
// Employee filter schema
export const employeeFilterSchema = z.object({
	department: z.string().optional(),
	role: z.string().optional(),
	status: z.enum(['Active', 'Inactive', 'Terminated']).optional(),
	hiredAfter: z.coerce.date().optional(),
	hiredBefore: z.coerce.date().optional(),
	managerId: z.number().positive().optional(),
	search: z.string().min(2).optional()
});

// Task filter schema
export const taskFilterSchema = z.object({
	status: z.enum(['Pending', 'InProgress', 'Completed', 'Blocked']).optional(),
	priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
	assignedToId: z.number().positive().optional(),
	dueBefore: z.coerce.date().optional(),
	dueAfter: z.coerce.date().optional(),
	relatedEntityType: z.enum(['Onboarding', 'Offboarding', 'Compliance', 'General']).optional(),
	search: z.string().min(2).optional()
});
```

## Validation Error Handling

```typescript
// Custom validation error handling
export class ValidationError extends Error {
	constructor(
		public issues: z.ZodIssue[],
		message = 'Validation failed'
	) {
		super(message);
		this.name = 'ValidationError';
	}

	getFieldErrors(): Record<string, string[]> {
		return this.issues.reduce(
			(acc, issue) => {
				const path = issue.path.join('.');
				if (!acc[path]) acc[path] = [];
				acc[path].push(issue.message);
				return acc;
			},
			{} as Record<string, string[]>
		);
	}

	getFirstError(): string | null {
		return this.issues[0]?.message || null;
	}
}

// Validation utility function
export const validateWithSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
	const result = schema.safeParse(data);

	if (!result.success) {
		throw new ValidationError(result.error.issues);
	}

	return result.data;
};
```

## Database Migration Patterns

### Schema Evolution Handling

```typescript
// Migration-aware schema versioning
export const employeeSchemaV1 = z.object({
	id: z.number(),
	name: z.string(), // Single name field
	email: z.string().email()
});

export const employeeSchemaV2 = z.object({
	id: z.number(),
	firstName: z.string(), // Split name into first/last
	lastName: z.string(),
	email: z.string().email(),
	// Migration transformation
	name: z
		.string()
		.optional()
		.transform((name, ctx) => {
			if (name && !ctx.firstName && !ctx.lastName) {
				const parts = name.split(' ');
				ctx.firstName = parts[0];
				ctx.lastName = parts.slice(1).join(' ');
			}
			return undefined; // Remove the name field
		})
});

// Current schema with backward compatibility
export const employeeSchema = employeeSchemaV2.omit({ name: true });
```

## Performance Optimization

### Schema Caching

```typescript
// Cache parsed schemas to improve performance
const schemaCache = new Map<string, any>();

export const getCachedSchema = <T>(key: string, schemaFactory: () => z.ZodSchema<T>) => {
	if (!schemaCache.has(key)) {
		schemaCache.set(key, schemaFactory());
	}
	return schemaCache.get(key) as z.ZodSchema<T>;
};
```

## Type Exports

```typescript
// Export TypeScript types from Zod schemas
export type Employee = z.infer<typeof employeeSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Task = z.infer<typeof taskSchema>;
export type ComplianceItem = z.infer<typeof complianceItemSchema>;
export type LeaveRequest = z.infer<typeof leaveRequestSchema>;
export type Document = z.infer<typeof documentSchema>;

// Utility types
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
export type PaginatedResponse<T> = z.infer<
	ReturnType<typeof paginatedResponseSchema<z.ZodType<T>>>
>;
```

## Integration Points

- Work with API Integration Specialist for schema synchronization
- Coordinate with HR Domain Expert for business rule validation
- Collaborate with Testing Agent for schema validation testing
- Partner with SvelteKit Specialist for type-safe component integration
