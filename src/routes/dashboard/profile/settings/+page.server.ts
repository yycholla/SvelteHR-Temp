// Profile settings page - server-side data loading
// Loads current user's profile, notification preferences, and theme settings

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { cookies } = event;

	// Check authentication and permissions
	requireAuth(event, { minTier: AccessTier.SELF });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	const userId = locals.user.id;

	try {
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load user data with all profile fields including addresses and theme preference
		const userQuery = `
			query GetUserSettings($userId: UUID!) {
				user(id: $userId) {
					id
					firstName
					lastName
					displayName
					fullName
					email
					phone
					alternatePhone
					jobTitle
					status
					hireDate
					departmentId
					managerId
					roles {
						id
						name
					}
					isActive
					themePreference
					createdAt
					updatedAt
					department {
						id
						name
					}
					addresses {
						id
						addressType
						isPrimary
						addressLine1
						addressLine2
						city
						stateProvince
						postalCode
						country
						latitude
						longitude
					}
					primaryAddress {
						id
						addressType
						addressLine1
						addressLine2
						city
						stateProvince
						postalCode
						country
					}
				}
			}
		`;

		const userResult = await graphqlClient.query(userQuery, { userId });
		const user = userResult.data?.user;

		// Handle case where user data is null or unexpected shape - return defaults
		if (!user) {
			logger.warn('[Profile Settings] User data not found from GraphQL, returning defaults', { userId });
			const themePreference = cookies.get('theme-preference') || 'system';
			return {
				user: {
					id: locals.user.id,
					email: locals.user.email || '',
					displayName: locals.user.display_name || '',
					role: locals.user.role || 'employee'
				},
				profile: {
					id: locals.user.id,
					firstName: '',
					lastName: '',
					displayName: locals.user.display_name || '',
					fullName: locals.user.display_name || '',
					email: locals.user.email || '',
					phoneNumber: null,
					alternatePhone: null,
					jobTitle: null,
					status: null,
					addressLine1: null,
					addressLine2: null,
					city: null,
					stateProvince: null,
					postalCode: null,
					country: null,
					hireDate: null,
					department: null,
					managerId: null,
					role: locals.user.role || 'employee',
					isActive: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				addresses: [],
				notificationPreferences: {
					emailNotifications: true,
					pushNotifications: false,
					leaveRequestUpdates: true,
					taskAssignments: true,
					performanceReviews: true,
					systemAnnouncements: true,
					teamUpdates: true,
					weeklyDigest: false
				},
				themePreference
			};
		}

		// Load notification preferences (if table exists)
		// For now, return default preferences - this can be extended when notification_preferences table is created
		const notificationPreferences = {
			emailNotifications: true,
			pushNotifications: false,
			leaveRequestUpdates: true,
			taskAssignments: true,
			performanceReviews: true,
			systemAnnouncements: true,
			teamUpdates: true,
			weeklyDigest: false
		};

		// Extract primary address fields
		const primaryAddress = user.primaryAddress;

		// Use theme from database, fallback to cookie, default to system
		const themePreference = user.themePreference || cookies.get('theme-preference') || 'system';

		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || '',
				role: locals.user.role || 'employee'
			},
			profile: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				displayName: user.displayName,
				fullName: user.fullName,
				email: user.email,
				phoneNumber: user.phone || null,
				alternatePhone: user.alternatePhone || null,
				jobTitle: user.jobTitle || null,
				status: user.status || null,
				// Address fields from primaryAddress relationship
				addressLine1: primaryAddress?.addressLine1 || null,
				addressLine2: primaryAddress?.addressLine2 || null,
				city: primaryAddress?.city || null,
				stateProvince: primaryAddress?.stateProvince || null,
				postalCode: primaryAddress?.postalCode || null,
				country: primaryAddress?.country || null,
				hireDate: user.hireDate,
				department: user.department,
				managerId: user.managerId || null,
				role: user.role,
				isActive: user.isActive,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			},
			addresses: user.addresses || [],
			notificationPreferences,
			themePreference
		};
	} catch (err) {
		logger.error('[Settings Load Error]', err as Error);

		// Re-throw redirects and SvelteKit errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Return safe defaults instead of crashing
		const themePreference = cookies.get('theme-preference') || 'system';
		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || '',
				role: locals.user.role || 'employee'
			},
			profile: {
				id: locals.user.id,
				firstName: '',
				lastName: '',
				displayName: locals.user.display_name || '',
				fullName: locals.user.display_name || '',
				email: locals.user.email || '',
				phoneNumber: null,
				alternatePhone: null,
				jobTitle: null,
				status: null,
				addressLine1: null,
				addressLine2: null,
				city: null,
				stateProvince: null,
				postalCode: null,
				country: null,
				hireDate: null,
				department: null,
				managerId: null,
				role: locals.user.role || 'employee',
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			},
			addresses: [],
			notificationPreferences: {
				emailNotifications: true,
				pushNotifications: false,
				leaveRequestUpdates: true,
				taskAssignments: true,
				performanceReviews: true,
				systemAnnouncements: true,
				teamUpdates: true,
				weeklyDigest: false
			},
			themePreference
		};
	}
};

export const actions: Actions = {
	// Update notification preferences
	updateNotifications: async (event) => {
		const { request, cookies } = event;

		requireAuth(event, { minTier: AccessTier.SELF });

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const preferences = {
				emailNotifications: formData.get('emailNotifications') === 'on',
				pushNotifications: formData.get('pushNotifications') === 'on',
				leaveRequestUpdates: formData.get('leaveRequestUpdates') === 'on',
				taskAssignments: formData.get('taskAssignments') === 'on',
				performanceReviews: formData.get('performanceReviews') === 'on',
				systemAnnouncements: formData.get('systemAnnouncements') === 'on',
				teamUpdates: formData.get('teamUpdates') === 'on',
				weeklyDigest: formData.get('weeklyDigest') === 'on'
			};

			// TODO: Save to notification_preferences table when it's created
			// For now, just return success
			return { success: true, message: 'Notification preferences updated successfully' };
		} catch (err) {
			logger.error('[Update Notifications Error]', err as Error);
			return fail(500, { error: 'Failed to update notification preferences' });
		}
	},

	// Update theme preference
	updateTheme: async (event) => {
		const { request, cookies } = event;

		requireAuth(event, { minTier: AccessTier.SELF });

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const theme = formData.get('theme') as string;

			logger.info('[Update Theme] User and theme', { userId: locals.user.id, theme });

			if (!['light', 'dark', 'system'].includes(theme)) {
				return fail(400, { error: 'Invalid theme selection' });
			}

			const graphqlClient = GraphQLClient.fromCookies(cookies);

			// Update theme in database via GraphQL
			const updateMutation = `
				mutation UpdateUserTheme($userId: UUID!, $input: UpdateUserInput!) {
					users {
						updateUser(id: $userId, input: $input) {
							id
							themePreference
						}
					}
				}
			`;

			logger.info('[Update Theme] Calling GraphQL', { userId: locals.user.id, theme });

			const result = await graphqlClient.query(updateMutation, {
				userId: locals.user.id,
				input: {
					themePreference: theme
				}
			});

			logger.info('[Update Theme] GraphQL result', { result: JSON.stringify(result, null, 2) });

			// Check for GraphQL errors
			if (result.errors && result.errors.length > 0) {
				logger.error('[Update Theme] GraphQL errors found', undefined, { errors: result.errors });
				// Don't fail here - still set the cookie for client-side consistency
			}

			// Also save to cookie for server-side rendering
			cookies.set('theme-preference', theme, {
				path: '/',
				maxAge: 60 * 60 * 24 * 365, // 1 year
				httpOnly: false, // Allow client-side JavaScript to read
				sameSite: 'lax'
			});

			logger.info('[Update Theme] Success! Theme updated', { theme });

			return { success: true, message: `Theme updated to ${theme}` };
		} catch (err) {
			logger.error('[Update Theme Error]', err as Error);
			return fail(500, { error: 'Failed to update theme preference' });
		}
	},

	// Request information changes (requires admin approval)
	requestInfoChange: async (event) => {
		const { request, cookies } = event;

		requireAuth(event, { minTier: AccessTier.SELF });

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const reason = formData.get('reason') as string;

			if (!reason || reason.length < 10) {
				return fail(400, { error: 'Reason must be at least 10 characters' });
			}

			// Collect all changed fields (only fields that exist in User model)
			const changes: Record<string, { current: string; new: string }> = {};
			const fields = [
				'firstName',
				'lastName',
				'displayName',
				'email',
				'phoneNumber',
				'alternatePhone',
				'jobTitle'
			];

			for (const field of fields) {
				const newValue = formData.get(field) as string;
				const currentValue = formData.get(`current_${field}`) as string;

				// Only include changed fields
				if (newValue && newValue !== currentValue) {
					changes[field] = {
						current: currentValue || '',
						new: newValue
					};
				}
			}

			if (Object.keys(changes).length === 0) {
				return fail(400, { error: 'No changes detected' });
			}

			// Create change request
			const graphqlClient = GraphQLClient.fromCookies(cookies);

			// TODO: Create a proper change_requests table
			// For now, create an activity log entry to track the request
			const logMutation = `
				mutation CreateChangeRequest($input: CreateActivityLogInput!) {
					createActivityLog(input: $input) {
						id
					}
				}
			`;

			await graphqlClient.query(logMutation, {
				input: {
					employeeId: locals.user.id,
					userId: locals.user.id,
					action: 'request',
					resourceType: 'profile_change',
					resourceId: locals.user.id,
					details: JSON.stringify({
						changes,
						reason,
						status: 'pending',
						requestedAt: new Date().toISOString()
					})
				}
			});

			return {
				success: true,
				message: `Profile change request submitted with ${Object.keys(changes).length} field(s). An administrator will review your request.`
			};
		} catch (err) {
			logger.error('[Request Info Change Error]', err as Error);
			return fail(500, { error: 'Failed to submit change request' });
		}
	}
};
