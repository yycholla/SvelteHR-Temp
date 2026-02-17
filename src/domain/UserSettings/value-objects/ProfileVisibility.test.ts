// src/domain/UserSettings/value-objects/ProfileVisibility.test.ts
import { describe, it, expect } from 'vitest';
import { ProfileVisibility } from './ProfileVisibility';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

describe('ProfileVisibility', () => {
	describe('create', () => {
		it('should create public visibility', () => {
			const result = ProfileVisibility.create('public');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('public');
		});

		it('should create team visibility', () => {
			const result = ProfileVisibility.create('team');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('team');
		});

		it('should create managers visibility', () => {
			const result = ProfileVisibility.create('managers');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('managers');
		});

		it('should create private visibility', () => {
			const result = ProfileVisibility.create('private');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('private');
		});

		it('should reject invalid visibility', () => {
			const result = ProfileVisibility.create('everyone');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject empty string', () => {
			const result = ProfileVisibility.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject uppercase visibility', () => {
			const result = ProfileVisibility.create('PUBLIC');
			expect(result.isError).toBe(true);
		});

		it('should include valid options in error message', () => {
			const result = ProfileVisibility.create('unknown');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('public');
		});
	});

	describe('isRestrictedTo', () => {
		it('should return false when comparing public to public', () => {
			const pub = ProfileVisibility.create('public').value;
			expect(pub.isRestrictedTo(pub)).toBe(false);
		});

		it('should return true when private is more restricted than public', () => {
			const priv = ProfileVisibility.create('private').value;
			const pub = ProfileVisibility.create('public').value;
			expect(priv.isRestrictedTo(pub)).toBe(true);
		});

		it('should return false when public is compared to private', () => {
			const pub = ProfileVisibility.create('public').value;
			const priv = ProfileVisibility.create('private').value;
			expect(pub.isRestrictedTo(priv)).toBe(false);
		});

		it('should return true when managers is more restricted than team', () => {
			const managers = ProfileVisibility.create('managers').value;
			const team = ProfileVisibility.create('team').value;
			expect(managers.isRestrictedTo(team)).toBe(true);
		});

		it('should return true when private is more restricted than managers', () => {
			const priv = ProfileVisibility.create('private').value;
			const managers = ProfileVisibility.create('managers').value;
			expect(priv.isRestrictedTo(managers)).toBe(true);
		});

		it('should return true when team is more restricted than public', () => {
			const team = ProfileVisibility.create('team').value;
			const pub = ProfileVisibility.create('public').value;
			expect(team.isRestrictedTo(pub)).toBe(true);
		});

		it('should return false for equal visibilities', () => {
			const managers1 = ProfileVisibility.create('managers').value;
			const managers2 = ProfileVisibility.create('managers').value;
			expect(managers1.isRestrictedTo(managers2)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for equal visibilities', () => {
			const v1 = ProfileVisibility.create('team').value;
			const v2 = ProfileVisibility.create('team').value;
			expect(v1.equals(v2)).toBe(true);
		});

		it('should return false for different visibilities', () => {
			const v1 = ProfileVisibility.create('public').value;
			const v2 = ProfileVisibility.create('private').value;
			expect(v1.equals(v2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the visibility string', () => {
			const v = ProfileVisibility.create('managers').value;
			expect(v.toString()).toBe('managers');
		});
	});
});
