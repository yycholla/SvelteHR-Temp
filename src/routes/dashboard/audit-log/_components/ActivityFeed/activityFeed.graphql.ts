import { gql } from '@urql/core';

export const GET_AUDIT_LOGS = gql`
	query GetAuditLogs($limit: Int!, $offset: Int!, $filters: AuditLogFilters) {
		auditLogs(limit: $limit, offset: $offset, filters: $filters) {
			id
			action
			resourceType
			resourceId
			changes
			performedBy
			timestamp
			rollbackStatus
			beforeSnapshot
			afterSnapshot
			employeeId
			employeeName
			isRollback
			rolledBackLogId
			createdAt
			reason
		}
	}
`;

export const GET_INITIAL_AUDIT_LOGS = gql`
	query GetInitialAuditLogs($limit: Int!) {
		auditLogs(limit: $limit, offset: 0) {
			id
			action
			resourceType
			resourceId
			changes
			performedBy
			timestamp
			rollbackStatus
			beforeSnapshot
			afterSnapshot
			employeeId
			employeeName
			isRollback
			rolledBackLogId
			createdAt
			reason
		}
	}
`;
