// src/domain/Department/types.ts

/**
 * Data required to create a Department entity.
 */
export interface CreateDepartmentData {
	/** Unique department identifier (UUID) */
	id: string;

	/** Department name (1-100 characters) */
	name: string;

	/** Optional parent department ID (UUID) - null for root departments */
	parentId?: string | null;

	/** Optional ordered ancestor IDs from immediate parent to root */
	ancestorIds?: string[];

	/** Optional manager user ID (UUID) */
	managerId?: string | null;

	/** Optional department description (max 500 characters) */
	description?: string | null;

	/** Cached employee count (default: 0) */
	employeeCount?: number;

	/** Soft delete flag (default: false) */
	isDeleted?: boolean;
}

/**
 * Serializable department data for transfer across boundaries.
 */
export interface DepartmentDTO {
	id: string;
	name: string;
	parentId: string | null;
	ancestorIds: string[];
	managerId: string | null;
	description: string | null;
	employeeCount: number;
	isDeleted: boolean;
	depth: number;
}

/**
 * Filter criteria for finding departments.
 */
export interface FindDepartmentsFilter {
	/** Search by name (partial match, case-insensitive) */
	searchTerm?: string;

	/** Filter by parent department ID */
	parentId?: string | null;

	/** Filter root departments only */
	rootOnly?: boolean;

	/** Include deleted departments */
	includeDeleted?: boolean;

	/** Filter by manager ID */
	managerId?: string;

	/** Page number (1-indexed) */
	page?: number;

	/** Items per page */
	limit?: number;
}

/**
 * Result of finding multiple departments.
 */
export interface FindDepartmentsResult {
	departments: DepartmentDTO[];
	total: number;
	limit: number;
	offset: number;
}
