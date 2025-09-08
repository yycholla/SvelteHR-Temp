import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';

/**
 * Magic Link Send API Endpoint
 * 
 * Generates a secure magic link token and sends it via email.
 * This endpoint interfaces with the MountainHR backend for user validation
 * and token storage, then sends the magic link email.
 */
export const POST: RequestHandler = async ({ request, fetch, url }) => {
	try {
		const { email, redirectTo } = await request.json();

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email || !emailRegex.test(email)) {
			return error(400, {
				message: 'Valid email address is required',
				code: 'INVALID_EMAIL'
			});
		}

		// Generate secure magic link token
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
		
		// Create magic link URL
		const magicLinkUrl = new URL('/auth/magic-link/verify', url.origin);
		magicLinkUrl.searchParams.set('token', token);
		if (redirectTo) {
			magicLinkUrl.searchParams.set('redirectTo', redirectTo);
		}

		// Store magic link token in backend
		// For now, we'll simulate this - in production, this would call the Go backend
		const tokenData = {
			token: token,
			email: email,
			expiresAt: expiresAt.toISOString(),
			used: false,
			createdAt: new Date().toISOString()
		};

		console.log('Magic Link Generated:', {
			email,
			token: token.substring(0, 8) + '...',
			expiresAt: expiresAt.toISOString(),
			magicLinkUrl: magicLinkUrl.toString()
		});

		// TODO: Send email via backend service
		// This would integrate with your email service (SendGrid, AWS SES, etc.)
		
		// For development, log the magic link
		console.log(`\n🔗 MAGIC LINK FOR ${email}:`);
		console.log(`${magicLinkUrl.toString()}\n`);
		console.log('📧 In production, this would be sent via email\n');

		// Simulate email sending success
		return json({
			success: true,
			message: 'Magic link sent successfully',
			email: email,
			// For development only - remove in production
			...(process.env.NODE_ENV === 'development' && {
				dev_magic_link: magicLinkUrl.toString()
			})
		});

	} catch (err) {
		console.error('Magic link send error:', err);
		
		return error(500, {
			message: 'Failed to send magic link',
			code: 'MAGIC_LINK_SEND_FAILED'
		});
	}
};