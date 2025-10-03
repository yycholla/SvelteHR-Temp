// Profile settings page - server-side data loading
// Loads current user's profile, notification preferences, and theme settings

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	try {
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load user data with all profile fields
		const userQuery = `
			query GetUserSettings($userId: UUID!) {
				userById(id: $userId) {
					id
					firstName
					lastName
					displayName
					email
					phoneNumber
					mobileNumber
					addressLine1
					addressLine2
					city
					stateProvince
					postalCode
					country
					hireDate
					departmentId
					role
					isActive
					createdAt
					updatedAt
					departmentByDepartmentId {
						id
						name
					}
				}
			}
		`;

		const userResult = await graphqlClient.query(userQuery, { userId });
		const user = userResult.data?.userById;

		if (!user) {
			throw error(404, 'User profile not found');
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

		// Get theme preference from cookie or default to system
		const themeCookie = cookies.get('theme-preference') || 'system';

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
				email: user.email,
				phoneNumber: user.phoneNumber,
				mobileNumber: user.mobileNumber,
				addressLine1: user.addressLine1,
				addressLine2: user.addressLine2,
				city: user.city,
				stateProvince: user.stateProvince,
				postalCode: user.postalCode,
				country: user.country,
				hireDate: user.hireDate,
				department: user.departmentByDepartmentId,
				role: user.role,
				isActive: user.isActive,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			},
			notificationPreferences,
			themePreference: themeCookie
		};
	} catch (err) {
		console.error('[Settings Load Error]', err);
		throw error(500, 'Failed to load profile settings');
	}
};

export const actions: Actions = {
	// Update notification preferences
	updateNotifications: async ({ request, locals, cookies }) => {
		if (!locals.user?.id) {
			return fail(401, { error: 'Authentication required' });
		}

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
			console.log('[Notification Preferences Updated]', { userId: locals.user.id, preferences });

			return { success: true, message: 'Notification preferences updated successfully' };
		} catch (err) {
			console.error('[Update Notifications Error]', err);
			return fail(500, { error: 'Failed to update notification preferences' });
		}
	},

	// Update theme preference
	updateTheme: async ({ request, locals, cookies }) => {
		if (!locals.user?.id) {
			return fail(401, { error: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			const theme = formData.get('theme') as string;

			if (!['light', 'dark', 'system'].includes(theme)) {
				return fail(400, { error: 'Invalid theme selection' });
			}

			// Save theme preference to cookie
			cookies.set('theme-preference', theme, {
				path: '/',
				maxAge: 60 * 60 * 24 * 365, // 1 year
				httpOnly: false, // Allow client-side JavaScript to read
				sameSite: 'lax'
			});

			return { success: true, message: `Theme updated to ${theme}` };
		} catch (err) {
			console.error('[Update Theme Error]', err);
			return fail(500, { error: 'Failed to update theme preference' });
		}
	},

	// Request information changes (requires admin approval)
	requestInfoChange: async ({ request, locals, cookies }) => {
		if (!locals.user?.id) {
			return fail(401, { error: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			const reason = formData.get('reason') as string;

			if (!reason || reason.length < 10) {
				return fail(400, { error: 'Reason must be at least 10 characters' });
			}

			// Collect all changed fields
			const changes: Record<string, { current: string; new: string }> = {};
			const fields = [
				'firstName',
				'lastName',
				'displayName',
				'email',
				'phoneNumber',
				'mobileNumber',
				'addressLine1',
				'addressLine2',
				'city',
				'stateProvince',
				'postalCode',
				'country'
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
						activityLog {
							id
						}
					}
				}
			`;

			await graphqlClient.query(logMutation, {
				input: {
					activityLog: {
						employeeId: locals.user.id,
						userId: locals.user.id,
						action: 'request',
						resourceType: 'profile_change',
						resourceId: locals.user.id,
						details: {
							changes,
							reason,
							status: 'pending',
							requestedAt: new Date().toISOString()
						}
					}
				}
			});

			return {
				success: true,
				message: `Profile change request submitted with ${Object.keys(changes).length} field(s). An administrator will review your request.`
			};
		} catch (err) {
			console.error('[Request Info Change Error]', err);
			return fail(500, { error: 'Failed to submit change request' });
		}
	}
};
