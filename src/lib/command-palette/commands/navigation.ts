/**
 * Navigation Commands
 *
 * General navigation commands for the application.
 */

import { goto } from '$app/navigation';
import type { Command } from '../types';

export const navigationCommands: Command[] = [
	{
		id: 'goto-dashboard',
		label: 'Go to Dashboard',
		description: 'Main application dashboard',
		icon: '🏠',
		category: 'Navigate',
		shortcut: 'Cmd+Shift+H',
		keywords: ['home', 'dashboard', 'main'],
		action: async () => {
			await goto('/dashboard');
		}
	},
	{
		id: 'goto-employees',
		label: 'Go to Employees',
		description: 'Employee directory',
		icon: '👥',
		category: 'Navigate',
		shortcut: 'Cmd+Shift+U',
		keywords: ['employees', 'users', 'people', 'directory'],
		action: async () => {
			await goto('/dashboard/employees');
		}
	},
	{
		id: 'goto-departments',
		label: 'Go to Departments',
		description: 'Department management',
		icon: '🏢',
		category: 'Navigate',
		keywords: ['departments', 'org', 'organization'],
		action: async () => {
			await goto('/dashboard/departments');
		}
	},
	{
		id: 'goto-tasks',
		label: 'Go to Tasks',
		description: 'Task management',
		icon: '✅',
		category: 'Navigate',
		keywords: ['tasks', 'todo'],
		action: async () => {
			await goto('/dashboard/tasks/my-tasks');
		}
	},
	{
		id: 'goto-events',
		label: 'Go to Events',
		description: 'Event calendar',
		icon: '📅',
		category: 'Navigate',
		keywords: ['events', 'calendar', 'meetings'],
		action: async () => {
			await goto('/dashboard/events');
		}
	},
	{
		id: 'goto-notifications',
		label: 'Go to Notifications',
		description: 'View all notifications',
		icon: '🔔',
		category: 'Navigate',
		shortcut: 'Cmd+Shift+N',
		keywords: ['notifications', 'alerts'],
		action: async () => {
			await goto('/dashboard/notifications');
		}
	},
	{
		id: 'goto-settings',
		label: 'Go to Settings',
		description: 'Application settings',
		icon: '⚙️',
		category: 'Navigate',
		shortcut: 'Cmd+,',
		keywords: ['settings', 'preferences', 'config'],
		action: async () => {
			await goto('/admin/settings');
		}
	},
	{
		id: 'goto-integrations',
		label: 'Go to Integrations',
		description: 'QuickBooks and other integrations',
		icon: '🔌',
		category: 'Navigate',
		shortcut: 'Cmd+Shift+I',
		keywords: ['integrations', 'quickbooks', 'sync'],
		permission: 'ViewSyncHistory',
		action: async () => {
			await goto('/admin/settings/integrations');
		}
	},
	{
		id: 'goto-profile',
		label: 'Go to Profile',
		description: 'Your profile page',
		icon: '👤',
		category: 'Navigate',
		keywords: ['profile', 'account', 'me'],
		action: async () => {
			await goto('/dashboard/profile');
		}
	}
];
