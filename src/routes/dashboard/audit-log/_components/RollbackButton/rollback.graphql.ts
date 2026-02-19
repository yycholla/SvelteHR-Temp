import { gql } from '@urql/core';

export const ROLLBACK_AUDIT_LOG = gql`
	mutation RollbackAuditLog($logId: ID!, $reason: String!) {
		rollbackAuditLog(logId: $logId, reason: $reason) {
			success
			conflicts {
				hasConflicts
				conflictFields
				currentState
				targetState
			}
		}
	}
`;

export interface RollbackResponse {
	rollbackAuditLog: {
		success: boolean;
		conflicts: {
			hasConflicts: boolean;
			conflictFields: string[];
			currentState: Record<string, unknown>;
			targetState: Record<string, unknown>;
		};
	};
}
