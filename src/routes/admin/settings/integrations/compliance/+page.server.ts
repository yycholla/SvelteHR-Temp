import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const COMPLIANCE_QUERY = `
	query GetComplianceReports($reportType: ComplianceReportType, $limit: Int, $reportId: String) {
		compliance {
			complianceReports(reportType: $reportType, limit: $limit) {
				id
				reportType
				periodStart
				periodEnd
				generatedAt
				generatedBy
				reportData
				pdfPath
				csvPath
				status
				findings
				errorMessage
				createdAt
				updatedAt
			}
			reportSchedules {
				id
				reportType
				scheduleCron
				recipients
				enabled
				lastRunAt
				nextRunAt
				createdBy
				createdAt
				updatedAt
			}
		}
	}
`;

const REPORT_DETAIL_QUERY = `
	query GetReportDetail($reportId: String!) {
		compliance {
			complianceReport(reportId: $reportId) {
				id
				reportType
				periodStart
				periodEnd
				generatedAt
				generatedBy
				reportData
				pdfPath
				csvPath
				status
				findings
				errorMessage
				createdAt
				updatedAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:compliance');

	const reportId = url.searchParams.get('reportId');
	const reportType = url.searchParams.get('reportType');
	const limit = parseInt(url.searchParams.get('limit') || '20');

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// If viewing a specific report
		if (reportId) {
			const detailResult = await client.query(REPORT_DETAIL_QUERY, { reportId }).toPromise();

			if (detailResult.error) {
				console.error('Failed to fetch report details:', detailResult.error);
				return {
					reports: [],
					schedules: [],
					selectedReport: null,
					error: 'Failed to load report details'
				};
			}

			return {
				reports: [],
				schedules: [],
				selectedReport: detailResult.data?.compliance?.complianceReport || null
			};
		}

		// Otherwise fetch overview
		const result = await client
			.query(COMPLIANCE_QUERY, {
				reportType: reportType || null,
				limit
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch compliance data:', result.error);
			return {
				reports: [],
				schedules: [],
				selectedReport: null,
				error: 'Failed to load compliance data'
			};
		}

		const compliance = result.data?.compliance;

		return {
			reports: compliance?.complianceReports || [],
			schedules: compliance?.reportSchedules || [],
			selectedReport: null,
			filters: { reportType, limit }
		};
	} catch (error) {
		console.error('Error loading compliance data:', error);
		return {
			reports: [],
			schedules: [],
			selectedReport: null,
			error: 'Failed to load compliance data'
		};
	}
};
