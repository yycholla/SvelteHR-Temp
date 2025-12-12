/**
 * Type-safe query parameter extraction from URLs
 *
 * Eliminates ~10-15 lines of duplicate URL parameter parsing code from
 * each route by providing a chainable, type-safe API.
 *
 * Features:
 * - Type-safe extraction (string, int, boolean)
 * - Default value support
 * - Pagination helpers
 * - Filter extraction
 * - Safe parsing with NaN handling
 *
 * @example
 * ```typescript
 * const params = new QueryParamExtractor(event.url);
 * const page = params.getInt('page', 1);
 * const limit = params.getInt('limit', 20);
 * const search = params.getString('search');
 * const filters = params.getFilters(['status', 'priority', 'assignee']);
 * ```
 */
export class QueryParamExtractor {
	private url: URL;

	/**
	 * Create a new query parameter extractor
	 *
	 * @param url - URL object from SvelteKit event
	 */
	constructor(url: URL) {
		this.url = url;
	}

	/**
	 * Get string parameter with default value
	 *
	 * Returns empty string if parameter is not present or is empty.
	 *
	 * @param key - Parameter name
	 * @param defaultValue - Default value if parameter is missing (defaults to '')
	 * @returns Parameter value or default
	 *
	 * @example
	 * ```typescript
	 * const search = params.getString('search', '');
	 * const status = params.getString('status', 'all');
	 * ```
	 */
	getString(key: string, defaultValue: string = ''): string {
		return this.url.searchParams.get(key) || defaultValue;
	}

	/**
	 * Get integer parameter with default value
	 *
	 * Safely parses string to integer. Returns default value if:
	 * - Parameter is not present
	 * - Parameter value is empty
	 * - Parameter value cannot be parsed as integer (NaN)
	 *
	 * @param key - Parameter name
	 * @param defaultValue - Default value if parameter is missing or invalid (defaults to 0)
	 * @returns Parsed integer or default
	 *
	 * @example
	 * ```typescript
	 * const page = params.getInt('page', 1);
	 * const limit = params.getInt('limit', 20);
	 * const userId = params.getInt('userId', 0);
	 * ```
	 */
	getInt(key: string, defaultValue: number = 0): number {
		const value = this.url.searchParams.get(key);
		if (!value) return defaultValue;

		const parsed = parseInt(value, 10);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	/**
	 * Get float parameter with default value
	 *
	 * Safely parses string to float. Returns default value if:
	 * - Parameter is not present
	 * - Parameter value is empty
	 * - Parameter value cannot be parsed as float (NaN)
	 *
	 * @param key - Parameter name
	 * @param defaultValue - Default value if parameter is missing or invalid (defaults to 0)
	 * @returns Parsed float or default
	 *
	 * @example
	 * ```typescript
	 * const price = params.getFloat('price', 0.0);
	 * const rating = params.getFloat('rating', 0.0);
	 * ```
	 */
	getFloat(key: string, defaultValue: number = 0): number {
		const value = this.url.searchParams.get(key);
		if (!value) return defaultValue;

		const parsed = parseFloat(value);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	/**
	 * Get boolean parameter
	 *
	 * Treats the following as true: 'true', '1', 'yes'
	 * All other values (including absence) are treated as false.
	 *
	 * @param key - Parameter name
	 * @param defaultValue - Default value if parameter is missing (defaults to false)
	 * @returns Boolean value
	 *
	 * @example
	 * ```typescript
	 * const includeInactive = params.getBoolean('includeInactive', false);
	 * const archived = params.getBoolean('archived');
	 * ```
	 */
	getBoolean(key: string, defaultValue: boolean = false): boolean {
		const value = this.url.searchParams.get(key);
		if (!value) return defaultValue;

		const lowerValue = value.toLowerCase();
		return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
	}

	/**
	 * Extract pagination parameters
	 *
	 * Calculates offset automatically from page and limit.
	 * Ensures page is at least 1 and limit is at least 1.
	 *
	 * @param defaultLimit - Default items per page (defaults to 20)
	 * @returns Pagination object with page, limit, and calculated offset
	 *
	 * @example
	 * ```typescript
	 * const { page, limit, offset } = params.getPagination(20);
	 * // URL: ?page=3&limit=50
	 * // Returns: { page: 3, limit: 50, offset: 100 }
	 * ```
	 */
	getPagination(defaultLimit: number = 20): {
		page: number;
		limit: number;
		offset: number;
	} {
		const page = Math.max(1, this.getInt('page', 1));
		const limit = Math.max(1, this.getInt('limit', defaultLimit));

		return {
			page,
			limit,
			offset: (page - 1) * limit
		};
	}

	/**
	 * Extract filter parameters by keys
	 *
	 * Returns an object containing only the specified parameters that
	 * have non-empty values in the URL.
	 *
	 * @param keys - Array of parameter names to extract
	 * @returns Object with only present and non-empty filter values
	 *
	 * @example
	 * ```typescript
	 * const filters = params.getFilters(['status', 'priority', 'assignee']);
	 * // URL: ?status=active&priority=high
	 * // Returns: { status: 'active', priority: 'high' }
	 * ```
	 */
	getFilters(keys: string[]): Record<string, string> {
		const filters: Record<string, string> = {};

		for (const key of keys) {
			const value = this.getString(key);
			if (value) {
				filters[key] = value;
			}
		}

		return filters;
	}

	/**
	 * Get date parameter
	 *
	 * Parses ISO date strings. Returns null if parameter is missing or invalid.
	 * For date-only strings (YYYY-MM-DD), parses as local date to avoid timezone issues.
	 *
	 * @param key - Parameter name
	 * @returns Date object or null
	 *
	 * @example
	 * ```typescript
	 * const startDate = params.getDate('startDate');
	 * const endDate = params.getDate('endDate');
	 * if (startDate && endDate) {
	 *   // Filter by date range
	 * }
	 * ```
	 */
	getDate(key: string): Date | null {
		const value = this.getString(key);
		if (!value) return null;

		// For date-only strings (YYYY-MM-DD), parse as local date
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			const [year, month, day] = value.split('-').map(Number);
			return new Date(year, month - 1, day); // month is 0-indexed
		}

		const date = new Date(value);
		return isNaN(date.getTime()) ? null : date;
	}

	/**
	 * Get array parameter (comma-separated)
	 *
	 * Splits parameter value by comma and trims whitespace.
	 * Returns empty array if parameter is missing.
	 *
	 * @param key - Parameter name
	 * @returns Array of strings
	 *
	 * @example
	 * ```typescript
	 * const tags = params.getArray('tags');
	 * // URL: ?tags=urgent,important,review
	 * // Returns: ['urgent', 'important', 'review']
	 * ```
	 */
	getArray(key: string): string[] {
		const value = this.getString(key);
		if (!value) return [];

		return value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}

	/**
	 * Extract all parameters as object
	 *
	 * Returns all query parameters as string key-value pairs.
	 * Useful for logging or debugging.
	 *
	 * @returns Object with all query parameters
	 *
	 * @example
	 * ```typescript
	 * const allParams = params.getAll();
	 * logger.info('Query params', allParams);
	 * ```
	 */
	getAll(): Record<string, string> {
		const params: Record<string, string> = {};
		this.url.searchParams.forEach((value, key) => {
			params[key] = value;
		});
		return params;
	}

	/**
	 * Check if parameter exists
	 *
	 * Returns true if parameter is present in URL, even if value is empty.
	 *
	 * @param key - Parameter name
	 * @returns True if parameter exists
	 *
	 * @example
	 * ```typescript
	 * if (params.has('debug')) {
	 *   logger.setLevel('debug');
	 * }
	 * ```
	 */
	has(key: string): boolean {
		return this.url.searchParams.has(key);
	}
}
