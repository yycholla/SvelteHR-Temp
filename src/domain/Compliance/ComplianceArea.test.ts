// src/domain/Compliance/ComplianceArea.test.ts
import { describe, it, expect } from 'vitest';
import { ComplianceArea } from './ComplianceArea';
import { ComplianceScore } from './value-objects/ComplianceScore';
import { ComplianceStatus } from './value-objects/ComplianceStatus';

const validInput = {
	id: 'area-uuid-001',
	name: 'Data Privacy (GDPR)',
	description: 'Ensures compliance with GDPR data protection regulations.',
	score: 85,
	status: 'compliant',
	lastReviewDate: new Date('2026-01-01'),
	nextReviewDate: new Date('2026-07-01'),
	createdAt: new Date('2025-01-01'),
	updatedAt: new Date('2026-01-01')
};

describe('ComplianceArea', () => {
	describe('create()', () => {
		it('should create a valid ComplianceArea with all fields', () => {
			const result = ComplianceArea.create(validInput);
			expect(result.isOk).toBe(true);
		});

		it('should expose id correctly', () => {
			const area = ComplianceArea.create(validInput).value;
			expect(area.id).toBe('area-uuid-001');
		});

		it('should expose name correctly', () => {
			const area = ComplianceArea.create(validInput).value;
			expect(area.name.value).toBe('Data Privacy (GDPR)');
		});

		it('should expose description correctly', () => {
			const area = ComplianceArea.create(validInput).value;
			expect(area.description).toBe('Ensures compliance with GDPR data protection regulations.');
		});

		it('should expose score correctly', () => {
			const area = ComplianceArea.create(validInput).value;
			expect(area.score.value).toBe(85);
		});

		it('should expose status correctly', () => {
			const area = ComplianceArea.create(validInput).value;
			expect(area.status.value).toBe('compliant');
		});

		it('should create without optional description', () => {
			const input = { ...validInput, description: undefined };
			const result = ComplianceArea.create(input);
			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeUndefined();
		});

		it('should reject description exceeding 500 characters', () => {
			const input = { ...validInput, description: 'A'.repeat(501) };
			const result = ComplianceArea.create(input);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('500 characters');
		});

		it('should reject invalid name', () => {
			const input = { ...validInput, name: '' };
			const result = ComplianceArea.create(input);
			expect(result.isError).toBe(true);
		});

		it('should reject invalid score', () => {
			const input = { ...validInput, score: 150 };
			const result = ComplianceArea.create(input);
			expect(result.isError).toBe(true);
		});

		it('should reject invalid status', () => {
			const input = { ...validInput, status: 'unknown' };
			const result = ComplianceArea.create(input);
			expect(result.isError).toBe(true);
		});

		it('should reject invalid lastReviewDate', () => {
			const input = { ...validInput, lastReviewDate: new Date('invalid') };
			const result = ComplianceArea.create(input);
			expect(result.isError).toBe(true);
		});

		it('should reject invalid nextReviewDate', () => {
			const input = { ...validInput, nextReviewDate: 'not-a-date' as unknown as Date };
			const result = ComplianceArea.create(input);
			expect(result.isError).toBe(true);
		});

		it('should use defensive copies for date fields', () => {
			const createdAt = new Date(2025, 5, 15, 12, 0, 0);
			const updatedAt = new Date(2026, 5, 15, 12, 0, 0);
			const input = { ...validInput, createdAt, updatedAt };
			const area = ComplianceArea.create(input).value;

			// Record the original time
			const originalCreatedTime = createdAt.getTime();
			const originalUpdatedTime = updatedAt.getTime();

			// Mutate the originals
			createdAt.setFullYear(2000);
			updatedAt.setFullYear(2000);

			// Entity dates should be unaffected (still match original times)
			expect(area.createdAt.getTime()).toBe(originalCreatedTime);
			expect(area.updatedAt.getTime()).toBe(originalUpdatedTime);
		});

		it('should return defensive copies from getters', () => {
			const now = new Date(2025, 5, 15, 12, 0, 0);
			const input = { ...validInput, createdAt: now };
			const area = ComplianceArea.create(input).value;
			const originalTime = area.createdAt.getTime();
			const copy1 = area.createdAt;
			copy1.setFullYear(2000);
			// Second call should still return the original time
			expect(area.createdAt.getTime()).toBe(originalTime);
		});
	});

	describe('isDueForReview()', () => {
		it('should return true when next review date is in the past', () => {
			const input = { ...validInput, nextReviewDate: new Date('2020-01-01') };
			const area = ComplianceArea.create(input).value;
			expect(area.isDueForReview()).toBe(true);
		});

		it('should return false when next review date is in the future', () => {
			const input = { ...validInput, nextReviewDate: new Date('2099-12-31') };
			const area = ComplianceArea.create(input).value;
			expect(area.isDueForReview()).toBe(false);
		});
	});

	describe('updateScore()', () => {
		it('should return a new instance with updated score and status', () => {
			const area = ComplianceArea.create(validInput).value;
			const newScore = ComplianceScore.create(60).value;
			const newStatus = ComplianceStatus.create('warning').value;

			const updated = area.updateScore(newScore, newStatus);

			expect(updated).not.toBe(area);
			expect(updated.score.value).toBe(60);
			expect(updated.status.value).toBe('warning');
		});

		it('should preserve other fields on updateScore', () => {
			const area = ComplianceArea.create(validInput).value;
			const newScore = ComplianceScore.create(95).value;
			const newStatus = ComplianceStatus.create('compliant').value;

			const updated = area.updateScore(newScore, newStatus);

			expect(updated.id).toBe(area.id);
			expect(updated.name.value).toBe(area.name.value);
			expect(updated.description).toBe(area.description);
		});

		it('should not mutate the original area on updateScore', () => {
			const area = ComplianceArea.create(validInput).value;
			const originalScore = area.score.value;
			const newScore = ComplianceScore.create(40).value;
			const newStatus = ComplianceStatus.create('failed').value;

			area.updateScore(newScore, newStatus);

			expect(area.score.value).toBe(originalScore);
		});

		it('should update the updatedAt timestamp on updateScore', () => {
			const area = ComplianceArea.create(validInput).value;
			const originalUpdatedAt = area.updatedAt.getTime();
			const newScore = ComplianceScore.create(90).value;
			const newStatus = ComplianceStatus.create('compliant').value;

			const updated = area.updateScore(newScore, newStatus);

			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
		});
	});
});
