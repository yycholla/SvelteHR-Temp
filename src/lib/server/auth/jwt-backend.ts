import { getGraphQLEndpoint } from '$lib/server/api-url';

interface GraphQLResponse<TData> {
	data?: TData;
	errors?: Array<{ message?: string }>;
}

interface AuthUserPayload {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
	permissions: string[];
	isActive: boolean;
	forcePasswordChange: boolean;
}

interface TokenPayload {
	accessToken: string;
	refreshToken: string;
	refreshTokenPlaintext: string;
	expiresIn: number;
}

interface AuthSuccessPayload {
	__typename: 'AuthSuccess';
	user: AuthUserPayload;
	tokens: TokenPayload;
}

interface AuthErrorPayload {
	__typename: 'AuthError';
	code: string;
	message: string;
}

type AuthResultPayload = AuthSuccessPayload | AuthErrorPayload;

interface LoginResponseData {
	login: AuthResultPayload;
}

interface RefreshResponseData {
	refreshToken: AuthResultPayload;
}

interface LogoutResponseData {
	logout: {
		success: boolean;
		message: string;
	};
}

interface MeResponseData {
	me: {
		id: string;
		email: string;
		displayName?: string | null;
		firstName?: string | null;
		lastName?: string | null;
	} | null;
}

const LOGIN_MUTATION = `
	mutation Login($email: String!, $password: String!, $deviceInfo: String, $ipAddress: String) {
		login(input: { email: $email, password: $password, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			__typename
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					refreshToken
					refreshTokenPlaintext
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const REFRESH_MUTATION = `
	mutation RefreshToken($refreshToken: String!, $refreshTokenPlaintext: String!, $deviceInfo: String, $ipAddress: String) {
		refreshToken(input: { refreshToken: $refreshToken, refreshTokenPlaintext: $refreshTokenPlaintext, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			__typename
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					refreshToken
					refreshTokenPlaintext
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const LOGOUT_MUTATION = `
	mutation Logout {
		logout {
			success
			message
		}
	}
`;

const ME_QUERY = `
	query CurrentUser {
		me {
			id
			email
			displayName
			firstName
			lastName
		}
	}
`;

async function postGraphQL<TData>(
	query: string,
	variables: Record<string, unknown>,
	authorization?: string
): Promise<GraphQLResponse<TData>> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (authorization) {
		headers.Authorization = authorization;
	}

	const response = await fetch(getGraphQLEndpoint(), {
		method: 'POST',
		headers,
		body: JSON.stringify({ query, variables })
	});

	const payload = (await response.json()) as GraphQLResponse<TData>;
	return payload;
}

function isAuthSuccess(result: AuthResultPayload | undefined): result is AuthSuccessPayload {
	return result?.__typename === 'AuthSuccess';
}

function mapUser(user: AuthUserPayload) {
	return {
		id: user.id,
		email: user.email,
		displayName: user.displayName,
		roles: user.roles,
		permissions: user.permissions,
		isActive: user.isActive,
		forcePasswordChange: user.forcePasswordChange
	};
}

export async function loginWithBackend(input: {
	email: string;
	password: string;
	deviceInfo?: string;
	ipAddress?: string;
}): Promise<
	| {
			success: true;
			user: ReturnType<typeof mapUser>;
			tokens: TokenPayload;
	  }
	| {
			success: false;
			message: string;
	  }
> {
	const payload = await postGraphQL<LoginResponseData>(LOGIN_MUTATION, {
		email: input.email,
		password: input.password,
		deviceInfo: input.deviceInfo ?? null,
		ipAddress: input.ipAddress ?? null
	});

	const result = payload.data?.login;
	if (!isAuthSuccess(result)) {
		const message =
			result?.__typename === 'AuthError'
				? result.message
				: payload.errors?.[0]?.message || 'Login failed';
		return { success: false, message };
	}

	return {
		success: true,
		user: mapUser(result.user),
		tokens: result.tokens
	};
}

export async function refreshWithBackend(input: {
	refreshToken: string;
	refreshTokenPlaintext: string;
	deviceInfo?: string;
	ipAddress?: string;
}): Promise<
	| {
			success: true;
			user: ReturnType<typeof mapUser>;
			tokens: TokenPayload;
	  }
	| {
			success: false;
			message: string;
	  }
> {
	const payload = await postGraphQL<RefreshResponseData>(REFRESH_MUTATION, {
		refreshToken: input.refreshToken,
		refreshTokenPlaintext: input.refreshTokenPlaintext,
		deviceInfo: input.deviceInfo ?? null,
		ipAddress: input.ipAddress ?? null
	});

	const result = payload.data?.refreshToken;
	if (!isAuthSuccess(result)) {
		const message =
			result?.__typename === 'AuthError'
				? result.message
				: payload.errors?.[0]?.message || 'Token refresh failed';
		return { success: false, message };
	}

	return {
		success: true,
		user: mapUser(result.user),
		tokens: result.tokens
	};
}

export async function logoutWithBackend(accessToken?: string): Promise<void> {
	const authorization = accessToken ? `Bearer ${accessToken}` : undefined;
	await postGraphQL<LogoutResponseData>(LOGOUT_MUTATION, {}, authorization);
}

export async function verifyAccessTokenWithBackend(accessToken: string): Promise<{
	valid: boolean;
	user?: {
		id: string;
		email: string;
		displayName: string;
	};
}> {
	const payload = await postGraphQL<MeResponseData>(ME_QUERY, {}, `Bearer ${accessToken}`);

	if (payload.errors?.length || !payload.data?.me) {
		return { valid: false };
	}

	return {
		valid: true,
		user: {
			id: payload.data.me.id,
			email: payload.data.me.email,
			displayName:
				payload.data.me.displayName ||
				[payload.data.me.firstName, payload.data.me.lastName].filter(Boolean).join(' ') ||
				payload.data.me.email.split('@')[0]
		}
	};
}
