// src/domain/UserSettings/value-objects/NotificationPreferences.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationPreferences } from './NotificationPreferences';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

function createValidData() {
	return {
		email: true,
		push: false,
		sms: false,
		leaveReminders: true,
		performanceUpdates: true,
		systemAlerts: true,
		teamUpdates: false
	};
}

describe('NotificationPreferences', () => {
	describe('create', () => {
		it('should create valid notification preferences', () => {
			const result = NotificationPreferences.create(createValidData());
			expect(result.isOk).toBe(true);
		});

		it('should create preferences with all disabled', () => {
			const result = NotificationPreferences.create({
				email: false,
				push: false,
				sms: false,
				leaveReminders: false,
				performanceUpdates: false,
				systemAlerts: false,
				teamUpdates: false
			});
			expect(result.isOk).toBe(true);
		});

		it('should create preferences with all enabled', () => {
			const result = NotificationPreferences.create({
				email: true,
				push: true,
				sms: true,
				leaveReminders: true,
				performanceUpdates: true,
				systemAlerts: true,
				teamUpdates: true
			});
			expect(result.isOk).toBe(true);
		});

		it('should reject non-boolean email value', () => {
			const data = { ...createValidData(), email: 'yes' as unknown as boolean };
			const result = NotificationPreferences.create(data);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject non-boolean push value', () => {
			const data = { ...createValidData(), push: 1 as unknown as boolean };
			const result = NotificationPreferences.create(data);
			expect(result.isError).toBe(true);
		});

		it('should reject non-boolean sms value', () => {
			const data = { ...createValidData(), sms: null as unknown as boolean };
			const result = NotificationPreferences.create(data);
			expect(result.isError).toBe(true);
		});

		it('should include field name in error message', () => {
			const data = { ...createValidData(), leaveReminders: 'true' as unknown as boolean };
			const result = NotificationPreferences.create(data);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('leaveReminders');
		});
	});

	describe('getters', () => {
		it('should correctly return all field values', () => {
			const prefs = NotificationPreferences.create(createValidData()).value;
			expect(prefs.email).toBe(true);
			expect(prefs.push).toBe(false);
			expect(prefs.sms).toBe(false);
			expect(prefs.leaveReminders).toBe(true);
			expect(prefs.performanceUpdates).toBe(true);
			expect(prefs.systemAlerts).toBe(true);
			expect(prefs.teamUpdates).toBe(false);
		});
	});

	describe('withEmailEnabled', () => {
		it('should return a new instance with email enabled', () => {
			const prefs = NotificationPreferences.create({ ...createValidData(), email: false }).value;
			const updated = prefs.withEmailEnabled(true);
			expect(updated.email).toBe(true);
			expect(prefs.email).toBe(false); // original unchanged
		});

		it('should return a new instance with email disabled', () => {
			const prefs = NotificationPreferences.create({ ...createValidData(), email: true }).value;
			const updated = prefs.withEmailEnabled(false);
			expect(updated.email).toBe(false);
		});

		it('should not change other fields', () => {
			const prefs = NotificationPreferences.create(createValidData()).value;
			const updated = prefs.withEmailEnabled(false);
			expect(updated.push).toBe(prefs.push);
			expect(updated.sms).toBe(prefs.sms);
			expect(updated.leaveReminders).toBe(prefs.leaveReminders);
		});
	});

	describe('withPushEnabled', () => {
		it('should return a new instance with push updated', () => {
			const prefs = NotificationPreferences.create(createValidData()).value;
			const updated = prefs.withPushEnabled(true);
			expect(updated.push).toBe(true);
			expect(prefs.push).toBe(false);
		});
	});

	describe('withSmsEnabled', () => {
		it('should return a new instance with sms updated', () => {
			const prefs = NotificationPreferences.create(createValidData()).value;
			const updated = prefs.withSmsEnabled(true);
			expect(updated.sms).toBe(true);
			expect(prefs.sms).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for equal preferences', () => {
			const p1 = NotificationPreferences.create(createValidData()).value;
			const p2 = NotificationPreferences.create(createValidData()).value;
			expect(p1.equals(p2)).toBe(true);
		});

		it('should return false for different preferences', () => {
			const p1 = NotificationPreferences.create(createValidData()).value;
			const p2 = NotificationPreferences.create({ ...createValidData(), email: false }).value;
			expect(p1.equals(p2)).toBe(false);
		});
	});
});
