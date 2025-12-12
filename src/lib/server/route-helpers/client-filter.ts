/**
 * Fluent API for client-side filtering and data manipulation
 *
 * NOTE: Client-side filtering should be used sparingly. Backend filtering
 * is preferred for performance and scalability. Use this only when:
 * - Backend doesn't support the required filter
 * - Dataset is small (<1000 items)
 * - Temporary workaround until backend is updated
 *
 * Provides chainable methods for:
 * - Field-based filtering
 * - Custom predicate filtering
 * - Text search across multiple fields
 * - Pagination
 * - Sorting
 *
 * @example
 * ```typescript
 * const filtered = new ClientSideFilter(allTasks)
 *   .where('status', 'IN_PROGRESS')
 *   .search(searchTerm, ['title', 'description'])
 *   .sortBy('createdAt', 'desc')
 *   .paginate(page, limit)
 *   .get();
 * ```
 */
export class ClientSideFilter<T = any> {
	private items: T[];

	/**
	 * Create a new client-side filter
	 *
	 * Creates a shallow copy of the input array to avoid mutating the original.
	 *
	 * @param items - Collection to filter
	 */
	constructor(items: T[]) {
		this.items = [...items];
	}

	/**
	 * Filter by field value
	 *
	 * Keeps only items where field equals the specified value.
	 * Skips filtering if value is null, undefined, or empty string.
	 *
	 * @param field - Field name to filter on
	 * @param value - Value to match (null/undefined/'' skips filtering)
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter.where('status', 'ACTIVE')  // Only active items
	 *       .where('priority', 'HIGH')  // AND high priority
	 * ```
	 */
	where(field: keyof T, value: any): this {
		// Skip filtering if value is not meaningful
		if (value === null || value === undefined || value === '') {
			return this;
		}

		this.items = this.items.filter((item) => item[field] === value);
		return this;
	}

	/**
	 * Filter by multiple field values (OR logic)
	 *
	 * Keeps items where field matches ANY of the specified values.
	 * Skips filtering if values array is empty.
	 *
	 * @param field - Field name to filter on
	 * @param values - Array of values to match (any match passes)
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter.whereIn('status', ['TODO', 'IN_PROGRESS', 'REVIEW'])
	 * ```
	 */
	whereIn(field: keyof T, values: any[]): this {
		if (!values || values.length === 0) {
			return this;
		}

		this.items = this.items.filter((item) => values.includes(item[field]));
		return this;
	}

	/**
	 * Filter by custom predicate function
	 *
	 * Provides maximum flexibility for complex filtering logic.
	 *
	 * @param predicate - Function that returns true to keep item
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter.filter((task) => {
	 *   const dueDate = new Date(task.dueDate);
	 *   const now = new Date();
	 *   return dueDate > now && task.status !== 'DONE';
	 * })
	 * ```
	 */
	filter(predicate: (item: T) => boolean): this {
		this.items = this.items.filter(predicate);
		return this;
	}

	/**
	 * Search in multiple text fields
	 *
	 * Performs case-insensitive substring search across specified fields.
	 * Keeps items where ANY field contains the search term.
	 * Skips filtering if search term is empty.
	 *
	 * @param term - Search term (empty string skips search)
	 * @param fields - Array of field names to search in
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter.search('urgent', ['title', 'description', 'notes'])
	 * ```
	 */
	search(term: string, fields: (keyof T)[]): this {
		if (!term || term.trim() === '') {
			return this;
		}

		const searchLower = term.toLowerCase();
		this.items = this.items.filter((item) => {
			return fields.some((field) => {
				const value = String(item[field] || '').toLowerCase();
				return value.includes(searchLower);
			});
		});

		return this;
	}

	/**
	 * Filter by date range
	 *
	 * Keeps items where date field is between start and end dates (inclusive).
	 * Null dates are excluded. Partial ranges are supported.
	 *
	 * @param field - Date field name
	 * @param startDate - Minimum date (inclusive, null = no minimum)
	 * @param endDate - Maximum date (inclusive, null = no maximum)
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * const start = new Date('2024-01-01');
	 * const end = new Date('2024-12-31');
	 * filter.dateRange('createdAt', start, end)
	 * ```
	 */
	dateRange(field: keyof T, startDate: Date | null, endDate: Date | null): this {
		if (!startDate && !endDate) {
			return this;
		}

		this.items = this.items.filter((item) => {
			const itemValue = item[field];
			if (!itemValue) return false;

			const itemDate = new Date(itemValue as any);
			if (isNaN(itemDate.getTime())) return false;

			if (startDate && itemDate < startDate) return false;
			if (endDate && itemDate > endDate) return false;

			return true;
		});

		return this;
	}

	/**
	 * Apply pagination (slice array)
	 *
	 * Returns only items for the specified page.
	 * WARNING: This should be done AFTER all filtering/sorting.
	 *
	 * @param page - Page number (1-indexed)
	 * @param limit - Items per page
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter
	 *   .where('status', 'ACTIVE')
	 *   .sortBy('createdAt', 'desc')
	 *   .paginate(2, 20)  // Items 21-40
	 * ```
	 */
	paginate(page: number, limit: number): this {
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		this.items = this.items.slice(startIndex, endIndex);
		return this;
	}

	/**
	 * Sort by field
	 *
	 * Sorts items by the specified field in ascending or descending order.
	 * Handles string, number, and date comparisons.
	 *
	 * @param field - Field name to sort by
	 * @param direction - Sort direction ('asc' or 'desc', defaults to 'asc')
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter.sortBy('priority', 'desc')  // High to low
	 *       .sortBy('createdAt', 'asc')  // Then oldest first
	 * ```
	 */
	sortBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): this {
		this.items.sort((a, b) => {
			const aVal = a[field];
			const bVal = b[field];

			// Handle null/undefined values
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return direction === 'asc' ? 1 : -1;
			if (bVal == null) return direction === 'asc' ? -1 : 1;

			// Compare values
			if (aVal < bVal) return direction === 'asc' ? -1 : 1;
			if (aVal > bVal) return direction === 'asc' ? 1 : -1;
			return 0;
		});

		return this;
	}

	/**
	 * Sort by multiple fields
	 *
	 * Applies sorting by multiple fields in order of priority.
	 * First sort criteria takes precedence, then second, etc.
	 *
	 * @param sorts - Array of sort configurations
	 * @returns This filter instance for chaining
	 *
	 * @example
	 * ```typescript
	 * filter.sortByMultiple([
	 *   { field: 'priority', direction: 'desc' },
	 *   { field: 'dueDate', direction: 'asc' }
	 * ])
	 * ```
	 */
	sortByMultiple(sorts: Array<{ field: keyof T; direction: 'asc' | 'desc' }>): this {
		this.items.sort((a, b) => {
			for (const sort of sorts) {
				const aVal = a[sort.field];
				const bVal = b[sort.field];

				// Handle null/undefined
				if (aVal == null && bVal == null) continue;
				if (aVal == null) return sort.direction === 'asc' ? 1 : -1;
				if (bVal == null) return sort.direction === 'asc' ? -1 : 1;

				// Compare
				if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
				if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
			}
			return 0;
		});

		return this;
	}

	/**
	 * Get filtered results
	 *
	 * Returns the final filtered array.
	 * This materializes the filter chain.
	 *
	 * @returns Filtered array
	 *
	 * @example
	 * ```typescript
	 * const results = filter
	 *   .where('status', 'ACTIVE')
	 *   .search('urgent', ['title'])
	 *   .get();
	 * ```
	 */
	get(): T[] {
		return this.items;
	}

	/**
	 * Get count without materializing results
	 *
	 * Returns the count of items that match the filters
	 * without creating a new array.
	 *
	 * @returns Count of filtered items
	 *
	 * @example
	 * ```typescript
	 * const activeCount = new ClientSideFilter(tasks)
	 *   .where('status', 'ACTIVE')
	 *   .count();
	 * ```
	 */
	count(): number {
		return this.items.length;
	}

	/**
	 * Check if any items match the filters
	 *
	 * @returns True if at least one item matches
	 *
	 * @example
	 * ```typescript
	 * const hasOverdue = new ClientSideFilter(tasks)
	 *   .filter(t => new Date(t.dueDate) < new Date())
	 *   .any();
	 * ```
	 */
	any(): boolean {
		return this.items.length > 0;
	}

	/**
	 * Get first item or null
	 *
	 * @returns First filtered item or null if none match
	 *
	 * @example
	 * ```typescript
	 * const firstHighPriority = new ClientSideFilter(tasks)
	 *   .where('priority', 'HIGH')
	 *   .sortBy('createdAt', 'asc')
	 *   .first();
	 * ```
	 */
	first(): T | null {
		return this.items.length > 0 ? this.items[0] : null;
	}
}
