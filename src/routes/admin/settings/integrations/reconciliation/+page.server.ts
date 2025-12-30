import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const RECONCILIATION_QUERY = `
	query GetReconciliationData($reportId: String) {
		intuit {
			reconciliation {
				reconciliationReports(entityType: ALL, limit: 20) {
					id
					entityType
					status
					totalLocal
					totalRemote
					totalMatched
					totalDiscrepancies
					missingInLocal
					missingInRemote
					dataMismatches
					triggeredBy
					triggeredByEmail
					durationMs
					errorMessage
					startedAt
					completedAt
					createdAt
				}
			}
		}
	}
`;

const REPORT_DETAILS_QUERY = `
	query GetReportDetails($reportId: String!) {
		intuit {
			reconciliation {
				reconciliationReport(reportId: $reportId) {
					id
					entityType
					status
					totalLocal
					totalRemote
					totalMatched
					totalDiscrepancies
					missingInLocal
					missingInRemote
					dataMismatches
					triggeredBy
					triggeredByEmail
					durationMs
					errorMessage
					summary
					startedAt
					completedAt
					createdAt
				}
				reportDiscrepancies(reportId: $reportId, unresolvedOnly: false) {
					id
					reportId
					entityType
					entityId
					discrepancyType
					severity
					fieldName
					localValue
					remoteValue
					description
					suggestedAction
					isResolved
					resolvedAt
					resolvedBy
					resolutionNotes
					createdAt
				}
				discrepancyStats(reportId: $reportId) {
					total
					resolved
					unresolved
					byType {
						typeName
						count
					}
					bySeverity {
						severity
						count
					}
				}
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:reconciliation');

	const reportId = url.searchParams.get('reportId');
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		// If a specific report is selected, fetch its details
		if (reportId) {
			const detailsResult = await client
				.query(REPORT_DETAILS_QUERY, { reportId })
				.toPromise();

			if (detailsResult.error) {
				console.error('Failed to fetch report details:', detailsResult.error);
				return {
					reports: [],
					selectedReport: null,
					discrepancies: [],
					stats: null,
					error: 'Failed to load report details'
				};
			}

			const reconciliation = detailsResult.data?.intuit?.reconciliation;

			return {
				reports: [],
				selectedReport: reconciliation?.reconciliationReport || null,
				discrepancies: reconciliation?.reportDiscrepancies || [],
				stats: reconciliation?.discrepancyStats || null
			};
		}

		// Otherwise, fetch the list of recent reports
		const result = await client.query(RECONCILIATION_QUERY, {}).toPromise();

		if (result.error) {
			console.error('Failed to fetch reconciliation reports:', result.error);
			return {
				reports: [],
				selectedReport: null,
				discrepancies: [],
				stats: null,
				error: 'Failed to load reconciliation data'
			};
		}

		return {
			reports: result.data?.intuit?.reconciliation?.reconciliationReports || [],
			selectedReport: null,
			discrepancies: [],
			stats: null
		};
	} catch (error) {
		console.error('Error loading reconciliation data:', error);
		return {
			reports: [],
			selectedReport: null,
			discrepancies: [],
			stats: null,
			error: 'Failed to load reconciliation data'
		};
	}
};
