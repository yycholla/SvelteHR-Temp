import { describe, it, expect } from 'vitest';
import { EventType } from './EventType';
import { EventTypeValidationError } from '../errors/EventErrors';

describe('EventType', () => {
	describe('create()', () => {
		describe('valid types', () => {
			it('should create meeting type', () => {
				const result = EventType.create('meeting');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('meeting');
			});

			it('should create training type', () => {
				const result = EventType.create('training');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('training');
			});

			it('should create review type', () => {
				const result = EventType.create('review');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('review');
			});

			it('should create social type', () => {
				const result = EventType.create('social');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('social');
			});

			it('should create holiday type', () => {
				const result = EventType.create('holiday');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('holiday');
			});

			it('should create time_off type', () => {
				const result = EventType.create('time_off');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('time_off');
			});

			it('should create other type', () => {
				const result = EventType.create('other');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('other');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase type', () => {
				const result = EventType.create('MEETING');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('meeting');
			});

			it('should normalize mixed case type', () => {
				const result = EventType.create('TrAiNiNg');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('training');
			});

			it('should normalize kebab-case to snake_case', () => {
				const result = EventType.create('time-off');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('time_off');
			});

			it('should trim whitespace', () => {
				const result = EventType.create('  review  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('review');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = EventType.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTypeValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject invalid type', () => {
				const result = EventType.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTypeValidationError);
				expect(result.error?.message).toContain('Invalid type');
			});

			it('should reject whitespace-only string', () => {
				const result = EventType.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTypeValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same type value', () => {
			const type1 = EventType.create('meeting').value!;
			const type2 = EventType.create('meeting').value!;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different type values', () => {
			const type1 = EventType.create('meeting').value!;
			const type2 = EventType.create('training').value!;
			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('type check methods', () => {
		it('should correctly identify meeting type', () => {
			const type = EventType.create('meeting').value!;
			expect(type.isMeeting()).toBe(true);
			expect(type.isTraining()).toBe(false);
			expect(type.isReview()).toBe(false);
			expect(type.isSocial()).toBe(false);
			expect(type.isHoliday()).toBe(false);
			expect(type.isTimeOff()).toBe(false);
			expect(type.isOther()).toBe(false);
		});

		it('should correctly identify training type', () => {
			const type = EventType.create('training').value!;
			expect(type.isMeeting()).toBe(false);
			expect(type.isTraining()).toBe(true);
			expect(type.isReview()).toBe(false);
			expect(type.isSocial()).toBe(false);
			expect(type.isHoliday()).toBe(false);
			expect(type.isTimeOff()).toBe(false);
			expect(type.isOther()).toBe(false);
		});

		it('should correctly identify review type', () => {
			const type = EventType.create('review').value!;
			expect(type.isMeeting()).toBe(false);
			expect(type.isTraining()).toBe(false);
			expect(type.isReview()).toBe(true);
			expect(type.isSocial()).toBe(false);
			expect(type.isHoliday()).toBe(false);
			expect(type.isTimeOff()).toBe(false);
			expect(type.isOther()).toBe(false);
		});

		it('should correctly identify social type', () => {
			const type = EventType.create('social').value!;
			expect(type.isMeeting()).toBe(false);
			expect(type.isTraining()).toBe(false);
			expect(type.isReview()).toBe(false);
			expect(type.isSocial()).toBe(true);
			expect(type.isHoliday()).toBe(false);
			expect(type.isTimeOff()).toBe(false);
			expect(type.isOther()).toBe(false);
		});

		it('should correctly identify holiday type', () => {
			const type = EventType.create('holiday').value!;
			expect(type.isMeeting()).toBe(false);
			expect(type.isTraining()).toBe(false);
			expect(type.isReview()).toBe(false);
			expect(type.isSocial()).toBe(false);
			expect(type.isHoliday()).toBe(true);
			expect(type.isTimeOff()).toBe(false);
			expect(type.isOther()).toBe(false);
		});

		it('should correctly identify time_off type', () => {
			const type = EventType.create('time_off').value!;
			expect(type.isMeeting()).toBe(false);
			expect(type.isTraining()).toBe(false);
			expect(type.isReview()).toBe(false);
			expect(type.isSocial()).toBe(false);
			expect(type.isHoliday()).toBe(false);
			expect(type.isTimeOff()).toBe(true);
			expect(type.isOther()).toBe(false);
		});

		it('should correctly identify other type', () => {
			const type = EventType.create('other').value!;
			expect(type.isMeeting()).toBe(false);
			expect(type.isTraining()).toBe(false);
			expect(type.isReview()).toBe(false);
			expect(type.isSocial()).toBe(false);
			expect(type.isHoliday()).toBe(false);
			expect(type.isTimeOff()).toBe(false);
			expect(type.isOther()).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return the type value as string', () => {
			const type = EventType.create('meeting').value!;
			expect(type.toString()).toBe('meeting');
		});
	});
});
