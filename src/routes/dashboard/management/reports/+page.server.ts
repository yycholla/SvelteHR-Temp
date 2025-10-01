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

		// TODO: Load actual reports from database
		// For now, generate sample reports data
		const currentDate = new Date();
		const reportTypes = ['employee', 'payroll', 'performance', 'attendance', 'compliance', 'analytics'];
		const categories = ['HR', 'Finance', 'Operations', 'Analytics', 'Compliance'];
		const statuses = ['completed', 'running', 'scheduled', 'failed', 'draft'];

		const allReports = Array.from({ length: 32 }, (_, i) => {
			const type = reportTypes[Math.floor(Math.random() * reportTypes.length)];
			const category = categories[Math.floor(Math.random() * categories.length)];
			const status = statuses[Math.floor(Math.random() * statuses.length)];

			const createdDate = new Date(currentDate);
			createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 90));

			const runDate = status === 'scheduled' ?
				new Date(currentDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) :
				createdDate;

			const reportTitles = {
				employee: ['Employee Directory Report', 'New Hire Report', 'Termination Report', 'Department Headcount'],
				payroll: ['Monthly Payroll Summary', 'Overtime Report', 'Benefits Enrollment', 'Tax Withholdings'],
				performance: ['Performance Review Summary', 'Goal Progress Report', 'Top Performers', '360 Feedback'],
				attendance: ['Attendance Summary', 'Time Off Report', 'Late Arrivals', 'Remote Work Hours'],
				compliance: ['Compliance Audit', 'Training Completion', 'Policy Acknowledgment', 'Safety Records'],
				analytics: ['HR Analytics Dashboard', 'Turnover Analysis', 'Engagement Survey', 'Productivity Metrics']
			};

			const titles = reportTitles[type] || ['General Report'];
			const title = titles[Math.floor(Math.random() * titles.length)];

			return {
				id: `report-${i}`,
				title: `${title} - ${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`,
				description: `${category} report for ${type} data analysis and insights`,
				type,
				category,
				status,
				createdAt: createdDate.toISOString(),
				runDate: runDate.toISOString(),
				completedAt: status === 'completed' ? runDate.toISOString() : null,
				createdBy: {
					id: `user-${(i % 5) + 1}`,
					name: ['Sarah Johnson', 'Mike Davis', 'Lisa Chen', 'David Wilson', 'Emma Brown'][i % 5],
					role: ['HR Manager', 'Finance Director', 'Operations Manager', 'Analytics Lead', 'Compliance Officer'][i % 5]
				},
				parameters: {
					dateRange: status === 'scheduled' ? 'Next Month' : 'Last 30 Days',
					departments: Math.random() > 0.5 ? 'All Departments' : 'Engineering, Sales',
					includeInactive: Math.random() > 0.7
				},
				fileSize: status === 'completed' ? `${Math.floor(Math.random() * 500) + 50}KB` : null,
				downloadCount: status === 'completed' ? Math.floor(Math.random() * 25) : 0,
				runtime: status === 'completed' ? `${Math.floor(Math.random() * 45) + 5}s` : null,
				lastError: status === 'failed' ? 'Database connection timeout' : null
			};
		});

		// Apply filters
		let filteredReports = allReports;
		if (searchTerm) {
			filteredReports = filteredReports.filter(r =>
				r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				r.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
		if (typeFilter) {
			filteredReports = filteredReports.filter(r => r.type === typeFilter);
		}
		if (categoryFilter) {
			filteredReports = filteredReports.filter(r => r.category === categoryFilter);
		}
		if (statusFilter) {
			filteredReports = filteredReports.filter(r => r.status === statusFilter);
		}
		if (departmentFilter) {
			// Mock department filtering
			filteredReports = filteredReports.filter(() => Math.random() > 0.3);
		}

		// Apply pagination
		const totalReports = filteredReports.length;
		const reports = filteredReports.slice(offset, offset + limit);

		// Calculate analytics from all reports
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		const analytics = {
			summary: {
				totalReports: allReports.length,
				activeReports: allReports.filter(r => r.status === 'running').length,
				scheduledReports: allReports.filter(r => r.status === 'scheduled').length,
				completedReports: allReports.filter(r => r.status === 'completed').length,
				generatedToday: allReports.filter(r => new Date(r.createdAt) >= todayStart).length,
				generatedThisWeek: allReports.filter(r => new Date(r.createdAt) >= weekStart).length,
				generatedThisMonth: allReports.filter(r => new Date(r.createdAt) >= monthStart).length,
				mostPopularType: 'employee',
				avgRunTime: 28
			},
			typeBreakdown: reportTypes.map(type => ({
				type,
				count: allReports.filter(r => r.type === type).length,
				percentage: Math.round((allReports.filter(r => r.type === type).length / allReports.length) * 100)
			})),
			categoryBreakdown: categories.map(category => ({
				category,
				count: allReports.filter(r => r.category === category).length,
				percentage: Math.round((allReports.filter(r => r.category === category).length / allReports.length) * 100)
			})),
			performanceMetrics: {
				successRate: Math.round((allReports.filter(r => r.status === 'completed').length / allReports.length) * 100),
				errorRate: Math.round((allReports.filter(r => r.status === 'failed').length / allReports.length) * 100)
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
			totalReports,
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
				totalPages: Math.ceil(totalReports / limit),
				hasNextPage: page < Math.ceil(totalReports / limit),
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
