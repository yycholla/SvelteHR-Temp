// src/domain/Task/value-objects/TaskDescription.test.ts
import { describe, it, expect } from 'vitest';
import { TaskDescription } from './TaskDescription';

describe('TaskDescription', () => {
	describe('create', () => {
		it('should create valid description', () => {
			const result = TaskDescription.create('Fix the login bug that occurs when...');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Fix the login bug that occurs when...');
		});

		it('should create empty description', () => {
			const result = TaskDescription.create('');

			expect(result.isOk).toBe(true);
			expect(result.value.isEmpty()).toBe(true);
		});

		it('should trim whitespace', () => {
			const result = TaskDescription.create('  Description with spaces  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Description with spaces');
		});

		it('should handle multiline descriptions', () => {
			const multiline = 'Line 1\nLine 2\nLine 3';
			const result = TaskDescription.create(multiline);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(multiline);
		});

		it('should create from null as empty', () => {
			const result = TaskDescription.create(null);

			expect(result.isOk).toBe(true);
			expect(result.value.isEmpty()).toBe(true);
		});

		it('should create from undefined as empty', () => {
			const result = TaskDescription.create(undefined);

			expect(result.isOk).toBe(true);
			expect(result.value.isEmpty()).toBe(true);
		});
	});

	describe('isEmpty', () => {
		it('should return true for empty string', () => {
			const desc = TaskDescription.create('').value;
			expect(desc.isEmpty()).toBe(true);
		});

		it('should return true for whitespace-only', () => {
			const desc = TaskDescription.create('   ').value;
			expect(desc.isEmpty()).toBe(true);
		});

		it('should return false for non-empty description', () => {
			const desc = TaskDescription.create('Description').value;
			expect(desc.isEmpty()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for identical descriptions', () => {
			const desc1 = TaskDescription.create('Same text').value;
			const desc2 = TaskDescription.create('Same text').value;

			expect(desc1.equals(desc2)).toBe(true);
		});

		it('should return false for different descriptions', () => {
			const desc1 = TaskDescription.create('Text A').value;
			const desc2 = TaskDescription.create('Text B').value;

			expect(desc1.equals(desc2)).toBe(false);
		});

		it('should return true for both empty', () => {
			const desc1 = TaskDescription.create('').value;
			const desc2 = TaskDescription.create(null).value;

			expect(desc1.equals(desc2)).toBe(true);
		});
	});
});
