/**
 * Sync Health Monitoring GraphQL Operations
 *
 * Provides health monitoring for QuickBooks sync operations.
 */

import { gql } from '@urql/svelte';

// ============================================================================
// Types
// ============================================================================

export interface SyncHealthStatus {
	uptimePercentage: number;
	avgSyncDurationMs: number;
	totalSyncs24H: number;
	successRate: number;
	errorRate: number;
	lastSuccessfulSync: string | null;
	currentStatus: string;
	activeAlertsCount: number;
}

export interface SyncHealthMetric {
	id: string;
	recordedAt: string;
	syncDurationMs: number | null;
	recordsProcessed: number | null;
	errorsCount: number;
	connectionStatus: string;
	entityType: string | null;
	syncDirection: string | null;
}

export interface SyncHealthAlert {
	id: string;
	alertType: string;
	severity: string;
	message: string;
	triggeredAt: string;
	resolvedAt: string | null;
	entityType: string | null;
	isResolved: boolean;
}

// ============================================================================
// Queries
// ============================================================================

export const SYNC_HEALTH_STATUS_QUERY = gql`
	query SyncHealthStatus {
		syncHealth {
			syncHealthStatus {
				uptimePercentage
				avgSyncDurationMs
				totalSyncs24H
				successRate
				errorRate
				lastSuccessfulSync
				currentStatus
				activeAlertsCount
			}
		}
	}
`;

export const SYNC_HEALTH_METRICS_QUERY = gql`
	query SyncHealthMetrics($timeframe: Int) {
		syncHealth {
			syncHealthMetrics(timeframe: $timeframe) {
				id
				recordedAt
				syncDurationMs
				recordsProcessed
				errorsCount
				connectionStatus
				entityType
				syncDirection
			}
		}
	}
`;

export const SYNC_HEALTH_ALERTS_QUERY = gql`
	query SyncHealthAlerts($status: String, $limit: Int) {
		syncHealth {
			syncHealthAlerts(status: $status, limit: $limit) {
				id
				alertType
				severity
				message
				triggeredAt
				resolvedAt
				entityType
				isResolved
			}
		}
	}
`;

// ============================================================================
// Mutations
// ============================================================================

export const RESOLVE_HEALTH_ALERT_MUTATION = gql`
	mutation ResolveHealthAlert($alertId: String!) {
		syncHealth {
			resolveHealthAlert(alertId: $alertId) {
				success
				message
				alertId
			}
		}
	}
`;

export const TEST_HEALTH_CHECK_MUTATION = gql`
	mutation TestHealthCheck {
		syncHealth {
			testHealthCheck {
				success
				currentStatus
				alertsTriggered
				uptimePercentage
				errorRate
			}
		}
	}
`;

// ============================================================================
// Response Types
// ============================================================================

export interface ResolveAlertResponse {
	success: boolean;
	message: string;
	alertId: string;
}

export interface HealthCheckResponse {
	success: boolean;
	currentStatus: string;
	alertsTriggered: number;
	uptimePercentage: number;
	errorRate: number;
}

export interface SyncHealthStatusQueryData {
	syncHealth: {
		syncHealthStatus: SyncHealthStatus;
	};
}

export interface SyncHealthMetricsQueryData {
	syncHealth: {
		syncHealthMetrics: SyncHealthMetric[];
	};
}

export interface SyncHealthAlertsQueryData {
	syncHealth: {
		syncHealthAlerts: SyncHealthAlert[];
	};
}

export interface ResolveHealthAlertMutationData {
	syncHealth: {
		resolveHealthAlert: ResolveAlertResponse;
	};
}

export interface TestHealthCheckMutationData {
	syncHealth: {
		testHealthCheck: HealthCheckResponse;
	};
}
