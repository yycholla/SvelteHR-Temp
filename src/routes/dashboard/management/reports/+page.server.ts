// Management Reports - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication and permissions (managers and above)
	requireAuth(event, {
		requiredPermissions: ['reports:read', 'reports:read:self', 'reports:read:team', 'reports:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Extract search parameters for filtering
	const searchTerm = url.searchParams.get('search') || '';
	const typeFilter = url.searchParams.get('type') || '';
	const categoryFilter = url.searchParams.get('category') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;
	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for management reports page');
			return {
				user: {
					id: locals.user.id,
					email: locals.user.email || '',
					displayName: locals.user.display_name || 'User',
					role: locals.user.role || 'employee'
				},
				userSession: {
					userId: locals.user.id,
					userEmail: locals.user.email || '',
					role: locals.user.role || 'employee',
					accessToken: '' // Session-based auth doesn't use access tokens
				},
				reports: [],
				totalReports: 0,
				reportAnalytics: {
					summary: {
						totalReports: 0,
						activeReports: 0,
						scheduledReports: 0,
						completedReports: 0,
						generatedToday: 0,
						generatedThisWeek: 0,
						generatedThisMonth: 0,
						mostPopularType: 'employee',
						avgRunTime: 0
					},
					typeBreakdown: [],
					categoryBreakdown: [],
					performanceMetrics: { successRate: 0, errorRate: 0 }
				},
				filters: {
					searchTerm,
					typeFilter,
					categoryFilter,
					statusFilter,
					departmentFilter,
					page,
					limit
				},
				pagination: {
					currentPage: page,
					limit,
					totalPages: 0,
					hasNextPage: false,
					hasPreviousPage: false
				},
				permissions: locals.permissions || [],
				canCreateReports: false,
				canEditReports: false,
				canRunReports: false,
				canViewAnalytics: false,
				loadedAt: new Date().toISOString(),
				error: {
					message: 'Backend services are initializing. Please try again in a moment.',
					details: 'Backend initialization in progress',
					retryable: true
				}
			};
		}

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load reports from database using Rust GraphQL server
		const reportsQuery = `
			query GetHrReports($limit: Int!, $offset: Int!) {
				hrReports(limit: $limit, offset: $offset) {
					id
					title
					reportType
					generatedBy
					parameters
					filePath
					createdAt
				}
			}
		`;

		const reportsData = await graphqlClient.query(reportsQuery, {
			limit,
			offset
		});

		const hrReports = reportsData.data?.hrReports || [];
		const totalCount = hrReports.length; // Since we don't have a count query, use array length

		// Map reports to expected HrReport interface format
		const reports = hrReports.map((report: any) => {
			// Parse JSONB parameters field
			const params = report.parameters
				? typeof report.parameters === 'string'
					? JSON.parse(report.parameters)
					: report.parameters
				: {};

			return {
				id: report.id,
				creatorId: report.generatedBy,
				creator: {
					id: report.generatedBy,
					displayName: 'Report Creator', // User info not joined in current Rust schema
					email: `creator-${report.generatedBy}@company.com`
				},
				departmentId: null, // Department not in current Rust schema
				department: null, // Department not in current Rust schema
				title: report.title,
				reportType: report.reportType,
				category: 'General', // Category not in current Rust schema
				filters: params.filters || {},
				data: params,
				status: 'completed', // Status not in current Rust schema, assume completed
				scheduledAt: null, // Not in current Rust schema
				generatedAt: report.createdAt,
				createdAt: report.createdAt,
				updatedAt: report.createdAt,
				// Additional fields for frontend compatibility
				description: params.description || '',
				type: report.reportType,
				runDate: report.createdAt,
				completedAt: report.createdAt,
				createdBy: {
					id: report.generatedBy,
					name: 'Report Creator',
					role: 'Manager'
				},
				parameters: params.filters || {},
				filePath: report.filePath || null,
				fileSize: params.fileSize || null,
				downloadCount: params.downloadCount || 0,
				runtime: params.runtime || null,
				lastError: null
			};
		});

		// Calculate analytics from reports
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		// Get unique types from actual data (categories are not in current Rust schema)
		const uniqueTypes = [...new Set(reports.map((r: any) => r.type))];

		const analytics = {
			summary: {
				totalReports: totalCount,
				activeReports: 0, // No status field in current Rust schema
				scheduledReports: 0, // No status field in current Rust schema
				completedReports: totalCount, // Assume all reports are completed
				generatedToday: reports.filter((r: any) => new Date(r.createdAt) >= todayStart).length,
				generatedThisWeek: reports.filter((r: any) => new Date(r.createdAt) >= weekStart).length,
				generatedThisMonth: reports.filter((r: any) => new Date(r.createdAt) >= monthStart).length,
				mostPopularType: uniqueTypes[0] || 'general',
				avgRunTime: 0 // Not calculated from current schema
			},
			typeBreakdown: uniqueTypes.map((type: string) => ({
				type,
				count: reports.filter((r: any) => r.type === type).length,
				percentage:
					totalCount > 0
						? Math.round((reports.filter((r: any) => r.type === type).length / totalCount) * 100)
						: 0
			})),
			categoryBreakdown: [{ category: 'General', count: totalCount, percentage: 100 }], // Single category since not in schema
			performanceMetrics: {
				successRate: 100, // Assume all reports are successful
				errorRate: 0 // No error tracking in current Rust schema
			}
		};

		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: locals.user.role || 'employee'
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: locals.user.role || 'employee',
				accessToken: '' // Session-based auth doesn't use access tokens
			},
			reports,
			totalReports: totalCount,
			reportAnalytics: analytics,
			filters: {
				searchTerm,
				typeFilter,
				categoryFilter,
				statusFilter,
				departmentFilter,
				page,
				limit
			},
			pagination: {
				currentPage: page,
				limit,
				totalPages: Math.ceil(totalCount / limit),
				hasNextPage: page < Math.ceil(totalCount / limit),
				hasPreviousPage: page > 1
			},
			permissions: locals.permissions || [],
			canCreateReports: hasManagerAccess,
			canEditReports: hasManagerAccess,
			canRunReports: hasManagerAccess,
			canViewAnalytics: locals.roles?.includes('admin') || hasManagerAccess,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading management reports data:', err);

		// Return error state instead of throwing to prevent page crash
		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: locals.user.role || 'employee'
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: locals.user.role || 'employee',
				accessToken: '' // Session-based auth doesn't use access tokens
			},
			reports: [],
			totalReports: 0,
			reportAnalytics: {
				summary: {
					totalReports: 0,
					activeReports: 0,
					scheduledReports: 0,
					completedReports: 0,
					generatedToday: 0,
					generatedThisWeek: 0,
					generatedThisMonth: 0,
					mostPopularType: 'employee',
					avgRunTime: 0
				},
				typeBreakdown: [],
				categoryBreakdown: [],
				performanceMetrics: { successRate: 0, errorRate: 0 }
			},
			filters: {
				searchTerm: url.searchParams.get('search') || '',
				typeFilter: url.searchParams.get('type') || '',
				categoryFilter: url.searchParams.get('category') || '',
				statusFilter: url.searchParams.get('status') || '',
				departmentFilter: url.searchParams.get('department') || '',
				page: parseInt(url.searchParams.get('page') || '1', 10),
				limit: parseInt(url.searchParams.get('limit') || '20', 10)
			},
			pagination: {
				currentPage: parseInt(url.searchParams.get('page') || '1', 10),
				limit: parseInt(url.searchParams.get('limit') || '20', 10),
				totalPages: 0,
				hasNextPage: false,
				hasPreviousPage: false
			},
			permissions: locals.permissions || [],
			canCreateReports: false,
			canEditReports: false,
			canRunReports: false,
			canViewAnalytics: false,
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Failed to load reports data. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};
