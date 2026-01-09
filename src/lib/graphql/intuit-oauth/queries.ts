/**
 * GraphQL queries and mutations for Intuit QuickBooks OAuth
 */

export const GET_INTUIT_AUTH_URL = `
	query GetIntuitAuthUrl {
		intuit {
			authorizationUrl {
				url
				state
			}
		}
	}
`;

export const DISCONNECT_INTUIT = `
	mutation DisconnectIntuit {
		intuit {
			disconnect {
				success
				error
			}
		}
	}
`;
