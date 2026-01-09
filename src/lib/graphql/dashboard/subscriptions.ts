import { gql } from '@urql/core';

/**
 * Real-time dashboard updates subscription (if WebSocket support is added)
 */
export const DASHBOARD_UPDATES_SUBSCRIPTION = gql`
	subscription DashboardUpdates($userId: UUID!) {
		dashboardUpdates(userId: $userId) {
			type
			data
			timestamp
			priority
		}
	}
`;
