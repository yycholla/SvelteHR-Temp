import type { PageServerLoad } from './$types';
import {
	loadDocumentData,
	loadActivityLogData,
	parseSearchParams,
	createAuthenticatedApiClient
} from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('📋 Loading compliance page with new API client');

	try {
		// Parse URL parameters for filtering
		const params = parseSearchParams(url);
		const status = url.searchParams.get('status') || 'all';
		const itemType = url.searchParams.get('itemType') || 'all';

		// Load compliance-related documents (certificates, policies, training)
		const documentData = await loadDocumentData(cookies, {
			limit: params.limit,
			page: params.page,
			category: itemType !== 'all' ? itemType : undefined
		});

		// Load activity logs for compliance tracking
		const activityData = await loadActivityLogData(cookies, {
			limit: 20,
			resource_type: 'compliance'
		});

		const apiClient = createAuthenticatedApiClient(cookies);

		// Try to get employees for compliance assignment/tracking
		let employees: any[] = [];
		try {
			const employeesResult = await apiClient.employees.list({ limit: 100 });
			if (employeesResult.success && employeesResult.data) {
				employees = employeesResult.data.data || [];
			}
		} catch (error) {
			console.log('ℹ️ Could not load employees for compliance tracking');
		}

		// Transform documents to compliance items format
		const complianceItems = documentData.documents.map((doc: any) => ({
			id: doc.id,
			title: doc.title,
			type: doc.category || 'Document',
			status: getComplianceStatus(doc),
			employee: employees.find((emp) => emp.id === doc.employee_id),
			expiryDate: doc.expires_at || null,
			lastUpdated: doc.updated_at,
			category: doc.category,
			isActive: doc.is_active !== false,
			document: doc
		}));

		// Filter compliance items based on status
		let filteredItems = complianceItems;
		if (status !== 'all') {
			filteredItems = filteredItems.filter((item) => item.status === status);
		}

		// Calculate compliance stats
		const now = new Date();
		const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		const stats = {
			totalActive: complianceItems.filter((item) => item.isActive).length,
			expiringSoon: complianceItems.filter((item) => {
				if (!item.expiryDate) return false;
				const expiryDate = new Date(item.expiryDate);
				return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
			}).length,
			expired: complianceItems.filter((item) => {
				if (!item.expiryDate) return false;
				return new Date(item.expiryDate) < now;
			}).length,
			pending: complianceItems.filter((item) => item.status === 'pending').length
		};

		console.log('✅ Compliance page loaded with', filteredItems.length, 'compliance items');

		return {
			complianceItems: filteredItems,
			documents: documentData.documents,
			employees,
			activityLogs: activityData.activityLogs.slice(0, 10), // Recent activities
			stats,
			totalCount: documentData.totalCount,
			filters: {
				status,
				itemType
			}
		};
	} catch (error) {
		console.error('❌ Error loading compliance data:', error);

		// Return empty data with error state
		return {
			complianceItems: [],
			documents: [],
			employees: [],
			activityLogs: [],
			stats: {
				totalActive: 0,
				expiringSoon: 0,
				expired: 0,
				pending: 0
			},
			totalCount: 0,
			filters: {
				status: 'all',
				itemType: 'all'
			},
			error: 'Failed to load compliance data'
		};
	}
};

/**
 * Determine compliance status based on document properties
 */
function getComplianceStatus(document: any): 'active' | 'expired' | 'expiring_soon' | 'pending' {
	if (!document.is_active) {
		return 'pending';
	}

	if (document.expires_at) {
		const expiryDate = new Date(document.expires_at);
		const now = new Date();
		const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		if (expiryDate < now) {
			return 'expired';
		} else if (expiryDate <= thirtyDaysFromNow) {
			return 'expiring_soon';
		}
	}

	return 'active';
}
