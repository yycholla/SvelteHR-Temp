// src/domain/Onboarding/OnboardingAssignment.test.ts
import { describe, expect, it } from 'vitest';
import { OnboardingAssignment } from './OnboardingAssignment';
import { InvalidAssignmentError } from './errors/OnboardingErrors';

describe('OnboardingAssignment', () => {
	const PAST_DATE = new Date('2020-01-01T00:00:00Z');
	const FUTURE_DATE = new Date('2099-12-31T00:00:00Z');

	const validData = () => ({
		id: '12345678-1234-1234-1234-123456789012',
		userId: '22222222-2222-2222-2222-222222222222',
		onboardingModuleId: '33333333-3333-3333-3333-333333333333',
		assignedById: '44444444-4444-4444-4444-444444444444',
		assignedAt: new Date('2026-01-01T00:00:00Z'),
		dueDate: FUTURE_DATE,
		completedAt: null
	});

	describe('create', () => {
		it('creates assignment with valid data', () => {
			const result = OnboardingAssignment.create(validData());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('12345678-1234-1234-1234-123456789012');
			expect(result.value.userId).toBe('22222222-2222-2222-2222-222222222222');
			expect(result.value.onboardingModuleId).toBe('33333333-3333-3333-3333-333333333333');
			expect(result.value.assignedById).toBe('44444444-4444-4444-4444-444444444444');
			expect(result.value.completedAt).toBeNull();
		});

		it('rejects invalid id UUID', () => {
			const data = { ...validData(), id: 'not-a-uuid' };
			const result = OnboardingAssignment.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid assignment ID format');
		});

		it('rejects empty id', () => {
			const data = { ...validData(), id: '' };
			const result = OnboardingAssignment.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('rejects invalid userId UUID', () => {
			const data = { ...validData(), userId: 'not-a-uuid' };
			const result = OnboardingAssignment.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid user ID format');
		});

		it('rejects invalid onboardingModuleId UUID', () => {
			const data = { ...validData(), onboardingModuleId: 'not-a-uuid' };
			const result = OnboardingAssignment.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid onboarding module ID format');
		});

		it('rejects invalid assignedById UUID', () => {
			const data = { ...validData(), assignedById: 'not-a-uuid' };
			const result = OnboardingAssignment.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			expect(result.error.message).toContain('Invalid assignedById format');
		});

		it('allows null dueDate', () => {
			const data = { ...validData(), dueDate: null };
			const result = OnboardingAssignment.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.dueDate).toBeNull();
		});
	});

	describe('status (derived)', () => {
		it('returns in_progress when no dueDate and not completed', () => {
			const data = { ...validData(), dueDate: null, completedAt: null };
			const assignment = OnboardingAssignment.create(data).value;

			expect(assignment.status).toBe('in_progress');
		});

		it('returns in_progress when future dueDate and not completed', () => {
			const data = { ...validData(), dueDate: FUTURE_DATE, completedAt: null };
			const assignment = OnboardingAssignment.create(data).value;

			expect(assignment.status).toBe('in_progress');
		});

		it('returns overdue when past dueDate and not completed', () => {
			const data = { ...validData(), dueDate: PAST_DATE, completedAt: null };
			const assignment = OnboardingAssignment.create(data).value;

			expect(assignment.status).toBe('overdue');
		});

		it('returns completed when completedAt is set', () => {
			const data = { ...validData(), completedAt: new Date('2026-01-15T00:00:00Z') };
			const assignment = OnboardingAssignment.create(data).value;

			expect(assignment.status).toBe('completed');
		});

		it('returns completed even when dueDate is in the past (completedAt takes precedence)', () => {
			const data = {
				...validData(),
				dueDate: PAST_DATE,
				completedAt: new Date('2026-01-15T00:00:00Z')
			};
			const assignment = OnboardingAssignment.create(data).value;

			expect(assignment.status).toBe('completed');
		});
	});

	describe('complete', () => {
		it('returns new instance with completedAt set', () => {
			const assignment = OnboardingAssignment.create(validData()).value;
			const completionDate = new Date('2026-02-01T12:00:00Z');
			const completed = assignment.complete(completionDate);

			expect(completed.completedAt?.getTime()).toBe(completionDate.getTime());
			expect(assignment.completedAt).toBeNull(); // original unchanged
			expect(completed).not.toBe(assignment); // new instance
		});

		it('defaults completedAt to current time when no date provided', () => {
			const before = Date.now();
			const assignment = OnboardingAssignment.create(validData()).value;
			const completed = assignment.complete();
			const after = Date.now();

			expect(completed.completedAt).not.toBeNull();
			const completedTime = completed.completedAt!.getTime();
			expect(completedTime).toBeGreaterThanOrEqual(before);
			expect(completedTime).toBeLessThanOrEqual(after);
		});

		it('complete() sets status to completed', () => {
			const assignment = OnboardingAssignment.create(validData()).value;
			const completed = assignment.complete();

			expect(completed.status).toBe('completed');
			expect(completed.isCompleted()).toBe(true);
		});
	});

	describe('isCompleted', () => {
		it('returns false when completedAt is null', () => {
			const assignment = OnboardingAssignment.create(validData()).value;
			expect(assignment.isCompleted()).toBe(false);
		});

		it('returns true when completedAt is set', () => {
			const data = { ...validData(), completedAt: new Date() };
			const assignment = OnboardingAssignment.create(data).value;
			expect(assignment.isCompleted()).toBe(true);
		});
	});

	describe('isOverdue', () => {
		it('returns true when past dueDate and not completed', () => {
			const data = { ...validData(), dueDate: PAST_DATE, completedAt: null };
			const assignment = OnboardingAssignment.create(data).value;
			expect(assignment.isOverdue()).toBe(true);
		});

		it('returns false when future dueDate', () => {
			const data = { ...validData(), dueDate: FUTURE_DATE, completedAt: null };
			const assignment = OnboardingAssignment.create(data).value;
			expect(assignment.isOverdue()).toBe(false);
		});

		it('returns false when completedAt is set even if dueDate is past', () => {
			const data = {
				...validData(),
				dueDate: PAST_DATE,
				completedAt: new Date('2019-12-31T00:00:00Z')
			};
			const assignment = OnboardingAssignment.create(data).value;
			expect(assignment.isOverdue()).toBe(false);
		});

		it('returns false when dueDate is null', () => {
			const data = { ...validData(), dueDate: null, completedAt: null };
			const assignment = OnboardingAssignment.create(data).value;
			expect(assignment.isOverdue()).toBe(false);
		});
	});

	describe('defensive copies', () => {
		it('assignedAt getter returns defensive copy', () => {
			const assignment = OnboardingAssignment.create(validData()).value;
			const date1 = assignment.assignedAt;
			const date2 = assignment.assignedAt;

			expect(date1).not.toBe(date2);
			expect(date1.getTime()).toBe(date2.getTime());

			const originalTime = assignment.assignedAt.getTime();
			date1.setUTCFullYear(2000);
			expect(assignment.assignedAt.getTime()).toBe(originalTime);
		});

		it('assignedAt in create is stored as defensive copy', () => {
			const originalDate = new Date('2026-06-15T12:00:00Z');
			const data = { ...validData(), assignedAt: originalDate };
			const assignment = OnboardingAssignment.create(data).value;

			const expectedTime = originalDate.getTime();
			originalDate.setUTCFullYear(2000);

			expect(assignment.assignedAt.getTime()).toBe(expectedTime);
		});

		it('dueDate getter returns defensive copy', () => {
			const assignment = OnboardingAssignment.create(validData()).value;
			const originalTime = assignment.dueDate!.getTime();
			const date1 = assignment.dueDate!;
			date1.setUTCFullYear(2000);

			expect(assignment.dueDate!.getTime()).toBe(originalTime);
		});

		it('dueDate in create is stored as defensive copy', () => {
			const originalDueDate = new Date('2099-12-31T00:00:00Z');
			const data = { ...validData(), dueDate: originalDueDate };
			const assignment = OnboardingAssignment.create(data).value;

			const expectedTime = originalDueDate.getTime();
			originalDueDate.setUTCFullYear(2000);

			expect(assignment.dueDate!.getTime()).toBe(expectedTime);
		});
	});
});
