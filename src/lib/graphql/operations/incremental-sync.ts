import { gql } from '@urql/svelte';

export const GET_INCREMENTAL_SYNC_SETTINGS = gql`
	query GetIncrementalSyncSettings {
		incremental_sync {
			get_incremental_sync_settings {
				enabled
				lastFullSyncAt
				employeeSyncToken
				departmentSyncToken
				description
			}
		}
	}
`;

export const ENABLE_INCREMENTAL_SYNC = gql`
	mutation EnableIncrementalSync {
		incremental_sync {
			enable_incremental_sync {
				success
				message
			}
		}
	}
`;

export const DISABLE_INCREMENTAL_SYNC = gql`
	mutation DisableIncrementalSync {
		incremental_sync {
			disable_incremental_sync {
				success
				message
			}
		}
	}
`;

export const CLEAR_SYNC_TOKENS = gql`
	mutation ClearSyncTokens($entityType: String) {
		incremental_sync {
			clear_sync_tokens(entity_type: $entityType) {
				success
				message
			}
		}
	}
`;

export const FORCE_FULL_SYNC_ONCE = gql`
	mutation ForceFullSyncOnce($entityType: String!) {
		incremental_sync {
			force_full_sync_once(entity_type: $entityType) {
				success
				message
			}
		}
	}
`;
