// Management Reports - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Authorization is handled by parent layout (+layout.server.ts)
	const parentData = await event.parent();
	const { hasManagerAccess, isAdmin } = parentData;

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
					accessToken: cookies.get('hr_token') || ''
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
				filters: { searchTerm, typeFilter, categoryFilter, statusFilter, departmentFilter, page, limit },
				pagination: { currentPage: page, limit, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
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

		// Load reports from database
		const reportsQuery = `
			query GetHrReports(
				$limit: Int!
				$offset: Int!
				$typeFilter: ReportType
				$categoryFilter: String
				$statusFilter: ReportStatus
			) {
				allHrReports(
					first: $limit
					offset: $offset
					orderBy: [CREATED_AT_DESC]
					condition: {
						reportType: $typeFilter
						category: $categoryFilter
						status: $statusFilter
					}
				) {
					totalCount
					nodes {
						id
						creatorId
						departmentId
						title
						reportType
						category
						filters
						data
						status
						scheduledAt
						generatedAt
						createdAt
						updatedAt
						userByCreatorId {
							id
							firstName
							lastName
						}
						departmentByDepartmentId {
							id
							name
						}
					}
				}
			}
		`;

		const reportsData = await graphqlClient.query(reportsQuery, {
			limit,
			offset,
			typeFilter: typeFilter || undefined,
			categoryFilter: categoryFilter || undefined,
			statusFilter: statusFilter || undefined
		});

		const allHrReports = reportsData.data?.allHrReports?.nodes || [];
		const totalCount = reportsData.data?.allHrReports?.totalCount || 0;

		// Map reports to expected format
		const reports = allHrReports.map((report: any) => {
			// Parse JSONB fields
			const filters = report.filters ? (typeof report.filters === 'string' ? JSON.parse(report.filters) : report.filters) : {};
			const data = report.data ? (typeof report.data === 'string' ? JSON.parse(report.data) : report.data) : {};

			return {
				id: report.id,
				title: report.title,
				description: data.description || '',
				type: report.reportType,
				category: report.category || 'General',
				status: report.status,
				createdAt: report.createdAt,
				runDate: report.scheduledAt || report.createdAt,
				completedAt: report.generatedAt,
				createdBy: report.userByCreatorId ? {
					id: report.userByCreatorId.id,
					name: `${report.userByCreatorId.firstName} ${report.userByCreatorId.lastName}`,
					role: 'Manager' // Role not in schema
				} : null,
				department: report.departmentByDepartmentId ? {
					id: report.departmentByDepartmentId.id,
					name: report.departmentByDepartmentId.name
				} : null,
				parameters: filters,
				fileSize: data.fileSize || null,
				downloadCount: data.downloadCount || 0,
				runtime: data.runtime || null,
				lastError: report.status === 'failed' ? (data.error || 'Unknown error') : null
			};
		});

		// Calculate analytics from reports
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		// Get unique types and categories from actual data
		const uniqueTypes = [...new Set(reports.map(r => r.type))];
		const uniqueCategories = [...new Set(reports.map(r => r.category))];

		const analytics = {
			summary: {
				totalReports: totalCount,
				activeReports: reports.filter(r => r.status === 'running').length,
				scheduledReports: reports.filter(r => r.status === 'scheduled').length,
				completedReports: reports.filter(r => r.status === 'completed').length,
				generatedToday: reports.filter(r => new Date(r.createdAt) >= todayStart).length,
				generatedThisWeek: reports.filter(r => new Date(r.createdAt) >= weekStart).length,
				generatedThisMonth: reports.filter(r => new Date(r.createdAt) >= monthStart).length,
				mostPopularType: uniqueTypes[0] || 'general',
				avgRunTime: 0 // Not calculated from current schema
			},
			typeBreakdown: uniqueTypes.map(type => ({
				type,
				count: reports.filter(r => r.type === type).length,
				percentage: totalCount > 0 ? Math.round((reports.filter(r => r.type === type).length / totalCount) * 100) : 0
			})),
			categoryBreakdown: uniqueCategories.map(category => ({
				category,
				count: reports.filter(r => r.category === category).length,
				percentage: totalCount > 0 ? Math.round((reports.filter(r => r.category === category).length / totalCount) * 100) : 0
			})),
			performanceMetrics: {
				successRate: totalCount > 0 ? Math.round((reports.filter(r => r.status === 'completed').length / totalCount) * 100) : 0,
				errorRate: totalCount > 0 ? Math.round((reports.filter(r => r.status === 'failed').length / totalCount) * 100) : 0
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
				accessToken: cookies.get('hr_token') || ''
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
				accessToken: cookies.get('hr_token') || ''
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
