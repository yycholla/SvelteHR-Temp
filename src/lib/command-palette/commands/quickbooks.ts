/**
 * QuickBooks Integration Commands
 *
 * Commands for QuickBooks sync operations and integrations.
 */

import { goto } from '$app/navigation';
import type { Command } from '../types';

export const quickbooksCommands: Command[] = [
	// Sync Operations
	{
		id: 'qb-sync-employees',
		label: 'Sync Employees with QuickBooks',
		description: 'Synchronize all employee data with QuickBooks',
		icon: '👥',
		category: 'Sync',
		shortcut: 'Cmd+Shift+E',
		keywords: ['sync', 'employee', 'quickbooks', 'workforce'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations');
			// Trigger sync action will be handled by the page
		}
	},
	{
		id: 'qb-sync-departments',
		label: 'Sync Departments',
		description: 'Synchronize department data',
		icon: '🏢',
		category: 'Sync',
		shortcut: 'Cmd+Shift+D',
		keywords: ['sync', 'department', 'org'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations');
		}
	},
	{
		id: 'qb-sync-bidirectional',
		label: 'Bidirectional Sync',
		description: 'Sync data both ways (QuickBooks ↔ SvelteHR)',
		icon: '🔄',
		category: 'Sync',
		keywords: ['sync', 'bidirectional', 'two-way'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations');
		}
	},
	{
		id: 'qb-preview-sync',
		label: 'Preview Sync Changes',
		description: 'See what will change before syncing',
		icon: '🔍',
		category: 'Sync',
		keywords: ['preview', 'dry run', 'test'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations/preview');
		}
	},
	{
		id: 'qb-force-full-sync',
		label: 'Force Full Sync',
		description: 'Complete refresh of all data',
		icon: '⚡',
		category: 'Sync',
		keywords: ['full', 'refresh', 'complete'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations');
		}
	},
	{
		id: 'qb-incremental-sync',
		label: 'Incremental Sync',
		description: 'Sync only changed data since last sync',
		icon: '📊',
		category: 'Sync',
		keywords: ['incremental', 'delta', 'changes'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations/incremental');
		}
	},

	// Navigation
	{
		id: 'qb-goto-conflicts',
		label: 'View Sync Conflicts',
		description: 'Resolve data conflicts',
		icon: '⚠️',
		category: 'Navigate',
		keywords: ['conflicts', 'errors', 'issues'],
		permission: 'ResolveConflicts',
		action: async () => {
			await goto('/admin/settings/integrations/conflicts');
		}
	},
	{
		id: 'qb-goto-health',
		label: 'Sync Health Dashboard',
		description: 'Monitor sync health and performance',
		icon: '❤️',
		category: 'Navigate',
		keywords: ['health', 'status', 'monitoring'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/health');
		}
	},
	{
		id: 'qb-goto-audit',
		label: 'View Audit Trail',
		description: 'Complete audit log of all sync operations',
		icon: '📋',
		category: 'Navigate',
		keywords: ['audit', 'log', 'history', 'compliance'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/audit');
		}
	},
	{
		id: 'qb-goto-reconciliation',
		label: 'Data Reconciliation',
		description: 'Find and fix data discrepancies',
		icon: '🔧',
		category: 'Navigate',
		keywords: ['reconciliation', 'discrepancies', 'fix'],
		permission: 'ResolveConflicts',
		action: async () => {
			await goto('/admin/settings/integrations/reconciliation');
		}
	},
	{
		id: 'qb-goto-webhooks',
		label: 'Manage Webhooks',
		description: 'Configure real-time event subscriptions',
		icon: '🔔',
		category: 'Navigate',
		keywords: ['webhooks', 'events', 'real-time'],
		permission: 'ConfigureWebhooks',
		action: async () => {
			await goto('/admin/settings/integrations/webhooks');
		}
	},
	{
		id: 'qb-goto-schedules',
		label: 'Sync Schedules',
		description: 'Configure automated sync schedules',
		icon: '⏰',
		category: 'Navigate',
		keywords: ['schedule', 'automation', 'cron'],
		permission: 'ManageSyncSchedules',
		action: async () => {
			await goto('/admin/settings/integrations/schedules');
		}
	},
	{
		id: 'qb-goto-batches',
		label: 'Batch Operations',
		description: 'View and manage batch sync operations',
		icon: '📦',
		category: 'Navigate',
		keywords: ['batch', 'bulk', 'operations'],
		permission: 'PerformSync',
		action: async () => {
			await goto('/admin/settings/integrations/batches');
		}
	},
	{
		id: 'qb-goto-errors',
		label: 'Error Recovery',
		description: 'Retry failed sync operations',
		icon: '🔴',
		category: 'Navigate',
		keywords: ['errors', 'failed', 'retry'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/errors');
		}
	},

	// Settings
	{
		id: 'qb-configure-schedule',
		label: 'Configure Sync Schedule',
		description: 'Set up automated synchronization',
		icon: '⚙️',
		category: 'Settings',
		keywords: ['schedule', 'configure', 'automation'],
		permission: 'ManageSyncSchedules',
		action: async () => {
			await goto('/admin/settings/integrations/schedules');
		}
	},
	{
		id: 'qb-field-mappings',
		label: 'Field Mappings',
		description: 'Configure custom field mappings',
		icon: '🗺️',
		category: 'Settings',
		keywords: ['mappings', 'fields', 'custom'],
		permission: 'ManageFieldMappings',
		action: async () => {
			await goto('/admin/settings/integrations/mappings');
		}
	},
	{
		id: 'qb-selective-sync',
		label: 'Selective Sync Settings',
		description: 'Choose what data to sync',
		icon: '🎯',
		category: 'Settings',
		keywords: ['selective', 'filter', 'choose'],
		permission: 'ManageSyncSchedules',
		action: async () => {
			await goto('/admin/settings/integrations/selective');
		}
	},
	{
		id: 'qb-validation-rules',
		label: 'Data Validation Rules',
		description: 'Configure data quality checks',
		icon: '✅',
		category: 'Settings',
		keywords: ['validation', 'rules', 'quality'],
		permission: 'ManageSyncSchedules',
		action: async () => {
			await goto('/admin/settings/integrations/validation');
		}
	},

	// Utilities
	{
		id: 'qb-export-sync-log',
		label: 'Export Sync Log',
		description: 'Download sync history as CSV',
		icon: '💾',
		category: 'Utilities',
		keywords: ['export', 'download', 'csv'],
		permission: 'ViewSyncHistory',
		action: async () => {
			// Will be implemented in the integration page
			await goto('/admin/settings/integrations/audit');
		}
	},
	{
		id: 'qb-health-check',
		label: 'Run Health Check',
		description: 'Test QuickBooks connection',
		icon: '🏥',
		category: 'Utilities',
		keywords: ['health', 'check', 'test', 'connection'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/health');
		}
	},
	{
		id: 'qb-clear-cache',
		label: 'Clear Sync Cache',
		description: 'Reset cached sync data',
		icon: '🗑️',
		category: 'Utilities',
		keywords: ['clear', 'cache', 'reset'],
		permission: 'ManageSyncSchedules',
		action: async () => {
			// Cache clearing will be handled by the integration page
			if (confirm('Are you sure you want to clear the sync cache?')) {
				console.log('Clearing sync cache...');
			}
		}
	},
	{
		id: 'qb-compliance-report',
		label: 'Generate Compliance Report',
		description: 'SOX/GDPR compliance report',
		icon: '📊',
		category: 'Utilities',
		keywords: ['compliance', 'report', 'sox', 'gdpr'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations/compliance');
		}
	},
	{
		id: 'qb-rollback',
		label: 'Rollback Sync',
		description: 'Undo recent sync operation',
		icon: '↩️',
		category: 'Utilities',
		keywords: ['rollback', 'undo', 'revert'],
		permission: 'RollbackSync',
		action: async () => {
			await goto('/admin/settings/integrations/rollback');
		}
	}
];
