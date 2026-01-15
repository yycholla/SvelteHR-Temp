// Management Reports - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { ensureBackendReady } from '$lib/server/backend-init';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';
import { Aggregators, StatisticsCalculator } from '$lib/server/analytics';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, [
		'reports:read',
		'reports:read:self',
		'reports:read:team',
		'reports:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		if (!locals.user) throw new Error('Unauthorized');
		const user = locals.user;

		const userPerms = loader['permissions']; // Access computed permissions
		const hasManagerAccess = userPerms.canViewManagement;

		// Extract search parameters for filtering
		const params = new QueryParamExtractor(url);
		const { page, limit, offset } = params.getPagination(20);
		const searchTerm = params.getString('search');
		const typeFilter = params.getString('type');
		const categoryFilter = params.getString('category');
		const statusFilter = params.getString('status');
		const departmentFilter = params.getString('department');

		// Default empty structure for error cases
		const getEmptyState = (errorMsg?: string, errorDetails?: string) => {
			const emptyMetrics = {
				total: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
				approvalRate: 0,
				totalDaysRequested: 0
			};

			return {
				user: {
					id: user.id,
					email: user.email || '',
					displayName: user.display_name || 'User',
					role: user.role || 'employee'
				},
				userSession: {
					userId: user.id,
					userEmail: user.email || '',
					role: user.role || 'employee',
					accessToken: ''
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
				canCreateReports: hasManagerAccess,
				canEditReports: hasManagerAccess,
				canRunReports: hasManagerAccess,
				canViewAnalytics: locals.roles?.includes('admin') || hasManagerAccess,
				loadedAt: new Date().toISOString(),
				error: errorMsg
					? {
							message: errorMsg,
							details: errorDetails || 'Unknown error',
							retryable: true
						}
					: undefined
			};
		};

		try {
			// Check backend services are ready before proceeding
			const backendReady = await ensureBackendReady();

			// If backend is not ready, return error state but don't crash
			if (!backendReady) {
				logger.warn('Backend not ready for management reports page');
				return getEmptyState(
					'Backend services are initializing. Please try again in a moment.',
					'Backend initialization in progress'
				);
			}

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

			const reportsData = await client.query(reportsQuery, {
				limit: 1000, // Fetch more for client-side filtering
				offset: 0
			});

			const hrReports = reportsData?.hrReports || [];

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

			// Filter reports using ClientSideFilter
			const filter = new ClientSideFilter(reports);

			if (searchTerm) {
				filter.search(searchTerm, ['title', 'description', 'type']);
			}

			if (typeFilter) {
				filter.where('type', typeFilter);
			}

			if (categoryFilter) {
				filter.where('category', categoryFilter);
			}

			// Apply filtering
			const filteredReports = filter.get();
			const totalCount = filteredReports.length;

			// Pagination
			const paginatedReports = filter.paginate(page, limit).get();

			// Calculate analytics using Aggregators and StatisticsCalculator
			// Note: We use filteredReports for analytics to reflect current view context?
			// Usually analytics are for ALL reports, let's use 'reports' (all loaded) for analytics
			const now = new Date();
			const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

			// Count generated reports by time period
			const calc = new StatisticsCalculator(reports);
			const generatedToday = calc.count((r: any) => new Date(r.createdAt) >= todayStart);
			const generatedThisWeek = calc.count((r: any) => new Date(r.createdAt) >= weekStart);
			const generatedThisMonth = calc.count((r: any) => new Date(r.createdAt) >= monthStart);

			// Group by type
			const typeGroups = calc.groupBy('type');
			const uniqueTypes = Object.keys(typeGroups);

			// Find most popular type
			let mostPopularType = 'general';
			let maxCount = 0;
			for (const [type, count] of Object.entries(typeGroups)) {
				if (count > maxCount) {
					maxCount = count;
					mostPopularType = type;
				}
			}

			const analytics = {
				summary: {
					totalReports: reports.length, // Total count before pagination/filtering
					activeReports: 0,
					scheduledReports: 0,
					completedReports: reports.length,
					generatedToday,
					generatedThisWeek,
					generatedThisMonth,
					mostPopularType,
					avgRunTime: 0
				},
				typeBreakdown: uniqueTypes.map((type: string) => ({
					type,
					count: typeGroups[type],
					percentage: reports.length > 0 ? Math.round((typeGroups[type] / reports.length) * 100) : 0
				})),
				categoryBreakdown: [{ category: 'General', count: reports.length, percentage: 100 }],
				performanceMetrics: {
					successRate: 100,
					errorRate: 0
				}
			};

			return {
				user: {
					id: user.id,
					email: user.email || '',
					displayName: user.display_name || 'User',
					role: user.role || 'employee'
				},
				userSession: {
					userId: user.id,
					userEmail: user.email || '',
					role: user.role || 'employee',
					accessToken: ''
				},
				reports: paginatedReports,
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
			logger.error('Error loading management reports data:', err as Error);
			return getEmptyState(
				'Failed to load reports data. Please try again later.',
				err instanceof Error ? err.message : 'Unknown error'
			);
		}
	});
};
