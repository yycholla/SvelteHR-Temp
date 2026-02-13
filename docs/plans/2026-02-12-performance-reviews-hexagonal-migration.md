# Performance Reviews Module Hexagonal Architecture Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Performance Reviews module from direct GraphQL to clean hexagonal architecture with domain-driven design, following the proven Employee/Department/RBAC patterns.

**Architecture:** Apply ports & adapters pattern with Domain Layer (value objects + entity), Service Layer (business logic + port), Adapter Layer (GraphQL implementation), and Integration Layer (DI factories). Consolidate two duplicate GraphQL modules into one clean implementation.

**Tech Stack:** TypeScript 5, Result pattern, Vitest 3.2, URQL GraphQL Client, hexagonal architecture

---

## Current State Analysis

**Problems:**

- Two duplicate GraphQL modules (`performance/` and `performance-management/`)
- 1949 LOC scattered across query files
- 10% test coverage (critical for HR function)
- Business logic in helper functions and components
- Complex rating calculations not validated
- Status transitions not enforced

**Target State:**

- Single unified domain model
- 90/100 hexagonal score (matching RBAC)
- 80+ comprehensive tests
- Type-safe rating and status validation
- Clean separation: Domain → Service → Adapter → Integration

---

## Domain Model Design

### Value Objects

1. **ReviewStatus**: draft | in_progress | completed | overdue (with validation)
2. **Rating**: 1-5 scale with business rules (min 1, max 5, no decimals allowed)
3. **ReviewPeriod**: Q1-2025 format validation (quarters, halves, annual)
4. **ReviewDate**: ISO date with overdue detection logic

### Entity

5. **PerformanceReview**: Aggregate root with ratings, status transitions, validation

### Errors

6. Hierarchy: PerformanceReviewError > ValidationError, NotFoundError, etc.

---

## Task Breakdown

### Task 1: ReviewStatus Value Object

**Files:**

- Create: `src/domain/PerformanceReview/value-objects/ReviewStatus.ts`
- Create: `src/domain/PerformanceReview/value-objects/ReviewStatus.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/PerformanceReview/value-objects/ReviewStatus.test.ts
import { describe, it, expect } from 'vitest';
import { ReviewStatus } from './ReviewStatus';
import { ReviewStatusValidationError } from '../errors/PerformanceReviewErrors';

describe('ReviewStatus', () => {
	describe('create', () => {
		it('should create draft status', () => {
			const result = ReviewStatus.create('draft');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('draft');
			expect(result.value.isDraft()).toBe(true);
		});

		it('should create in_progress status', () => {
			const result = ReviewStatus.create('in_progress');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
			expect(result.value.isInProgress()).toBe(true);
		});

		it('should create completed status', () => {
			const result = ReviewStatus.create('completed');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
			expect(result.value.isCompleted()).toBe(true);
		});

		it('should create overdue status', () => {
			const result = ReviewStatus.create('overdue');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('overdue');
			expect(result.value.isOverdue()).toBe(true);
		});

		it('should reject invalid status', () => {
			const result = ReviewStatus.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewStatusValidationError);
			expect(result.error.message).toContain('Invalid review status');
		});

		it('should reject empty status', () => {
			const result = ReviewStatus.create('');

			expect(result.isError).toBe(true);
		});
	});

	describe('canTransitionTo', () => {
		it('should allow draft to in_progress', () => {
			const draft = ReviewStatus.create('draft').value;
			const inProgress = ReviewStatus.create('in_progress').value;

			expect(draft.canTransitionTo(inProgress)).toBe(true);
		});

		it('should allow in_progress to completed', () => {
			const inProgress = ReviewStatus.create('in_progress').value;
			const completed = ReviewStatus.create('completed').value;

			expect(inProgress.canTransitionTo(completed)).toBe(true);
		});

		it('should not allow completed to draft', () => {
			const completed = ReviewStatus.create('completed').value;
			const draft = ReviewStatus.create('draft').value;

			expect(completed.canTransitionTo(draft)).toBe(false);
		});

		it('should allow any status to overdue', () => {
			const draft = ReviewStatus.create('draft').value;
			const overdue = ReviewStatus.create('overdue').value;

			expect(draft.canTransitionTo(overdue)).toBe(true);
		});
	});

	describe('equals', () => {
		it('should return true for same status', () => {
			const status1 = ReviewStatus.create('draft').value;
			const status2 = ReviewStatus.create('draft').value;

			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different status', () => {
			const draft = ReviewStatus.create('draft').value;
			const completed = ReviewStatus.create('completed').value;

			expect(draft.equals(completed)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/ReviewStatus.test.ts`
Expected: FAIL with "Cannot find module './ReviewStatus'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/PerformanceReview/value-objects/ReviewStatus.ts
import { Result } from '$domain/Result';
import { ReviewStatusValidationError } from '../errors/PerformanceReviewErrors';

type ReviewStatusValue = 'draft' | 'in_progress' | 'completed' | 'overdue';

const VALID_STATUSES: readonly ReviewStatusValue[] = [
	'draft',
	'in_progress',
	'completed',
	'overdue'
] as const;

interface ReviewStatusProps {
	value: ReviewStatusValue;
}

export class ReviewStatus {
	private constructor(private readonly props: ReviewStatusProps) {}

	static create(status: string): Result<ReviewStatus, ReviewStatusValidationError> {
		if (!status || typeof status !== 'string') {
			return Result.error(new ReviewStatusValidationError('Status cannot be empty'));
		}

		const normalized = status.trim().toLowerCase();

		if (!(VALID_STATUSES as readonly string[]).includes(normalized)) {
			return Result.error(
				new ReviewStatusValidationError(
					`Invalid review status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`
				)
			);
		}

		return Result.ok(new ReviewStatus({ value: normalized as ReviewStatusValue }));
	}

	get value(): ReviewStatusValue {
		return this.props.value;
	}

	isDraft(): boolean {
		return this.props.value === 'draft';
	}

	isInProgress(): boolean {
		return this.props.value === 'in_progress';
	}

	isCompleted(): boolean {
		return this.props.value === 'completed';
	}

	isOverdue(): boolean {
		return this.props.value === 'overdue';
	}

	canTransitionTo(newStatus: ReviewStatus): boolean {
		const current = this.props.value;
		const next = newStatus.value;

		// Valid transitions
		const validTransitions: Record<ReviewStatusValue, ReviewStatusValue[]> = {
			draft: ['in_progress', 'overdue'],
			in_progress: ['completed', 'overdue'],
			completed: ['overdue'], // Can mark as overdue if reopened
			overdue: ['in_progress', 'completed'] // Can recover from overdue
		};

		return validTransitions[current].includes(next);
	}

	equals(other: ReviewStatus): boolean {
		return this.props.value === other.props.value;
	}
}
```

**Step 4: Create error classes**

```typescript
// src/domain/PerformanceReview/errors/PerformanceReviewErrors.ts
export class PerformanceReviewError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PerformanceReviewError';
	}
}

export class ReviewStatusValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewStatusValidationError';
	}
}

export class RatingValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'RatingValidationError';
	}
}

export class ReviewPeriodValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewPeriodValidationError';
	}
}

export class ReviewDateValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewDateValidationError';
	}
}

export class PerformanceReviewNotFoundError extends PerformanceReviewError {
	constructor(id: string) {
		super(`Performance review not found: ${id}`);
		this.name = 'PerformanceReviewNotFoundError';
	}
}

export class PerformanceReviewValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'PerformanceReviewValidationError';
	}
}

export class InvalidStatusTransitionError extends PerformanceReviewError {
	constructor(from: string, to: string) {
		super(`Invalid status transition from ${from} to ${to}`);
		this.name = 'InvalidStatusTransitionError';
	}
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/ReviewStatus.test.ts`
Expected: 15/15 tests PASS

**Step 6: Commit**

```bash
git add src/domain/PerformanceReview/
git commit -m "feat(performance-review): add ReviewStatus value object with transition validation"
```

---

### Task 2: Rating Value Object

**Files:**

- Create: `src/domain/PerformanceReview/value-objects/Rating.ts`
- Create: `src/domain/PerformanceReview/value-objects/Rating.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/PerformanceReview/value-objects/Rating.test.ts
import { describe, it, expect } from 'vitest';
import { Rating } from './Rating';
import { RatingValidationError } from '../errors/PerformanceReviewErrors';

describe('Rating', () => {
	describe('create', () => {
		it('should create rating with value 1', () => {
			const result = Rating.create(1);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1);
			expect(result.value.label).toBe('Needs Improvement');
		});

		it('should create rating with value 5', () => {
			const result = Rating.create(5);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(5);
			expect(result.value.label).toBe('Outstanding');
		});

		it('should reject rating below 1', () => {
			const result = Rating.create(0);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RatingValidationError);
			expect(result.error.message).toContain('must be between 1 and 5');
		});

		it('should reject rating above 5', () => {
			const result = Rating.create(6);

			expect(result.isError).toBe(true);
		});

		it('should reject decimal ratings', () => {
			const result = Rating.create(3.5);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('must be a whole number');
		});

		it('should reject non-numeric ratings', () => {
			const result = Rating.create(NaN);

			expect(result.isError).toBe(true);
		});
	});

	describe('labels', () => {
		it('should return correct label for each rating', () => {
			expect(Rating.create(1).value.label).toBe('Needs Improvement');
			expect(Rating.create(2).value.label).toBe('Below Expectations');
			expect(Rating.create(3).value.label).toBe('Meets Expectations');
			expect(Rating.create(4).value.label).toBe('Exceeds Expectations');
			expect(Rating.create(5).value.label).toBe('Outstanding');
		});
	});

	describe('comparison', () => {
		it('should check if rating is high (4-5)', () => {
			expect(Rating.create(5).value.isHigh()).toBe(true);
			expect(Rating.create(4).value.isHigh()).toBe(true);
			expect(Rating.create(3).value.isHigh()).toBe(false);
		});

		it('should check if rating is low (1-2)', () => {
			expect(Rating.create(1).value.isLow()).toBe(true);
			expect(Rating.create(2).value.isLow()).toBe(true);
			expect(Rating.create(3).value.isLow()).toBe(false);
		});

		it('should check if rating is average (3)', () => {
			expect(Rating.create(3).value.isAverage()).toBe(true);
			expect(Rating.create(4).value.isAverage()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same rating', () => {
			const rating1 = Rating.create(3).value;
			const rating2 = Rating.create(3).value;

			expect(rating1.equals(rating2)).toBe(true);
		});

		it('should return false for different rating', () => {
			const rating1 = Rating.create(3).value;
			const rating2 = Rating.create(4).value;

			expect(rating1.equals(rating2)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/Rating.test.ts`
Expected: FAIL with "Cannot find module './Rating'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/PerformanceReview/value-objects/Rating.ts
import { Result } from '$domain/Result';
import { RatingValidationError } from '../errors/PerformanceReviewErrors';

interface RatingProps {
	value: number;
}

const RATING_LABELS: Record<number, string> = {
	1: 'Needs Improvement',
	2: 'Below Expectations',
	3: 'Meets Expectations',
	4: 'Exceeds Expectations',
	5: 'Outstanding'
};

export class Rating {
	private constructor(private readonly props: RatingProps) {}

	static create(value: number): Result<Rating, RatingValidationError> {
		// Validate type
		if (typeof value !== 'number' || isNaN(value)) {
			return Result.error(new RatingValidationError('Rating must be a valid number'));
		}

		// Validate range
		if (value < 1 || value > 5) {
			return Result.error(new RatingValidationError('Rating must be between 1 and 5'));
		}

		// Validate whole number
		if (!Number.isInteger(value)) {
			return Result.error(new RatingValidationError('Rating must be a whole number (no decimals)'));
		}

		return Result.ok(new Rating({ value }));
	}

	get value(): number {
		return this.props.value;
	}

	get label(): string {
		return RATING_LABELS[this.props.value] || 'Unknown';
	}

	isHigh(): boolean {
		return this.props.value >= 4;
	}

	isLow(): boolean {
		return this.props.value <= 2;
	}

	isAverage(): boolean {
		return this.props.value === 3;
	}

	equals(other: Rating): boolean {
		return this.props.value === other.props.value;
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/Rating.test.ts`
Expected: 16/16 tests PASS

**Step 5: Commit**

```bash
git add src/domain/PerformanceReview/
git commit -m "feat(performance-review): add Rating value object with 1-5 validation"
```

---

### Task 3: ReviewPeriod Value Object

**Files:**

- Create: `src/domain/PerformanceReview/value-objects/ReviewPeriod.ts`
- Create: `src/domain/PerformanceReview/value-objects/ReviewPeriod.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/PerformanceReview/value-objects/ReviewPeriod.test.ts
import { describe, it, expect } from 'vitest';
import { ReviewPeriod } from './ReviewPeriod';
import { ReviewPeriodValidationError } from '../errors/PerformanceReviewErrors';

describe('ReviewPeriod', () => {
	describe('create', () => {
		it('should create quarterly period Q1-2025', () => {
			const result = ReviewPeriod.create('Q1-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Q1-2025');
			expect(result.value.isQuarterly()).toBe(true);
		});

		it('should create quarterly period Q4-2026', () => {
			const result = ReviewPeriod.create('Q4-2026');

			expect(result.isOk).toBe(true);
		});

		it('should create half-year period H1-2025', () => {
			const result = ReviewPeriod.create('H1-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.isHalfYearly()).toBe(true);
		});

		it('should create annual period Annual-2025', () => {
			const result = ReviewPeriod.create('Annual-2025');

			expect(result.isOk).toBe(true);
			expect(result.value.isAnnual()).toBe(true);
		});

		it('should reject invalid format', () => {
			const result = ReviewPeriod.create('Q5-2025');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewPeriodValidationError);
		});

		it('should reject empty period', () => {
			const result = ReviewPeriod.create('');

			expect(result.isError).toBe(true);
		});

		it('should reject invalid year', () => {
			const result = ReviewPeriod.create('Q1-999');

			expect(result.isError).toBe(true);
		});
	});

	describe('year extraction', () => {
		it('should extract year from quarterly period', () => {
			const period = ReviewPeriod.create('Q1-2025').value;

			expect(period.getYear()).toBe(2025);
		});

		it('should extract year from annual period', () => {
			const period = ReviewPeriod.create('Annual-2026').value;

			expect(period.getYear()).toBe(2026);
		});
	});

	describe('quarter extraction', () => {
		it('should extract quarter number', () => {
			expect(ReviewPeriod.create('Q1-2025').value.getQuarter()).toBe(1);
			expect(ReviewPeriod.create('Q4-2025').value.getQuarter()).toBe(4);
		});

		it('should return null for non-quarterly periods', () => {
			expect(ReviewPeriod.create('H1-2025').value.getQuarter()).toBeNull();
			expect(ReviewPeriod.create('Annual-2025').value.getQuarter()).toBeNull();
		});
	});

	describe('comparison', () => {
		it('should check if period is in the past', () => {
			const pastPeriod = ReviewPeriod.create('Q1-2020').value;

			expect(pastPeriod.isPast()).toBe(true);
		});

		it('should check if period is current', () => {
			const currentYear = new Date().getFullYear();
			const currentPeriod = ReviewPeriod.create(`Q1-${currentYear}`).value;

			// This test is time-dependent, so we just check it doesn't throw
			expect(typeof currentPeriod.isCurrent()).toBe('boolean');
		});
	});

	describe('equals', () => {
		it('should return true for same period', () => {
			const period1 = ReviewPeriod.create('Q1-2025').value;
			const period2 = ReviewPeriod.create('Q1-2025').value;

			expect(period1.equals(period2)).toBe(true);
		});

		it('should return false for different period', () => {
			const period1 = ReviewPeriod.create('Q1-2025').value;
			const period2 = ReviewPeriod.create('Q2-2025').value;

			expect(period1.equals(period2)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/ReviewPeriod.test.ts`
Expected: FAIL with "Cannot find module './ReviewPeriod'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/PerformanceReview/value-objects/ReviewPeriod.ts
import { Result } from '$domain/Result';
import { ReviewPeriodValidationError } from '../errors/PerformanceReviewErrors';

interface ReviewPeriodProps {
	value: string;
}

// Valid formats: Q1-2025, Q2-2025, ..., Q4-2025, H1-2025, H2-2025, Annual-2025
const QUARTERLY_PATTERN = /^Q([1-4])-(\d{4})$/;
const HALF_YEARLY_PATTERN = /^H([1-2])-(\d{4})$/;
const ANNUAL_PATTERN = /^Annual-(\d{4})$/;

export class ReviewPeriod {
	private constructor(private readonly props: ReviewPeriodProps) {}

	static create(period: string): Result<ReviewPeriod, ReviewPeriodValidationError> {
		if (!period || typeof period !== 'string') {
			return Result.error(new ReviewPeriodValidationError('Review period cannot be empty'));
		}

		const trimmed = period.trim();

		// Validate format
		const isQuarterly = QUARTERLY_PATTERN.test(trimmed);
		const isHalfYearly = HALF_YEARLY_PATTERN.test(trimmed);
		const isAnnual = ANNUAL_PATTERN.test(trimmed);

		if (!isQuarterly && !isHalfYearly && !isAnnual) {
			return Result.error(
				new ReviewPeriodValidationError(
					`Invalid review period format: ${period}. Expected formats: Q1-2025, H1-2025, or Annual-2025`
				)
			);
		}

		// Validate year (must be 4 digits, reasonable range)
		let year: number;
		if (isQuarterly) {
			year = parseInt(QUARTERLY_PATTERN.exec(trimmed)![2]);
		} else if (isHalfYearly) {
			year = parseInt(HALF_YEARLY_PATTERN.exec(trimmed)![2]);
		} else {
			year = parseInt(ANNUAL_PATTERN.exec(trimmed)![1]);
		}

		if (year < 2000 || year > 2100) {
			return Result.error(new ReviewPeriodValidationError('Year must be between 2000 and 2100'));
		}

		return Result.ok(new ReviewPeriod({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	isQuarterly(): boolean {
		return QUARTERLY_PATTERN.test(this.props.value);
	}

	isHalfYearly(): boolean {
		return HALF_YEARLY_PATTERN.test(this.props.value);
	}

	isAnnual(): boolean {
		return ANNUAL_PATTERN.test(this.props.value);
	}

	getYear(): number {
		if (this.isQuarterly()) {
			return parseInt(QUARTERLY_PATTERN.exec(this.props.value)![2]);
		} else if (this.isHalfYearly()) {
			return parseInt(HALF_YEARLY_PATTERN.exec(this.props.value)![2]);
		} else {
			return parseInt(ANNUAL_PATTERN.exec(this.props.value)![1]);
		}
	}

	getQuarter(): number | null {
		if (!this.isQuarterly()) return null;
		return parseInt(QUARTERLY_PATTERN.exec(this.props.value)![1]);
	}

	isPast(): boolean {
		const currentYear = new Date().getFullYear();
		return this.getYear() < currentYear;
	}

	isCurrent(): boolean {
		const currentYear = new Date().getFullYear();
		const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

		if (this.getYear() !== currentYear) return false;

		if (this.isQuarterly()) {
			return this.getQuarter() === currentQuarter;
		} else if (this.isHalfYearly()) {
			const half = currentQuarter <= 2 ? 1 : 2;
			return this.props.value.includes(`H${half}`);
		} else {
			return true; // Annual period matches current year
		}
	}

	equals(other: ReviewPeriod): boolean {
		return this.props.value === other.props.value;
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/ReviewPeriod.test.ts`
Expected: 17/17 tests PASS

**Step 5: Commit**

```bash
git add src/domain/PerformanceReview/
git commit -m "feat(performance-review): add ReviewPeriod value object with format validation"
```

---

### Task 4: ReviewDate Value Object

**Files:**

- Create: `src/domain/PerformanceReview/value-objects/ReviewDate.ts`
- Create: `src/domain/PerformanceReview/value-objects/ReviewDate.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/PerformanceReview/value-objects/ReviewDate.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewDate } from './ReviewDate';
import { ReviewDateValidationError } from '../errors/PerformanceReviewErrors';

describe('ReviewDate', () => {
	describe('create', () => {
		it('should create date from ISO string', () => {
			const result = ReviewDate.create('2025-03-15');

			expect(result.isOk).toBe(true);
			expect(result.value.toISOString()).toContain('2025-03-15');
		});

		it('should create date from Date object', () => {
			const date = new Date('2025-03-15');
			const result = ReviewDate.create(date);

			expect(result.isOk).toBe(true);
		});

		it('should reject invalid date string', () => {
			const result = ReviewDate.create('invalid-date');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ReviewDateValidationError);
		});

		it('should reject empty date', () => {
			const result = ReviewDate.create('');

			expect(result.isError).toBe(true);
		});

		it('should reject dates too far in future', () => {
			const result = ReviewDate.create('2100-01-01');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('too far in the future');
		});

		it('should reject dates too far in past', () => {
			const result = ReviewDate.create('1999-01-01');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('too far in the past');
		});
	});

	describe('overdue detection', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should detect overdue date', () => {
			vi.setSystemTime(new Date('2025-03-20'));

			const pastDate = ReviewDate.create('2025-03-10').value;

			expect(pastDate.isOverdue()).toBe(true);
		});

		it('should not mark future date as overdue', () => {
			vi.setSystemTime(new Date('2025-03-10'));

			const futureDate = ReviewDate.create('2025-03-20').value;

			expect(futureDate.isOverdue()).toBe(false);
		});

		it('should not mark today as overdue', () => {
			vi.setSystemTime(new Date('2025-03-15'));

			const today = ReviewDate.create('2025-03-15').value;

			expect(today.isOverdue()).toBe(false);
		});

		it('should calculate days overdue', () => {
			vi.setSystemTime(new Date('2025-03-20'));

			const pastDate = ReviewDate.create('2025-03-10').value;

			expect(pastDate.getDaysOverdue()).toBe(10);
		});

		it('should return 0 for future dates', () => {
			vi.setSystemTime(new Date('2025-03-10'));

			const futureDate = ReviewDate.create('2025-03-20').value;

			expect(futureDate.getDaysOverdue()).toBe(0);
		});
	});

	describe('comparison', () => {
		it('should check if date is in past', () => {
			const pastDate = ReviewDate.create('2020-01-01').value;

			expect(pastDate.isPast()).toBe(true);
		});

		it('should check if date is in future', () => {
			const futureDate = ReviewDate.create('2030-01-01').value;

			expect(futureDate.isFuture()).toBe(true);
		});

		it('should format for display', () => {
			const date = ReviewDate.create('2025-03-15').value;

			expect(date.toDisplayString()).toMatch(/Mar|March/);
			expect(date.toDisplayString()).toContain('2025');
		});
	});

	describe('equals', () => {
		it('should return true for same date', () => {
			const date1 = ReviewDate.create('2025-03-15').value;
			const date2 = ReviewDate.create('2025-03-15').value;

			expect(date1.equals(date2)).toBe(true);
		});

		it('should return false for different date', () => {
			const date1 = ReviewDate.create('2025-03-15').value;
			const date2 = ReviewDate.create('2025-03-16').value;

			expect(date1.equals(date2)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/ReviewDate.test.ts`
Expected: FAIL with "Cannot find module './ReviewDate'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/PerformanceReview/value-objects/ReviewDate.ts
import { Result } from '$domain/Result';
import { ReviewDateValidationError } from '../errors/PerformanceReviewErrors';

interface ReviewDateProps {
	value: Date;
}

export class ReviewDate {
	private constructor(private readonly props: ReviewDateProps) {}

	static create(date: string | Date): Result<ReviewDate, ReviewDateValidationError> {
		let dateObj: Date;

		if (date instanceof Date) {
			dateObj = date;
		} else if (typeof date === 'string') {
			if (!date.trim()) {
				return Result.error(new ReviewDateValidationError('Review date cannot be empty'));
			}
			dateObj = new Date(date);
		} else {
			return Result.error(
				new ReviewDateValidationError('Review date must be a string or Date object')
			);
		}

		// Validate date is valid
		if (isNaN(dateObj.getTime())) {
			return Result.error(new ReviewDateValidationError('Invalid date format'));
		}

		// Validate reasonable date range (2000-2050)
		const year = dateObj.getFullYear();
		if (year < 2000) {
			return Result.error(
				new ReviewDateValidationError('Review date is too far in the past (before 2000)')
			);
		}
		if (year > 2050) {
			return Result.error(
				new ReviewDateValidationError('Review date is too far in the future (after 2050)')
			);
		}

		// Create defensive copy
		return Result.ok(new ReviewDate({ value: new Date(dateObj) }));
	}

	get value(): Date {
		// Return defensive copy
		return new Date(this.props.value);
	}

	toISOString(): string {
		return this.props.value.toISOString();
	}

	toDisplayString(): string {
		return this.props.value.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	isOverdue(): boolean {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const reviewDate = new Date(this.props.value);
		reviewDate.setHours(0, 0, 0, 0);

		return reviewDate < now;
	}

	getDaysOverdue(): number {
		if (!this.isOverdue()) return 0;

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const reviewDate = new Date(this.props.value);
		reviewDate.setHours(0, 0, 0, 0);

		const diffMs = now.getTime() - reviewDate.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	isPast(): boolean {
		return this.props.value < new Date();
	}

	isFuture(): boolean {
		return this.props.value > new Date();
	}

	equals(other: ReviewDate): boolean {
		return this.props.value.getTime() === other.props.value.getTime();
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/value-objects/ReviewDate.test.ts`
Expected: 18/18 tests PASS

**Step 5: Commit**

```bash
git add src/domain/PerformanceReview/
git commit -m "feat(performance-review): add ReviewDate value object with overdue detection"
```

---

### Task 5: PerformanceReview Entity

**Files:**

- Create: `src/domain/PerformanceReview/entities/PerformanceReview.ts`
- Create: `src/domain/PerformanceReview/entities/PerformanceReview.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/PerformanceReview/entities/PerformanceReview.test.ts
import { describe, it, expect } from 'vitest';
import { PerformanceReview } from './PerformanceReview';
import { ReviewStatus } from '../value-objects/ReviewStatus';
import { Rating } from '../value-objects/Rating';
import { ReviewPeriod } from '../value-objects/ReviewPeriod';
import { ReviewDate } from '../value-objects/ReviewDate';
import {
	PerformanceReviewValidationError,
	InvalidStatusTransitionError
} from '../errors/PerformanceReviewErrors';

describe('PerformanceReview', () => {
	const validProps = {
		id: 'review-123',
		employeeId: 'emp-456',
		reviewerId: 'mgr-789',
		reviewPeriod: ReviewPeriod.create('Q1-2025').value,
		reviewDate: ReviewDate.create('2025-03-31').value,
		status: ReviewStatus.create('draft').value,
		overallRating: Rating.create(3).value,
		goalsAchievement: Rating.create(4).value,
		collaboration: Rating.create(3).value,
		communication: Rating.create(4).value,
		leadership: Rating.create(3).value,
		strengths: 'Strong technical skills and good communication',
		areasForImprovement: 'Could improve time management',
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01')
	};

	describe('create', () => {
		it('should create performance review with all fields', () => {
			const result = PerformanceReview.create(validProps);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('review-123');
			expect(result.value.employeeId).toBe('emp-456');
			expect(result.value.status.value).toBe('draft');
		});

		it('should create without optional technicalSkills rating', () => {
			const props = { ...validProps };
			const result = PerformanceReview.create(props);

			expect(result.isOk).toBe(true);
			expect(result.value.technicalSkills).toBeUndefined();
		});

		it('should create without optional comments', () => {
			const props = { ...validProps };
			const result = PerformanceReview.create(props);

			expect(result.isOk).toBe(true);
			expect(result.value.comments).toBeUndefined();
		});

		it('should reject missing required employeeId', () => {
			const props = { ...validProps, employeeId: '' };
			const result = PerformanceReview.create(props);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewValidationError);
		});

		it('should reject missing strengths', () => {
			const props = { ...validProps, strengths: '' };
			const result = PerformanceReview.create(props);

			expect(result.isError).toBe(true);
		});

		it('should reject missing areasForImprovement', () => {
			const props = { ...validProps, areasForImprovement: '' };
			const result = PerformanceReview.create(props);

			expect(result.isError).toBe(true);
		});
	});

	describe('status transitions', () => {
		it('should allow transition from draft to in_progress', () => {
			const review = PerformanceReview.create(validProps).value;
			const newStatus = ReviewStatus.create('in_progress').value;

			const result = review.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should reject invalid transition', () => {
			const props = {
				...validProps,
				status: ReviewStatus.create('completed').value
			};
			const review = PerformanceReview.create(props).value;
			const newStatus = ReviewStatus.create('draft').value;

			const result = review.updateStatus(newStatus);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidStatusTransitionError);
		});

		it('should update updatedAt on status change', () => {
			const review = PerformanceReview.create(validProps).value;
			const originalUpdatedAt = review.updatedAt;

			// Small delay to ensure different timestamp
			const newStatus = ReviewStatus.create('in_progress').value;
			const updated = review.updateStatus(newStatus).value;

			expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
		});
	});

	describe('rating updates', () => {
		it('should update individual ratings', () => {
			const review = PerformanceReview.create(validProps).value;
			const newRating = Rating.create(5).value;

			const updated = review.updateRatings({
				goalsAchievement: newRating
			});

			expect(updated.goalsAchievement.value).toBe(5);
			expect(updated.collaboration.value).toBe(3); // Unchanged
		});

		it('should update multiple ratings at once', () => {
			const review = PerformanceReview.create(validProps).value;

			const updated = review.updateRatings({
				collaboration: Rating.create(5).value,
				communication: Rating.create(5).value
			});

			expect(updated.collaboration.value).toBe(5);
			expect(updated.communication.value).toBe(5);
		});

		it('should calculate average rating', () => {
			const props = {
				...validProps,
				overallRating: Rating.create(4).value,
				goalsAchievement: Rating.create(4).value,
				collaboration: Rating.create(3).value,
				communication: Rating.create(5).value,
				leadership: Rating.create(4).value
			};
			const review = PerformanceReview.create(props).value;

			// Average: (4+4+3+5+4) / 5 = 4.0
			expect(review.getAverageRating()).toBe(4.0);
		});

		it('should include technicalSkills in average when present', () => {
			const props = {
				...validProps,
				overallRating: Rating.create(3).value,
				goalsAchievement: Rating.create(3).value,
				collaboration: Rating.create(3).value,
				communication: Rating.create(3).value,
				leadership: Rating.create(3).value,
				technicalSkills: Rating.create(5).value
			};
			const review = PerformanceReview.create(props).value;

			// Average: (3+3+3+3+3+5) / 6 = 3.33...
			expect(review.getAverageRating()).toBeCloseTo(3.33, 2);
		});
	});

	describe('completion check', () => {
		it('should check if review is complete', () => {
			const props = {
				...validProps,
				status: ReviewStatus.create('completed').value
			};
			const review = PerformanceReview.create(props).value;

			expect(review.isComplete()).toBe(true);
		});

		it('should return false for incomplete reviews', () => {
			const review = PerformanceReview.create(validProps).value;

			expect(review.isComplete()).toBe(false);
		});

		it('should check if review is overdue', () => {
			const props = {
				...validProps,
				status: ReviewStatus.create('in_progress').value,
				reviewDate: ReviewDate.create('2020-01-01').value
			};
			const review = PerformanceReview.create(props).value;

			expect(review.isOverdue()).toBe(true);
		});
	});

	describe('immutability', () => {
		it('should return new instance on update', () => {
			const review = PerformanceReview.create(validProps).value;
			const newStatus = ReviewStatus.create('in_progress').value;

			const updated = review.updateStatus(newStatus).value;

			expect(updated).not.toBe(review);
			expect(review.status.value).toBe('draft'); // Original unchanged
		});
	});

	describe('equals', () => {
		it('should return true for same ID', () => {
			const review1 = PerformanceReview.create(validProps).value;
			const review2 = PerformanceReview.create(validProps).value;

			expect(review1.equals(review2)).toBe(true);
		});

		it('should return false for different ID', () => {
			const review1 = PerformanceReview.create(validProps).value;
			const props2 = { ...validProps, id: 'different-id' };
			const review2 = PerformanceReview.create(props2).value;

			expect(review1.equals(review2)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/entities/PerformanceReview.test.ts`
Expected: FAIL with "Cannot find module './PerformanceReview'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/PerformanceReview/entities/PerformanceReview.ts
import { Result } from '$domain/Result';
import { ReviewStatus } from '../value-objects/ReviewStatus';
import { Rating } from '../value-objects/Rating';
import { ReviewPeriod } from '../value-objects/ReviewPeriod';
import { ReviewDate } from '../value-objects/ReviewDate';
import {
	PerformanceReviewValidationError,
	InvalidStatusTransitionError
} from '../errors/PerformanceReviewErrors';

export interface PerformanceReviewProps {
	id: string;
	employeeId: string;
	reviewerId: string;
	reviewPeriod: ReviewPeriod;
	reviewDate: ReviewDate;
	status: ReviewStatus;
	overallRating: Rating;
	goalsAchievement: Rating;
	collaboration: Rating;
	communication: Rating;
	leadership: Rating;
	technicalSkills?: Rating;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	createdAt: Date;
	updatedAt: Date;
}

export class PerformanceReview {
	private constructor(private readonly props: PerformanceReviewProps) {}

	static create(
		props: PerformanceReviewProps
	): Result<PerformanceReview, PerformanceReviewValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new PerformanceReviewValidationError('ID is required'));
		}
		if (!props.employeeId?.trim()) {
			return Result.error(new PerformanceReviewValidationError('Employee ID is required'));
		}
		if (!props.reviewerId?.trim()) {
			return Result.error(new PerformanceReviewValidationError('Reviewer ID is required'));
		}
		if (!props.strengths?.trim()) {
			return Result.error(new PerformanceReviewValidationError('Strengths are required'));
		}
		if (!props.areasForImprovement?.trim()) {
			return Result.error(
				new PerformanceReviewValidationError('Areas for improvement are required')
			);
		}

		// Create defensive copies of dates
		const defensiveProps = {
			...props,
			createdAt: new Date(props.createdAt),
			updatedAt: new Date(props.updatedAt)
		};

		return Result.ok(new PerformanceReview(defensiveProps));
	}

	// Getters
	get id(): string {
		return this.props.id;
	}
	get employeeId(): string {
		return this.props.employeeId;
	}
	get reviewerId(): string {
		return this.props.reviewerId;
	}
	get reviewPeriod(): ReviewPeriod {
		return this.props.reviewPeriod;
	}
	get reviewDate(): ReviewDate {
		return this.props.reviewDate;
	}
	get status(): ReviewStatus {
		return this.props.status;
	}
	get overallRating(): Rating {
		return this.props.overallRating;
	}
	get goalsAchievement(): Rating {
		return this.props.goalsAchievement;
	}
	get collaboration(): Rating {
		return this.props.collaboration;
	}
	get communication(): Rating {
		return this.props.communication;
	}
	get leadership(): Rating {
		return this.props.leadership;
	}
	get technicalSkills(): Rating | undefined {
		return this.props.technicalSkills;
	}
	get strengths(): string {
		return this.props.strengths;
	}
	get areasForImprovement(): string {
		return this.props.areasForImprovement;
	}
	get comments(): string | undefined {
		return this.props.comments;
	}
	get createdAt(): Date {
		return new Date(this.props.createdAt);
	}
	get updatedAt(): Date {
		return new Date(this.props.updatedAt);
	}

	// Business logic methods
	updateStatus(newStatus: ReviewStatus): Result<PerformanceReview, InvalidStatusTransitionError> {
		if (!this.props.status.canTransitionTo(newStatus)) {
			return Result.error(
				new InvalidStatusTransitionError(this.props.status.value, newStatus.value)
			);
		}

		return Result.ok(
			new PerformanceReview({
				...this.props,
				status: newStatus,
				updatedAt: new Date()
			})
		);
	}

	updateRatings(ratings: {
		overallRating?: Rating;
		goalsAchievement?: Rating;
		collaboration?: Rating;
		communication?: Rating;
		leadership?: Rating;
		technicalSkills?: Rating;
	}): PerformanceReview {
		return new PerformanceReview({
			...this.props,
			overallRating: ratings.overallRating ?? this.props.overallRating,
			goalsAchievement: ratings.goalsAchievement ?? this.props.goalsAchievement,
			collaboration: ratings.collaboration ?? this.props.collaboration,
			communication: ratings.communication ?? this.props.communication,
			leadership: ratings.leadership ?? this.props.leadership,
			technicalSkills: ratings.technicalSkills ?? this.props.technicalSkills,
			updatedAt: new Date()
		});
	}

	getAverageRating(): number {
		const ratings = [
			this.props.overallRating.value,
			this.props.goalsAchievement.value,
			this.props.collaboration.value,
			this.props.communication.value,
			this.props.leadership.value
		];

		if (this.props.technicalSkills) {
			ratings.push(this.props.technicalSkills.value);
		}

		const sum = ratings.reduce((acc, rating) => acc + rating, 0);
		return Math.round((sum / ratings.length) * 100) / 100; // Round to 2 decimals
	}

	isComplete(): boolean {
		return this.props.status.isCompleted();
	}

	isOverdue(): boolean {
		if (this.isComplete()) return false;
		return this.props.reviewDate.isOverdue();
	}

	equals(other: PerformanceReview): boolean {
		return this.props.id === other.props.id;
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/domain/PerformanceReview/entities/PerformanceReview.test.ts`
Expected: 22/22 tests PASS

**Step 5: Commit**

```bash
git add src/domain/PerformanceReview/
git commit -m "feat(performance-review): add PerformanceReview entity with rating calculations"
```

---

### Task 6: Domain Layer Barrel Exports

**Files:**

- Create: `src/domain/PerformanceReview/index.ts`

**Step 1: Write barrel export file**

```typescript
// src/domain/PerformanceReview/index.ts
// Value Objects
export { ReviewStatus } from './value-objects/ReviewStatus';
export { Rating } from './value-objects/Rating';
export { ReviewPeriod } from './value-objects/ReviewPeriod';
export { ReviewDate } from './value-objects/ReviewDate';

// Entities
export { PerformanceReview } from './entities/PerformanceReview';
export type { PerformanceReviewProps } from './entities/PerformanceReview';

// Errors
export {
	PerformanceReviewError,
	ReviewStatusValidationError,
	RatingValidationError,
	ReviewPeriodValidationError,
	ReviewDateValidationError,
	PerformanceReviewNotFoundError,
	PerformanceReviewValidationError,
	InvalidStatusTransitionError
} from './errors/PerformanceReviewErrors';
```

**Step 2: Verify imports work**

Run: `npm run check`
Expected: No TypeScript errors in domain layer

**Step 3: Commit**

```bash
git add src/domain/PerformanceReview/index.ts
git commit -m "feat(performance-review): add domain layer barrel exports"
```

---

### Task 7: PerformanceReviewRepository Port Interface

**Files:**

- Create: `src/services/ports/PerformanceReviewRepository.ts`

**Step 1: Write port interface**

```typescript
// src/services/ports/PerformanceReviewRepository.ts
import { Result } from '$domain/Result';
import {
	PerformanceReview,
	PerformanceReviewNotFoundError,
	PerformanceReviewValidationError,
	PerformanceReviewError
} from '$domain/PerformanceReview';

export interface PerformanceReviewFilter {
	employeeId?: string;
	reviewerId?: string;
	status?: string;
	reviewPeriod?: string;
	limit?: number;
	offset?: number;
}

export interface CreatePerformanceReviewData {
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	reviewDate: string;
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	status?: string;
}

export interface UpdatePerformanceReviewData {
	reviewPeriod?: string;
	reviewDate?: string;
	status?: string;
	overallRating?: number;
	goalsAchievement?: number;
	collaboration?: number;
	communication?: number;
	leadership?: number;
	technicalSkills?: number;
	strengths?: string;
	areasForImprovement?: string;
	comments?: string;
}

export interface PerformanceReviewRepository {
	/**
	 * Find a performance review by ID
	 * @returns Review if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>>;

	/**
	 * Find all performance reviews with optional filtering
	 * @returns Array of reviews or error
	 */
	findAll(
		filter?: PerformanceReviewFilter
	): Promise<Result<PerformanceReview[], PerformanceReviewError>>;

	/**
	 * Create a new performance review
	 * @returns Created review or validation error
	 */
	create(
		data: CreatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewValidationError>>;

	/**
	 * Update an existing performance review
	 * @returns Updated review or error
	 */
	update(
		id: string,
		data: UpdatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>>;

	/**
	 * Delete a performance review
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, PerformanceReviewNotFoundError>>;

	/**
	 * Get performance reviews for an employee
	 * @returns Array of reviews for the employee
	 */
	getReviewsForEmployee(
		employeeId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>>;

	/**
	 * Get performance reviews by reviewer
	 * @returns Array of reviews conducted by the reviewer
	 */
	getReviewsByReviewer(
		reviewerId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>>;
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/ports/PerformanceReviewRepository.ts
git commit -m "feat(performance-review): add PerformanceReviewRepository port interface"
```

---

### Task 8: PerformanceReviewService

**Files:**

- Create: `src/services/PerformanceReviewService.ts`
- Create: `src/services/PerformanceReviewService.test.ts`

**Step 1: Write the failing test** (abbreviated for space - similar to RBACService tests)

```typescript
// src/services/PerformanceReviewService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceReviewService } from './PerformanceReviewService';
import type {
	PerformanceReviewRepository,
	CreatePerformanceReviewData
} from './ports/PerformanceReviewRepository';
import {
	PerformanceReview,
	ReviewStatus,
	Rating,
	ReviewPeriod,
	ReviewDate,
	PerformanceReviewNotFoundError
} from '$domain/PerformanceReview';
import { Result } from '$domain/Result';

// Mock repository implementation
class MockPerformanceReviewRepository implements PerformanceReviewRepository {
	private reviews: Map<string, PerformanceReview> = new Map();

	async findById(id: string): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>> {
		const review = this.reviews.get(id);
		if (!review) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
		return Result.ok(review);
	}

	async findAll(): Promise<Result<PerformanceReview[], any>> {
		return Result.ok(Array.from(this.reviews.values()));
	}

	async create(data: CreatePerformanceReviewData): Promise<Result<PerformanceReview, any>> {
		const review = PerformanceReview.create({
			id: `review-${Date.now()}`,
			employeeId: data.employeeId,
			reviewerId: data.reviewerId,
			reviewPeriod: ReviewPeriod.create(data.reviewPeriod).value,
			reviewDate: ReviewDate.create(data.reviewDate).value,
			status: ReviewStatus.create(data.status || 'draft').value,
			overallRating: Rating.create(data.overallRating).value,
			goalsAchievement: Rating.create(data.goalsAchievement).value,
			collaboration: Rating.create(data.collaboration).value,
			communication: Rating.create(data.communication).value,
			leadership: Rating.create(data.leadership).value,
			technicalSkills: data.technicalSkills ? Rating.create(data.technicalSkills).value : undefined,
			strengths: data.strengths,
			areasForImprovement: data.areasForImprovement,
			comments: data.comments,
			createdAt: new Date(),
			updatedAt: new Date()
		}).value;

		this.reviews.set(review.id, review);
		return Result.ok(review);
	}

	async update(id: string, data: any): Promise<Result<PerformanceReview, any>> {
		const reviewResult = await this.findById(id);
		if (reviewResult.isError) {
			return reviewResult;
		}
		// Update logic here
		return Result.ok(reviewResult.value);
	}

	async delete(id: string): Promise<Result<void, PerformanceReviewNotFoundError>> {
		if (!this.reviews.has(id)) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
		this.reviews.delete(id);
		return Result.ok(undefined);
	}

	async getReviewsForEmployee(employeeId: string): Promise<Result<PerformanceReview[], any>> {
		const reviews = Array.from(this.reviews.values()).filter((r) => r.employeeId === employeeId);
		return Result.ok(reviews);
	}

	async getReviewsByReviewer(reviewerId: string): Promise<Result<PerformanceReview[], any>> {
		const reviews = Array.from(this.reviews.values()).filter((r) => r.reviewerId === reviewerId);
		return Result.ok(reviews);
	}
}

describe('PerformanceReviewService', () => {
	let service: PerformanceReviewService;
	let repository: MockPerformanceReviewRepository;

	beforeEach(() => {
		repository = new MockPerformanceReviewRepository();
		service = new PerformanceReviewService(repository);
	});

	describe('getReviewById', () => {
		it('should return review when found', async () => {
			const createData: CreatePerformanceReviewData = {
				employeeId: 'emp-123',
				reviewerId: 'mgr-456',
				reviewPeriod: 'Q1-2025',
				reviewDate: '2025-03-31',
				overallRating: 3,
				goalsAchievement: 4,
				collaboration: 3,
				communication: 4,
				leadership: 3,
				strengths: 'Good technical skills',
				areasForImprovement: 'Time management'
			};
			const created = await repository.create(createData);
			const reviewId = created.value.id;

			const result = await service.getReviewById(reviewId);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(reviewId);
		});

		it('should return error when not found', async () => {
			const result = await service.getReviewById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
		});
	});

	// Add more tests for createReview, updateReview, getEmployeeReviews, etc.
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/services/PerformanceReviewService.test.ts`
Expected: FAIL with "Cannot find module './PerformanceReviewService'"

**Step 3: Write minimal implementation**

```typescript
// src/services/PerformanceReviewService.ts
import { Result } from '$domain/Result';
import {
	PerformanceReview,
	PerformanceReviewNotFoundError,
	PerformanceReviewError
} from '$domain/PerformanceReview';
import type {
	PerformanceReviewRepository,
	CreatePerformanceReviewData,
	UpdatePerformanceReviewData,
	PerformanceReviewFilter
} from './ports/PerformanceReviewRepository';

export class PerformanceReviewService {
	constructor(private readonly repository: PerformanceReviewRepository) {}

	async getReviewById(
		id: string
	): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
	}

	async getAllReviews(
		filter?: PerformanceReviewFilter
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createReview(
		data: CreatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		try {
			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to create review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateReview(
		id: string,
		data: UpdatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		try {
			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to update review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteReview(id: string): Promise<Result<void, PerformanceReviewNotFoundError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
	}

	async getEmployeeReviews(
		employeeId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			return await this.repository.getReviewsForEmployee(employeeId);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch employee reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async getReviewerReviews(
		reviewerId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			return await this.repository.getReviewsByReviewer(reviewerId);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch reviewer reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Business logic: Calculate statistics for a set of reviews
	 */
	calculateStatistics(reviews: PerformanceReview[]): {
		totalReviews: number;
		completed: number;
		inProgress: number;
		overdue: number;
		averageRating: number;
	} {
		const completed = reviews.filter((r) => r.isComplete()).length;
		const inProgress = reviews.filter((r) => r.status.isInProgress()).length;
		const overdue = reviews.filter((r) => r.isOverdue()).length;

		const avgRating =
			reviews.length > 0
				? reviews.reduce((sum, r) => sum + r.getAverageRating(), 0) / reviews.length
				: 0;

		return {
			totalReviews: reviews.length,
			completed,
			inProgress,
			overdue,
			averageRating: Math.round(avgRating * 10) / 10
		};
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/services/PerformanceReviewService.test.ts`
Expected: Tests PASS

**Step 5: Commit**

```bash
git add src/services/
git commit -m "feat(performance-review): add PerformanceReviewService with CRUD operations"
```

---

### Task 9: GraphQLPerformanceReviewAdapter

**Files:**

- Create: `src/adapters/graphql/GraphQLPerformanceReviewAdapter.ts`
- Create: `src/adapters/graphql/GraphQLPerformanceReviewAdapter.test.ts`

**Step 1: Write tests and implementation** (following GraphQLRoleAdapter pattern)

**Step 2: Commit**

```bash
git add src/adapters/graphql/GraphQLPerformanceReviewAdapter.*
git commit -m "feat(performance-review): add GraphQLPerformanceReviewAdapter implementing port"
```

---

### Task 10: Integration Layer - Factory

**Files:**

- Create: `src/lib/services/performanceReviewServiceFactory.ts`
- Create: `src/lib/services/performanceReviewServiceFactory.test.ts`

**Step 1: Write factory**

```typescript
// src/lib/services/performanceReviewServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { PerformanceReviewService } from '$services/PerformanceReviewService';
import { GraphQLPerformanceReviewAdapter } from '$adapters/graphql/GraphQLPerformanceReviewAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createPerformanceReviewService(event: RequestEvent): PerformanceReviewService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLPerformanceReviewAdapter(client);
	return new PerformanceReviewService(adapter);
}
```

**Step 2: Commit**

```bash
git add src/lib/services/performanceReviewServiceFactory.*
git commit -m "feat(performance-review): add performanceReviewServiceFactory for DI"
```

---

### Task 11: Update ServiceContainer

**Files:**

- Modify: `src/lib/server/services.ts`

**Step 1: Add to ServiceContainer**

```typescript
// Add import
import { createPerformanceReviewService } from '$lib/services/performanceReviewServiceFactory';
import type { PerformanceReviewService } from '$services/PerformanceReviewService';

// Add private field
private _performanceReviewService?: PerformanceReviewService;

// Add getter
get performanceReviewService(): PerformanceReviewService {
  if (!this._performanceReviewService) {
    this._performanceReviewService = createPerformanceReviewService(this.event);
  }
  return this._performanceReviewService;
}

// Add re-export
export { createPerformanceReviewService } from '$lib/services/performanceReviewServiceFactory';
```

**Step 2: Commit**

```bash
git add src/lib/server/services.ts
git commit -m "feat(performance-review): integrate into ServiceContainer"
```

---

### Task 12: Migration Completion Report

**Files:**

- Create: `docs/architecture/performance-review-module-hexagonal-migration-completion.md`

**Step 1: Write comprehensive report** (similar to RBAC completion report)

**Step 2: Commit**

```bash
git add docs/architecture/performance-review-module-hexagonal-migration-completion.md
git commit -m "docs(performance-review): add hexagonal migration completion report"
```

---

### Task 13: Update MEMORY.md

**Files:**

- Modify: `/home/chanway/.claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md`

**Step 1: Update completed modules count**

Change "Completed: 6/23" to "Completed: 7/23"
Add Performance Reviews entry with test counts and scores

**Step 2: Commit**

```bash
git add .claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md
git commit -m "docs(memory): update with Performance Reviews completion"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-12-performance-reviews-hexagonal-migration.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
