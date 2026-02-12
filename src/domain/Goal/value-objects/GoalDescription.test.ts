// src/domain/Goal/value-objects/GoalDescription.test.ts
import { describe, it, expect } from 'vitest';
import { GoalDescription } from './GoalDescription';
import { GoalDescriptionValidationError } from '../errors/GoalErrors';

describe('GoalDescription', () => {
	describe('create', () => {
		it('should create valid description', () => {
			const result = GoalDescription.create('This is a detailed description of the goal');
			expect(result.isOk).toBe(true);
		});

		it('should allow empty description', () => {
			const result = GoalDescription.create('');
			expect(result.isOk).toBe(true);
			expect(result.value.isEmpty()).toBe(true);
		});

		it('should trim whitespace', () => {
			const result = GoalDescription.create('  Description  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Description');
		});

		it('should accept description at maximum length', () => {
			const desc = 'A'.repeat(2000);
			const result = GoalDescription.create(desc);
			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(2000);
		});

		it('should reject description exceeding maximum length', () => {
			const desc = 'A'.repeat(2001);
			const result = GoalDescription.create(desc);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalDescriptionValidationError);
		});

		it('should handle multiline description', () => {
			const desc = 'Line 1\nLine 2\nLine 3';
			const result = GoalDescription.create(desc);
			expect(result.isOk).toBe(true);
		});

		it('should handle special characters', () => {
			const result = GoalDescription.create('Description with $pecial ch@rs & symbols!');
			expect(result.isOk).toBe(true);
		});
	});

	describe('isEmpty', () => {
		it('should return true for empty description', () => {
			const desc = GoalDescription.create('').value;
			expect(desc.isEmpty()).toBe(true);
		});

		it('should return false for non-empty description', () => {
			const desc = GoalDescription.create('Some text').value;
			expect(desc.isEmpty()).toBe(false);
		});

		it('should return true after trimming whitespace', () => {
			const desc = GoalDescription.create('   ').value;
			expect(desc.isEmpty()).toBe(true);
		});
	});

	describe('length', () => {
		it('should return correct length', () => {
			const desc = GoalDescription.create('Test description').value;
			expect(desc.length).toBe(16);
		});

		it('should return 0 for empty description', () => {
			const desc = GoalDescription.create('').value;
			expect(desc.length).toBe(0);
		});
	});

	describe('equals', () => {
		it('should return true for identical descriptions', () => {
			const desc1 = GoalDescription.create('Same description').value;
			const desc2 = GoalDescription.create('Same description').value;
			expect(desc1.equals(desc2)).toBe(true);
		});

		it('should return false for different descriptions', () => {
			const desc1 = GoalDescription.create('Description 1').value;
			const desc2 = GoalDescription.create('Description 2').value;
			expect(desc1.equals(desc2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return string value', () => {
			const desc = GoalDescription.create('Test description').value;
			expect(desc.toString()).toBe('Test description');
		});
	});
});
