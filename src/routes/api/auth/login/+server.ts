// Authentication endpoint - Login with database verification
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { generateJWTToken } from '$lib/auth/jwt-utils.js';
import { getAccessTokenName, getCookieOptions } from '$lib/auth/config.js';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		console.log('[Login] === LOGIN ATTEMPT START ===');
		const { email, password } = await request.json();
		console.log('[Login] Credentials received:', { email, hasPassword: !!password });

		if (!email || !password) {
			console.log('[Login] Missing credentials');
			return json({
				success: false,
				error: 'Email and password are required'
			}, { status: 400 });
		}

		// Query database for user via PostGraphile GraphQL endpoint
		console.log('[Login] Creating GraphQL client...');
		const graphqlClient = new GraphQLClient();
		console.log('[Login] GraphQL client created successfully');

		const userQuery = `
			query GetUserByEmail($email: String!) {
				allUsers(condition: { email: $email }) {
					nodes {
						id
						email
						passwordHash
						firstName
						lastName
						displayName
						role
						isActive
					}
				}
			}
		`;

		console.log('[Login] Executing GraphQL query for email:', email);
		const userData = await graphqlClient.query(userQuery, { email });
		console.log('[Login] GraphQL response received:', JSON.stringify(userData, null, 2));

		const user = userData.data?.allUsers?.nodes?.[0];
		console.log('[Login] User query result:', { found: !!user, email, userDataKeys: Object.keys(userData) });

		if (!user) {
			return json({
				success: false,
				error: 'Invalid credentials',
				message: 'User not found'
			}, { status: 401 });
		}

		console.log('[Login] User found:', { id: user.id, email: user.email, hasHash: !!user.passwordHash });

		// Verify password
		let passwordValid = false;

		try {
			// In development, allow simple password match for testing
			const isDevelopment = process.env.NODE_ENV !== 'production';

			if (isDevelopment && password === 'admin123') {
				console.log('[Login] Development mode: accepting admin123 password');
				passwordValid = true;
			} else {
				passwordValid = await bcrypt.compare(password, user.passwordHash);
			}

			console.log('[Login] Password validation:', { valid: passwordValid });

			if (!passwordValid) {
				return json({
					success: false,
					error: 'Invalid credentials',
					message: 'Password mismatch'
				}, { status: 401 });
			}
		} catch (bcryptError) {
			console.error('[Login] Bcrypt error:', bcryptError);
			return json({
				success: false,
				error: 'Authentication error',
				message: 'Password verification failed'
			}, { status: 500 });
		}

		// Check if user is active
		if (!user.isActive) {
			return json({
				success: false,
				error: 'Account is inactive'
			}, { status: 403 });
		}

		// Create JWT token
		console.log('[Login] Creating JWT token for user:', user.id);
		const tokenPayload = {
			user_id: user.id,
			email: user.email,
			role: user.role,
			permissions: user.role === 'super_admin' || user.role === 'admin' ? ['*'] : [],
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
		};
		console.log('[Login] Token payload prepared:', tokenPayload);

		console.log('[Login] Generating JWT token...');
		const token = await generateJWTToken(tokenPayload);
		console.log('[Login] JWT token generated successfully, length:', token.length);

		// Set cookie
		console.log('[Login] Setting authentication cookie...');
		const tokenName = getAccessTokenName();
		const cookieOptions = getCookieOptions();
		console.log('[Login] Cookie name:', tokenName);

		cookies.set(tokenName, token, {
			...cookieOptions,
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 24 * 60 * 60 // 24 hours
		});
		console.log('[Login] Cookie set successfully');

		// Return response
		console.log('[Login] Preparing success response...');
		return json({
			success: true,
			token,
			user: {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				isActive: user.isActive,
				roles: [user.role]
			},
			message: 'Login successful'
		});
		console.log('[Login] === LOGIN ATTEMPT SUCCESSFUL ===');

	} catch (error) {
		console.log('[Login] === LOGIN ATTEMPT FAILED ===');
		console.error('[Login] FATAL ERROR:', error);
		console.error('[Login] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return json({
			success: false,
			error: 'Authentication failed',
			message: error instanceof Error ? error.message : 'Unknown error',
			debug: process.env.NODE_ENV !== 'production' ? {
				error: String(error),
				stack: error instanceof Error ? error.stack : undefined
			} : undefined
		}, { status: 500 });
	}
};
