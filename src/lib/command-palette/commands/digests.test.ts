/**
 * Email Digest Commands Tests
 *
 * Test suite for email digest command palette integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { digestCommands } from './digests';
import type { Command } from '../types';

// Mock the $app/navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Digest Commands', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should export an array of commands', () => {
		expect(Array.isArray(digestCommands)).toBe(true);
		expect(digestCommands.length).toBeGreaterThan(0);
	});

	it('should have 14 digest commands', () => {
		expect(digestCommands).toHaveLength(14);
	});

	it('should have unique command IDs', () => {
		const ids = digestCommands.map((cmd) => cmd.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(digestCommands.length);
	});

	it('should have required permission for all commands', () => {
		digestCommands.forEach((cmd) => {
			expect(cmd.permission).toBeDefined();
			expect(typeof cmd.permission).toBe('string');
		});
	});

	it('should have ManageIntegrations permission for management commands', () => {
		const managementCommands = [
			'digest-manage',
			'digest-create',
			'digest-recipients',
			'digest-schedule',
			'digest-content',
			'digest-test-send',
			'digest-enable'
		];

		managementCommands.forEach((cmdId) => {
			const cmd = digestCommands.find((c) => c.id === cmdId);
			expect(cmd).toBeDefined();
			expect(cmd?.permission).toBe('ManageIntegrations');
		});
	});

	it('should have ViewSyncHistory permission for view-only commands', () => {
		const viewCommands = ['digest-view-logs', 'digest-sync-summary', 'digest-health'];

		viewCommands.forEach((cmdId) => {
			const cmd = digestCommands.find((c) => c.id === cmdId);
			expect(cmd).toBeDefined();
			expect(cmd?.permission).toBe('ViewSyncHistory');
		});
	});

	it('should categorize commands correctly', () => {
		const navigateCommands = digestCommands.filter((cmd) => cmd.category === 'Navigate');
		const settingsCommands = digestCommands.filter((cmd) => cmd.category === 'Settings');
		const utilityCommands = digestCommands.filter((cmd) => cmd.category === 'Utilities');

		expect(navigateCommands.length).toBeGreaterThan(0);
		expect(settingsCommands.length).toBeGreaterThan(0);
		expect(utilityCommands.length).toBeGreaterThan(0);
	});

	it('should have labels and descriptions for all commands', () => {
		digestCommands.forEach((cmd) => {
			expect(cmd.label).toBeDefined();
			expect(typeof cmd.label).toBe('string');
			expect(cmd.label.length).toBeGreaterThan(0);

			expect(cmd.description).toBeDefined();
			expect(typeof cmd.description).toBe('string');
			expect(cmd.description!.length).toBeGreaterThan(0);
		});
	});

	it('should have icons for all commands', () => {
		digestCommands.forEach((cmd) => {
			expect(cmd.icon).toBeDefined();
			expect(typeof cmd.icon).toBe('string');
			expect(cmd.icon!.length).toBeGreaterThan(0);
		});
	});

	it('should have keywords for all commands', () => {
		digestCommands.forEach((cmd) => {
			expect(cmd.keywords).toBeDefined();
			expect(Array.isArray(cmd.keywords)).toBe(true);
			expect(cmd.keywords!.length).toBeGreaterThan(0);
		});
	});

	it('should have action functions for all commands', () => {
		digestCommands.forEach((cmd) => {
			expect(cmd.action).toBeDefined();
			expect(typeof cmd.action).toBe('function');
		});
	});

	describe('Individual Commands', () => {
		it('should have digest-manage command with correct properties', () => {
			const cmd = digestCommands.find((c) => c.id === 'digest-manage');
			expect(cmd).toBeDefined();
			expect(cmd?.label).toBe('Manage Email Digests');
			expect(cmd?.category).toBe('Navigate');
			expect(cmd?.shortcut).toBe('Cmd+Shift+M');
			expect(cmd?.icon).toBe('📬');
		});

		it('should have digest-create command', () => {
			const cmd = digestCommands.find((c) => c.id === 'digest-create');
			expect(cmd).toBeDefined();
			expect(cmd?.label).toBe('Create Email Digest');
			expect(cmd?.category).toBe('Settings');
			expect(cmd?.icon).toBe('➕');
		});

		it('should have frequency-based commands (daily, weekly, monthly)', () => {
			const dailyCmd = digestCommands.find((c) => c.id === 'digest-daily');
			const weeklyCmd = digestCommands.find((c) => c.id === 'digest-weekly');
			const monthlyCmd = digestCommands.find((c) => c.id === 'digest-monthly');

			expect(dailyCmd).toBeDefined();
			expect(weeklyCmd).toBeDefined();
			expect(monthlyCmd).toBeDefined();

			expect(dailyCmd?.icon).toBe('📅');
			expect(weeklyCmd?.icon).toBe('📆');
			expect(monthlyCmd?.icon).toBe('🗓️');
		});

		it('should have digest-test-send command for testing', () => {
			const cmd = digestCommands.find((c) => c.id === 'digest-test-send');
			expect(cmd).toBeDefined();
			expect(cmd?.label).toBe('Send Test Digest');
			expect(cmd?.category).toBe('Utilities');
			expect(cmd?.icon).toBe('🧪');
		});

		it('should have digest-view-logs command', () => {
			const cmd = digestCommands.find((c) => c.id === 'digest-view-logs');
			expect(cmd).toBeDefined();
			expect(cmd?.label).toBe('View Digest Delivery Logs');
			expect(cmd?.permission).toBe('ViewSyncHistory');
		});

		it('should have specific digest type commands (sync, conflicts, health)', () => {
			const syncCmd = digestCommands.find((c) => c.id === 'digest-sync-summary');
			const conflictsCmd = digestCommands.find((c) => c.id === 'digest-conflicts');
			const healthCmd = digestCommands.find((c) => c.id === 'digest-health');

			expect(syncCmd).toBeDefined();
			expect(conflictsCmd).toBeDefined();
			expect(healthCmd).toBeDefined();

			expect(syncCmd?.icon).toBe('🔄');
			expect(conflictsCmd?.icon).toBe('⚠️');
			expect(healthCmd?.icon).toBe('❤️');
		});
	});

	describe('Command Keywords', () => {
		it('should have searchable keywords for digest management', () => {
			const manageCmd = digestCommands.find((c) => c.id === 'digest-manage');
			expect(manageCmd?.keywords).toContain('digest');
			expect(manageCmd?.keywords).toContain('email');
		});

		it('should have schedule-related keywords', () => {
			const scheduleCmd = digestCommands.find((c) => c.id === 'digest-schedule');
			expect(scheduleCmd?.keywords).toContain('schedule');
			expect(scheduleCmd?.keywords).toContain('cron');
		});

		it('should have test-related keywords for test send', () => {
			const testCmd = digestCommands.find((c) => c.id === 'digest-test-send');
			expect(testCmd?.keywords).toContain('test');
			expect(testCmd?.keywords).toContain('send');
			expect(testCmd?.keywords).toContain('now');
		});
	});
});
