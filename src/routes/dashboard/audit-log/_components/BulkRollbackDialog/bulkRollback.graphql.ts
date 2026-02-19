import { gql } from '@urql/core';

export const CREATE_BULK_ROLLBACK = gql`
	mutation CreateBulkRollback($logIds: [ID!]!) {
		createBulkRollback(logIds: $logIds) {
			success
			batchId
		}
	}
`;

export interface BulkRollbackResponse {
	createBulkRollback: {
		success: boolean;
		batchId: string;
	};
}
