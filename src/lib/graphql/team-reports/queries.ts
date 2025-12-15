import { gql } from '@urql/svelte';

// Query: Get all team reports with filtering
export const GET_TEAM_REPORTS = gql`
	query GetTeamReports(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: TeamReportFilter
	) {
		teamReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				summary
				isScheduled
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
					email
				}
				parameters
				data
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

// Query: Get single report with full details
export const GET_TEAM_REPORT = gql`
	query GetTeamReport($id: UUID!) {
		teamReport(id: $id) {
			id
			title
			reportType
			status
			dateFrom
			dateTo
			summary
			isScheduled
			scheduleCron
			team: department {
				id
				name
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
			}
			generatedBy {
				id
				displayName
				email
				jobTitle
			}
			parameters
			data
			createdAt
			updatedAt
		}
	}
`;

// Query: Get reports by team
export const GET_REPORTS_BY_TEAM = gql`
  query GetReportsByTeam(
    $teamId: UUID!
    $reportType: ReportType
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      condition: { teamId: $teamId }
      filter: { reportType: $reportType ? { equalTo: $reportType } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
`;

// Query: Get scheduled reports
export const GET_SCHEDULED_REPORTS = gql`
	query GetScheduledReports($first: Int = 50, $orderBy: [TeamReportsOrderBy!] = [UPDATED_AT_DESC]) {
		teamReports(condition: { isScheduled: true }, first: $first, orderBy: $orderBy) {
			nodes {
				id
				title
				reportType
				status
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
				updatedAt
			}
			totalCount
		}
	}
`;

// Query: Get report analytics dashboard
export const GET_REPORTS_DASHBOARD = gql`
  query GetReportsDashboard(
    $teamId: UUID
    $dateFrom: Date
    $dateTo: Date
  ) {
    teamReports(
      filter: {
        teamId: $teamId ? { equalTo: $teamId } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
        status: { equalTo: "completed" }
      }
    ) {
      nodes {
        id
        title
        reportType
        dateFrom
        dateTo
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        data
        createdAt
      }
      totalCount
    }
  }
`;

// Query: Get available report types
export const GET_AVAILABLE_REPORTS = gql`
	query GetAvailableReports {
		availableReports {
			reportType
			name
			description
			category
		}
	}
`;

// Query: Search reports with advanced filtering
export const SEARCH_REPORTS = gql`
  query SearchReports(
    $searchTerm: String
    $reportType: ReportType
    $teamId: UUID
    $generatedBy: UUID
    $isScheduled: Boolean
    $status: ReportStatus
    $dateFrom: Date
    $dateTo: Date
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      filter: {
        title: $searchTerm ? { includesInsensitive: $searchTerm } : null
        reportType: $reportType ? { equalTo: $reportType } : null
        teamId: $teamId ? { equalTo: $teamId } : null
        generatedBy: $generatedBy ? { equalTo: $generatedBy } : null
        isScheduled: $isScheduled != null ? { equalTo: $isScheduled } : null
        status: $status ? { equalTo: $status } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
      }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
`;
