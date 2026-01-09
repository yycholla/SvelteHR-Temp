/**
 * Email Digest Commands
 *
 * Commands for managing automated email digest summaries.
 */

import { goto } from '$app/navigation';
import type { Command } from '../types';

export const digestCommands: Command[] = [
	// Navigation
	{
		id: 'digest-manage',
		label: 'Manage Email Digests',
		description: 'Configure automated email summary schedules',
		icon: '📬',
		category: 'Navigate',
		shortcut: 'Cmd+Shift+M',
		keywords: ['digest', 'email', 'summary', 'notifications', 'reports'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-create',
		label: 'Create Email Digest',
		description: 'Set up a new automated email digest',
		icon: '➕',
		category: 'Settings',
		keywords: ['create', 'new', 'digest', 'email', 'add'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
			// The create dialog will be triggered by the page
		}
	},
	{
		id: 'digest-daily',
		label: 'Daily Digest Summary',
		description: 'View or configure daily email digest',
		icon: '📅',
		category: 'Navigate',
		keywords: ['daily', 'digest', 'summary', 'everyday'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-weekly',
		label: 'Weekly Digest Summary',
		description: 'View or configure weekly email digest',
		icon: '📆',
		category: 'Navigate',
		keywords: ['weekly', 'digest', 'summary', 'monday'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-monthly',
		label: 'Monthly Digest Summary',
		description: 'View or configure monthly email digest',
		icon: '🗓️',
		category: 'Navigate',
		keywords: ['monthly', 'digest', 'summary'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},

	// Settings
	{
		id: 'digest-recipients',
		label: 'Manage Digest Recipients',
		description: 'Add or remove email recipients',
		icon: '👥',
		category: 'Settings',
		keywords: ['recipients', 'email', 'addresses', 'subscribers'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-schedule',
		label: 'Configure Digest Schedule',
		description: 'Set up automated sending schedule',
		icon: '⏰',
		category: 'Settings',
		keywords: ['schedule', 'cron', 'timing', 'when'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-content',
		label: 'Customize Digest Content',
		description: 'Choose what to include in digests',
		icon: '🎛️',
		category: 'Settings',
		keywords: ['content', 'customize', 'sections', 'include'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},

	// Utilities
	{
		id: 'digest-test-send',
		label: 'Send Test Digest',
		description: 'Send a digest email immediately for testing',
		icon: '🧪',
		category: 'Utilities',
		keywords: ['test', 'send', 'now', 'preview', 'trial'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
			// The send now functionality will be handled by the page
		}
	},
	{
		id: 'digest-view-logs',
		label: 'View Digest Delivery Logs',
		description: 'Check email delivery history and status',
		icon: '📋',
		category: 'Navigate',
		keywords: ['logs', 'history', 'delivery', 'sent', 'status'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-enable',
		label: 'Enable/Disable Digests',
		description: 'Turn automated digest emails on or off',
		icon: '🔔',
		category: 'Utilities',
		keywords: ['enable', 'disable', 'toggle', 'activate', 'deactivate'],
		permission: 'ManageIntegrations',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-sync-summary',
		label: 'Sync Summary Digest',
		description: 'Email digest of QuickBooks sync activity',
		icon: '🔄',
		category: 'Navigate',
		keywords: ['sync', 'summary', 'quickbooks', 'operations'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-conflicts',
		label: 'Conflict Alerts Digest',
		description: 'Email digest of data conflicts',
		icon: '⚠️',
		category: 'Navigate',
		keywords: ['conflicts', 'alerts', 'errors', 'issues'],
		permission: 'ResolveConflicts',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	},
	{
		id: 'digest-health',
		label: 'System Health Digest',
		description: 'Email digest of system health metrics',
		icon: '❤️',
		category: 'Navigate',
		keywords: ['health', 'metrics', 'performance', 'status'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/digests');
		}
	}
];
