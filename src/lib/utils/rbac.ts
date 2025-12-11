import { logger } from '$lib/utils/logger';
/**
 * RBAC Validation Utility Functions
 * Feature: 023-reviews-creation-it
 * Task: T038
 *
 * Helper functions for role-based access control validation
 */

import { GraphQLClient } from '$lib/server/graphql-client';
import type { Cookies } from '@sveltejs/kit';

// Cache for direct reports (5-minute TTL)
const directReportsCache = new Map<string, { reports: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user is a direct report of a manager
 *
 * @param managerId - The manager's user ID
 * @param employeeId - The employee's user ID to check
 * @param cookies - SvelteKit cookies for authentication
 * @returns true if employee is a direct report of manager
 */
export async function isDirectReport(
	managerId: string,
	employeeId: string,
	cookies: Cookies
): Promise<boolean> {
	// Check cache first
	const cached = directReportsCache.get(managerId);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.reports.includes(employeeId);
	}

	try {
		// Query direct reports from database using server-side GraphQL client
		const client = GraphQLClient.fromCookies(cookies);
		const response = await client.query<{
			directReports: {
				nodes: Array<{ id: string }>;
			};
		}>(
			`
			query GetDirectReports($managerId: UUID!) {
				directReports(pManagerId: $managerId) {
					nodes {
						id
					}
					totalCount
				}
			}
		`,
			{ managerId }
		);

		const result = response.data;
		if (!result?.directReports) {
			return false;
		}

		// Extract report IDs and cache them
		const reportIds = result.directReports.nodes.map((node: any) => node.id);
		directReportsCache.set(managerId, {
			reports: reportIds,
			timestamp: Date.now()
		});

		return reportIds.includes(employeeId);
	} catch (error) {
		logger.error('Error checking direct report relationship:', error as Error);
		return false;
	}
}

/**
 * Check if a user can create a review for an employee
 *
 * @param userRole - Current user's role
 * @param userId - Current user's ID
 * @param employeeId - Target employee's ID
 * @param cookies - SvelteKit cookies for authentication
 * @returns true if user can create review
 */
export async function canCreateReview(
	userRole: string,
	userId: string,
	employeeId: string,
	cookies: Cookies
): Promise<boolean> {
	// Admins can create reviews for anyone
	if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr_manager') {
		return true;
	}

	// Managers can create reviews for their direct reports
	if (userRole === 'manager') {
		return await isDirectReport(userId, employeeId, cookies);
	}

	// Regular employees cannot create reviews
	return false;
}

/**
 * Check if a user can edit a review
 *
 * @param userId - Current user's ID
 * @param userRole - Current user's role
 * @param reviewerId - The reviewer's ID (who created the review)
 * @param reviewStatus - Current status of the review
 * @returns true if user can edit the review
 */
export function canEditReview(
	userId: string,
	userRole: string,
	reviewerId: string,
	reviewStatus: string
): boolean {
	// Admins can edit any review
	if (userRole === 'admin' || userRole === 'super_admin') {
		return true;
	}

	// Can only edit DRAFT reviews
	if (reviewStatus !== 'DRAFT' && reviewStatus !== 'draft') {
		return false;
	}

	// Reviewer can edit their own draft reviews
	if (userId === reviewerId) {
		return true;
	}

	return false;
}

/**
 * Check if a user can view a review
 *
 * @param userId - Current user's ID
 * @param userRole - Current user's role
 * @param employeeId - The employee being reviewed
 * @param reviewerId - The reviewer's ID
 * @param cookies - SvelteKit cookies for authentication
 * @returns true if user can view the review
 */
export async function canViewReview(
	userId: string,
	userRole: string,
	employeeId: string,
	reviewerId: string,
	cookies: Cookies
): Promise<boolean> {
	// Admins and HR managers can view all reviews
	if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr_manager') {
		return true;
	}

	// Reviewer can view reviews they created
	if (userId === reviewerId) {
		return true;
	}

	// Employee can view their own reviews
	if (userId === employeeId) {
		return true;
	}

	// Managers can view reviews of their direct reports
	if (userRole === 'manager') {
		return await isDirectReport(userId, employeeId, cookies);
	}

	return false;
}

/**
 * Clear the direct reports cache for a specific manager
 *
 * @param managerId - The manager's user ID
 */
export function clearDirectReportsCache(managerId?: string): void {
	if (managerId) {
		directReportsCache.delete(managerId);
	} else {
		directReportsCache.clear();
	}
}

/**
 * Get all cached manager IDs (for debugging)
 */
export function getCachedManagerIds(): string[] {
	return Array.from(directReportsCache.keys());
}
