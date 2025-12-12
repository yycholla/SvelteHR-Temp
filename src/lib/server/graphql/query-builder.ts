/**
 * Fluent API for building GraphQL queries with common patterns
 *
 * Provides a chainable interface for constructing GraphQL query variables
 * with filtering, pagination, field selection, and ordering.
 *
 * @example
 * ```typescript
 * const queryBuilder = new GraphQLQueryBuilder()
 *   .select('id', 'name', 'email')
 *   .where('status', 'ACTIVE')
 *   .where('department', 'Engineering')
 *   .paginate(20, 1)
 *   .orderBy('createdAt', 'DESC');
 *
 * const variables = queryBuilder.build();
 * // { first: 20, offset: 0, condition: { status: 'ACTIVE', department: 'Engineering' }, orderBy: ['createdAt_DESC'] }
 * ```
 */
export class GraphQLQueryBuilder {
	private fields: string[] = [];
	private filters: Record<string, any> = {};
	private pagination: { limit?: number; offset?: number } = {};
	private orderByFields: string[] = [];

	/**
	 * Add fields to select
	 *
	 * @param fields - Field names to include in the query
	 * @returns This builder instance for chaining
	 *
	 * @example
	 * ```typescript
	 * builder.select('id', 'name', 'email', 'createdAt')
	 * ```
	 */
	select(...fields: string[]): this {
		this.fields.push(...fields);
		return this;
	}

	/**
	 * Add filter conditions
	 *
	 * Can be called multiple times to add multiple filter conditions.
	 * All conditions are combined with AND logic.
	 *
	 * @param field - Field name to filter on
	 * @param value - Value to filter by
	 * @returns This builder instance for chaining
	 *
	 * @example
	 * ```typescript
	 * builder
	 *   .where('status', 'ACTIVE')
	 *   .where('role', 'ADMIN')
	 * ```
	 */
	where(field: string, value: any): this {
		this.filters[field] = value;
		return this;
	}

	/**
	 * Add pagination parameters
	 *
	 * Converts page number and limit into offset-based pagination
	 * commonly used in GraphQL APIs.
	 *
	 * @param limit - Number of items per page
	 * @param page - Page number (1-indexed, defaults to 1)
	 * @returns This builder instance for chaining
	 *
	 * @example
	 * ```typescript
	 * builder.paginate(20, 2)  // Returns items 21-40
	 * ```
	 */
	paginate(limit: number, page: number = 1): this {
		this.pagination = {
			limit,
			offset: (page - 1) * limit
		};
		return this;
	}

	/**
	 * Add ordering criteria
	 *
	 * Can be called multiple times to add multiple sort fields.
	 * Fields are applied in the order they are added.
	 *
	 * @param field - Field name to sort by
	 * @param direction - Sort direction ('ASC' or 'DESC', defaults to 'ASC')
	 * @returns This builder instance for chaining
	 *
	 * @example
	 * ```typescript
	 * builder
	 *   .orderBy('priority', 'DESC')
	 *   .orderBy('createdAt', 'ASC')
	 * ```
	 */
	orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
		this.orderByFields.push(`${field}_${direction}`);
		return this;
	}

	/**
	 * Build the final variables object for GraphQL query
	 *
	 * Converts all configured filters, pagination, and ordering into
	 * a variables object ready to pass to a GraphQL query.
	 *
	 * Only includes properties that have been set. Empty filters, pagination,
	 * or ordering are omitted from the result.
	 *
	 * @returns Variables object for GraphQL query
	 *
	 * @example
	 * ```typescript
	 * const variables = builder.build();
	 * const result = await client.query(GET_TASKS, variables);
	 * ```
	 */
	build(): {
		first?: number;
		offset?: number;
		condition?: Record<string, any>;
		orderBy?: string[];
	} {
		const result: {
			first?: number;
			offset?: number;
			condition?: Record<string, any>;
			orderBy?: string[];
		} = {};

		// Add pagination if configured
		if (this.pagination.limit !== undefined) {
			result.first = this.pagination.limit;
		}

		if (this.pagination.offset !== undefined) {
			result.offset = this.pagination.offset;
		}

		// Add filters if any were set
		if (Object.keys(this.filters).length > 0) {
			result.condition = this.filters;
		}

		// Add ordering if configured
		if (this.orderByFields.length > 0) {
			result.orderBy = this.orderByFields;
		}

		return result;
	}

	/**
	 * Reset the builder to initial state
	 *
	 * Clears all fields, filters, pagination, and ordering.
	 * Useful for reusing the same builder instance.
	 *
	 * @returns This builder instance for chaining
	 *
	 * @example
	 * ```typescript
	 * builder.reset().where('status', 'NEW').paginate(10, 1);
	 * ```
	 */
	reset(): this {
		this.fields = [];
		this.filters = {};
		this.pagination = {};
		this.orderByFields = [];
		return this;
	}
}
