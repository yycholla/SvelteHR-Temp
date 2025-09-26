// Test endpoint to generate and set a fresh JWT token with proper UUID
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createMockJWTPayload, generateJWTToken } from '$lib/auth/jwt-utils.js';
import { getAccessTokenName, getCookieOptions } from '$lib/auth/config.js';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Generate a mock JWT payload with the corrected UUID and role
		const mockPayload = createMockJWTPayload();
		console.log('🔧 Generated mock JWT payload:', mockPayload);

		// Generate the actual JWT token
		const token = await generateJWTToken(mockPayload);
		console.log('✅ Generated JWT token:', token.substring(0, 100) + '...');

		// Set the cookie with the new token
		const tokenName = getAccessTokenName();
		const cookieOptions = getCookieOptions();

		cookies.set(tokenName, token, {
			...cookieOptions,
			path: '/',
			httpOnly: true,
			secure: false, // Set to false for localhost development
			sameSite: 'lax'
		});

		console.log(`🍪 Set JWT token in cookie: ${tokenName}`);

		return json({
			success: true,
			message: 'JWT token generated and set successfully',
			payload: {
				user_id: mockPayload.user_id,
				email: mockPayload.email,
				role: mockPayload.role
			}
		});

	} catch (error) {
		console.error('❌ Error generating JWT token:', error);
		return json({
			success: false,
			error: 'Failed to generate JWT token',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};