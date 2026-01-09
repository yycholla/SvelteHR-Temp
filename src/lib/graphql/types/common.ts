// ============================================================================
// COMMON INTERFACES
// ============================================================================

/**
 * Base user/employee reference
 */
export interface UserReference {
	id: string;
	displayName: string;
	email: string;
	jobTitle?: string;
}

/**
 * Department reference
 */
export interface DepartmentReference {
	id: string;
	name: string;
}

/**
 * Pagination info (PostGraphile standard)
 */
export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
	nodes: T[];
	totalCount: number;
	pageInfo: PageInfo;
}
