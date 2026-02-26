/**
 * Factory to create standard CRUD operations for any entity
 *
 * Eliminates boilerplate for standard create, read, update, delete operations
 * by generating a consistent interface using the enhanced BaseOperations class.
 *
 * @example
 * ```typescript
 * const taskOperations = createCRUDOperations({
 *   client: urqlClient,
 *   entityName: 'Task',
 *   queries: {
 *     getAll: GET_ALL_TASKS,
 *     getById: GET_TASK_BY_ID
 *   },
 *   mutations: {
 *     create: CREATE_TASK,
 *     update: UPDATE_TASK,
 *     delete: DELETE_TASK
 *   }
 * });
 *
 * const tasks = await taskOperations.getAll({ limit: 20 });
 * const task = await taskOperations.getById('task-123');
 * const newTask = await taskOperations.create({ title: 'New Task' });
 * const updated = await taskOperations.update('task-123', { status: 'DONE' });
 * await taskOperations.delete('task-123');
 * ```
 */

import type { AnyVariables, Client, DocumentInput } from '@urql/core';
import { BaseOperations } from '../base-operations';

/**
 * Configuration for CRUD operations factory
 */
export interface CRUDOperationsConfig<
	TEntity = unknown,
	TCreateInput = Partial<TEntity>,
	TUpdateInput = Partial<TEntity>,
	TGetAllVariables extends AnyVariables = AnyVariables
> {
	/**
	 * urql GraphQL client instance
	 */
	client: Client;

	/**
	 * Entity name for operation naming (e.g., 'Task', 'Employee', 'Department')
	 * Used in error messages and operation names
	 */
	entityName: string;

	/**
	 * GraphQL query documents for read operations
	 */
	queries: {
		/**
		 * Query to get all entities (with optional filters/pagination)
		 */
		getAll: DocumentInput<unknown, TGetAllVariables>;

		/**
		 * Query to get single entity by ID
		 */
		getById: DocumentInput<unknown, { id: string }>;
	};

	/**
	 * GraphQL mutation documents for write operations
	 */
	mutations: {
		/**
		 * Mutation to create new entity
		 */
		create: DocumentInput<unknown, { input: TCreateInput }>;

		/**
		 * Mutation to update existing entity
		 */
		update: DocumentInput<unknown, { id: string; input: TUpdateInput }>;

		/**
		 * Mutation to delete entity
		 */
		delete: DocumentInput<unknown, { id: string }>;
	};

	/**
	 * Optional data path configuration for extracting data from responses
	 */
	dataPaths?: {
		getAll?: string;
		getById?: string;
		create?: string;
		update?: string;
		delete?: string;
	};
}

/**
 * Standard CRUD operations interface
 */
export interface CRUDOperations<
	TEntity = unknown,
	TCreateInput = Partial<TEntity>,
	TUpdateInput = Partial<TEntity>,
	TGetAllVariables extends AnyVariables = AnyVariables
> {
	/**
	 * Get all entities with optional filters and pagination
	 */
	getAll(variables?: TGetAllVariables): Promise<TEntity[]>;

	/**
	 * Get entity by ID
	 */
	getById(id: string): Promise<TEntity>;

	/**
	 * Create new entity
	 */
	create(input: TCreateInput): Promise<TEntity>;

	/**
	 * Update existing entity
	 */
	update(id: string, input: TUpdateInput): Promise<TEntity>;

	/**
	 * Delete entity
	 */
	delete(id: string): Promise<boolean>;
}

/**
 * Create standard CRUD operations for any entity
 *
 * Generates a consistent set of create, read, update, delete operations
 * using the enhanced BaseOperations executeQuery/executeMutation methods.
 *
 * @param config - CRUD operations configuration
 * @returns Object with CRUD operation methods
 *
 * @example
 * ```typescript
 * const employeeOps = createCRUDOperations<Employee>({
 *   client: urqlClient,
 *   entityName: 'Employee',
 *   queries: {
 *     getAll: GET_ALL_EMPLOYEES,
 *     getById: GET_EMPLOYEE_BY_ID
 *   },
 *   mutations: {
 *     create: CREATE_EMPLOYEE,
 *     update: UPDATE_EMPLOYEE,
 *     delete: DELETE_EMPLOYEE
 *   },
 *   dataPaths: {
 *     getAll: 'allEmployees',
 *     getById: 'employeeById',
 *     create: 'createEmployee.employee',
 *     update: 'updateEmployee.employee',
 *     delete: 'deleteEmployee.success'
 *   }
 * });
 *
 * const employees = await employeeOps.getAll({ departmentId: 'dept-123' });
 * const employee = await employeeOps.getById('emp-456');
 * ```
 */
export function createCRUDOperations<
	TEntity = unknown,
	TCreateInput = Partial<TEntity>,
	TUpdateInput = Partial<TEntity>,
	TGetAllVariables extends AnyVariables = AnyVariables
>(
	config: CRUDOperationsConfig<TEntity, TCreateInput, TUpdateInput, TGetAllVariables>
): CRUDOperations<TEntity, TCreateInput, TUpdateInput, TGetAllVariables> {
	const { client, entityName, queries, mutations, dataPaths } = config;

	// Create an instance of BaseOperations to access executeQuery/executeMutation
	const baseOps = new (class extends BaseOperations {
		// Expose protected methods publicly for this factory
		public async query<TData = unknown, TVariables extends AnyVariables = AnyVariables>(
			query: DocumentInput<TData, TVariables>,
			variables?: TVariables,
			options?: {
				operationName?: string;
				errorMessage?: string;
				dataPath?: string;
			}
		): Promise<TData> {
			return this.executeQuery(query, variables, options);
		}

		public async mutate<TData = unknown, TVariables extends AnyVariables = AnyVariables>(
			mutation: DocumentInput<TData, TVariables>,
			variables?: TVariables,
			options?: {
				operationName?: string;
				errorMessage?: string;
				dataPath?: string;
			}
		): Promise<TData> {
			return this.executeMutation(mutation, variables, options);
		}
	})(client);

	// Entity name helpers for consistent messaging
	const entityLower = entityName.toLowerCase();
	const entityPlural = `${entityLower}s`;

	return {
		/**
		 * Get all entities with optional filters and pagination
		 *
		 * @param variables - Query variables (filters, pagination, sorting)
		 * @returns Array of entities
		 */
		async getAll(variables?: TGetAllVariables): Promise<TEntity[]> {
			return baseOps.query<TEntity[], TGetAllVariables>(queries.getAll, variables, {
				operationName: `GetAll${entityName}s`,
				errorMessage: `Failed to load ${entityPlural}. Please try again.`,
				dataPath: dataPaths?.getAll
			});
		},

		/**
		 * Get entity by ID
		 *
		 * @param id - Entity ID
		 * @returns Single entity
		 * @throws Error if entity not found
		 */
		async getById(id: string): Promise<TEntity> {
			return baseOps.query<TEntity, { id: string }>(
				queries.getById,
				{ id },
				{
					operationName: `Get${entityName}ById`,
					errorMessage: `Failed to load ${entityLower}. Please try again.`,
					dataPath: dataPaths?.getById
				}
			);
		},

		/**
		 * Create new entity
		 *
		 * @param input - Entity creation input
		 * @returns Created entity
		 */
		async create(input: TCreateInput): Promise<TEntity> {
			return baseOps.mutate<TEntity, { input: TCreateInput }>(
				mutations.create,
				{ input },
				{
					operationName: `Create${entityName}`,
					errorMessage: `Failed to create ${entityLower}. Please try again.`,
					dataPath: dataPaths?.create
				}
			);
		},

		/**
		 * Update existing entity
		 *
		 * @param id - Entity ID
		 * @param input - Entity update input
		 * @returns Updated entity
		 */
		async update(id: string, input: TUpdateInput): Promise<TEntity> {
			return baseOps.mutate<TEntity, { id: string; input: TUpdateInput }>(
				mutations.update,
				{ id, input },
				{
					operationName: `Update${entityName}`,
					errorMessage: `Failed to update ${entityLower}. Please try again.`,
					dataPath: dataPaths?.update
				}
			);
		},

		/**
		 * Delete entity
		 *
		 * @param id - Entity ID
		 * @returns Success boolean
		 */
		async delete(id: string): Promise<boolean> {
			const result = await baseOps.mutate<unknown, { id: string }>(
				mutations.delete,
				{ id },
				{
					operationName: `Delete${entityName}`,
					errorMessage: `Failed to delete ${entityLower}. Please try again.`,
					dataPath: dataPaths?.delete
				}
			);

			// If dataPath is specified and returns a boolean, use it
			// Otherwise assume success if no error was thrown
			return typeof result === 'boolean' ? result : true;
		}
	};
}

/**
 * Create CRUD operations with custom method names
 *
 * Useful when the default method names (getAll, getById, etc.) conflict
 * with existing code or need different naming conventions.
 *
 * @param config - CRUD operations configuration
 * @param methodNames - Custom method name mapping
 * @returns Object with CRUD operations using custom names
 *
 * @example
 * ```typescript
 * const taskOps = createCRUDOperationsWithCustomNames(
 *   { client, entityName: 'Task', queries, mutations },
 *   {
 *     getAll: 'list',
 *     getById: 'find',
 *     create: 'add',
 *     update: 'modify',
 *     delete: 'remove'
 *   }
 * );
 *
 * const tasks = await taskOps.list({ status: 'ACTIVE' });
 * const task = await taskOps.find('task-123');
 * await taskOps.remove('task-456');
 * ```
 */
export function createCRUDOperationsWithCustomNames<
	TEntity = unknown,
	TCreateInput = Partial<TEntity>,
	TUpdateInput = Partial<TEntity>,
	TGetAllVariables extends AnyVariables = AnyVariables
>(
	config: CRUDOperationsConfig<TEntity, TCreateInput, TUpdateInput, TGetAllVariables>,
	methodNames: {
		getAll?: string;
		getById?: string;
		create?: string;
		update?: string;
		delete?: string;
	}
): Record<string, (...args: unknown[]) => Promise<unknown>> {
	const ops = createCRUDOperations(config);

	return {
		[methodNames.getAll || 'getAll']: (variables?: unknown) =>
			ops.getAll(variables as TGetAllVariables),
		[methodNames.getById || 'getById']: (id: unknown) => ops.getById(String(id)),
		[methodNames.create || 'create']: (input: unknown) => ops.create(input as TCreateInput),
		[methodNames.update || 'update']: (id: unknown, input: unknown) =>
			ops.update(String(id), input as TUpdateInput),
		[methodNames.delete || 'delete']: (id: unknown) => ops.delete(String(id))
	};
}
