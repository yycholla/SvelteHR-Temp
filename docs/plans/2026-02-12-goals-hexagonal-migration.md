# Goals Module Hexagonal Architecture Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate Goals module from GraphQL-centric architecture to hexagonal/clean architecture with domain-driven design

**Architecture:** Create domain layer (7 value objects + entity), service layer (port + service), adapter layer (GraphQL), and integrate via factory + ServiceContainer. Follow established patterns from Employee (95/100), Performance Reviews (90/100), Tasks (90/100), and RBAC (90/100) modules.

**Tech Stack:** TypeScript 5, Vitest 3.2, Result<T, E> pattern, URQL GraphQL client

**Current State:**

- GraphQL operations: `src/lib/graphql/goals/` (1050 LOC)
- Current score: ~15/100
- Target score: 90/100
- Estimated tests: 140-160 tests

---

## Task 1: GoalStatus Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/GoalStatus.ts`
- Create: `src/domain/Goal/value-objects/GoalStatus.test.ts`

**Requirements:**

- 4 valid statuses: 'not_started', 'in_progress', 'completed', 'cancelled'
- State transition validation (not_started → in_progress → completed/cancelled)
- Immutable value object with `equals()` method
- Minimum 24 tests (validation, transitions, helpers, normalization)

**Implementation:**

```typescript
// src/domain/Goal/value-objects/GoalStatus.ts
import { Result } from '$domain/Result';
import { GoalStatusValidationError } from '../errors/GoalErrors';

type GoalStatusValue = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

const VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'cancelled'] as const;

interface GoalStatusProps {
	value: GoalStatusValue;
}

export class GoalStatus {
	private constructor(private readonly props: GoalStatusProps) {}

	static create(status: string): Result<GoalStatus, GoalStatusValidationError> {
		const trimmed = status.trim();
		if (!trimmed) {
			return Result.error(new GoalStatusValidationError('Goal status cannot be empty'));
		}

		const normalized = trimmed.toLowerCase().replace(/-/g, '_');
		if (!(VALID_STATUSES as readonly string[]).includes(normalized)) {
			return Result.error(
				new GoalStatusValidationError(
					`Invalid goal status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`
				)
			);
		}

		return Result.ok(new GoalStatus({ value: normalized as GoalStatusValue }));
	}

	get value(): GoalStatusValue {
		return this.props.value;
	}

	// Status checks
	isNotStarted(): boolean {
		return this.props.value === 'not_started';
	}

	isInProgress(): boolean {
		return this.props.value === 'in_progress';
	}

	isCompleted(): boolean {
		return this.props.value === 'completed';
	}

	isCancelled(): boolean {
		return this.props.value === 'cancelled';
	}

	isActive(): boolean {
		return this.props.value === 'in_progress';
	}

	isTerminal(): boolean {
		return this.props.value === 'completed' || this.props.value === 'cancelled';
	}

	// State transition validation
	canTransitionTo(newStatus: GoalStatus): boolean {
		const current = this.props.value;
		const next = newStatus.props.value;

		const validTransitions: Record<GoalStatusValue, GoalStatusValue[]> = {
			not_started: ['in_progress', 'cancelled'],
			in_progress: ['completed', 'cancelled', 'not_started'],
			completed: [],
			cancelled: ['not_started', 'in_progress']
		};

		return validTransitions[current].includes(next);
	}

	equals(other: GoalStatus): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Tests (24 minimum):**

```typescript
// src/domain/Goal/value-objects/GoalStatus.test.ts
import { describe, it, expect } from 'vitest';
import { GoalStatus } from './GoalStatus';
import { GoalStatusValidationError } from '../errors/GoalErrors';

describe('GoalStatus', () => {
	describe('create', () => {
		it('should create valid not_started status', () => {
			const result = GoalStatus.create('not_started');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('not_started');
		});

		it('should create valid in_progress status', () => {
			const result = GoalStatus.create('in_progress');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should create valid completed status', () => {
			const result = GoalStatus.create('completed');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
		});

		it('should create valid cancelled status', () => {
			const result = GoalStatus.create('cancelled');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('cancelled');
		});

		it('should normalize uppercase status', () => {
			const result = GoalStatus.create('IN_PROGRESS');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should normalize hyphenated status', () => {
			const result = GoalStatus.create('in-progress');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});

		it('should trim whitespace', () => {
			const result = GoalStatus.create('  not_started  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('not_started');
		});

		it('should reject empty string', () => {
			const result = GoalStatus.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalStatusValidationError);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should reject whitespace-only string', () => {
			const result = GoalStatus.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalStatusValidationError);
		});

		it('should reject invalid status', () => {
			const result = GoalStatus.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalStatusValidationError);
			expect(result.error.message).toContain('Invalid goal status');
		});
	});

	describe('status checks', () => {
		it('should identify not_started status', () => {
			const status = GoalStatus.create('not_started').value;
			expect(status.isNotStarted()).toBe(true);
			expect(status.isInProgress()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
		});

		it('should identify in_progress status', () => {
			const status = GoalStatus.create('in_progress').value;
			expect(status.isNotStarted()).toBe(false);
			expect(status.isInProgress()).toBe(true);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
		});

		it('should identify completed status', () => {
			const status = GoalStatus.create('completed').value;
			expect(status.isNotStarted()).toBe(false);
			expect(status.isInProgress()).toBe(false);
			expect(status.isCompleted()).toBe(true);
			expect(status.isCancelled()).toBe(false);
		});

		it('should identify cancelled status', () => {
			const status = GoalStatus.create('cancelled').value;
			expect(status.isNotStarted()).toBe(false);
			expect(status.isInProgress()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(true);
		});

		it('should identify active status', () => {
			const inProgress = GoalStatus.create('in_progress').value;
			expect(inProgress.isActive()).toBe(true);

			const notStarted = GoalStatus.create('not_started').value;
			expect(notStarted.isActive()).toBe(false);
		});

		it('should identify terminal statuses', () => {
			const completed = GoalStatus.create('completed').value;
			expect(completed.isTerminal()).toBe(true);

			const cancelled = GoalStatus.create('cancelled').value;
			expect(cancelled.isTerminal()).toBe(true);

			const inProgress = GoalStatus.create('in_progress').value;
			expect(inProgress.isTerminal()).toBe(false);
		});
	});

	describe('canTransitionTo', () => {
		it('should allow not_started to in_progress', () => {
			const from = GoalStatus.create('not_started').value;
			const to = GoalStatus.create('in_progress').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow not_started to cancelled', () => {
			const from = GoalStatus.create('not_started').value;
			const to = GoalStatus.create('cancelled').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow in_progress to completed', () => {
			const from = GoalStatus.create('in_progress').value;
			const to = GoalStatus.create('completed').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow in_progress to cancelled', () => {
			const from = GoalStatus.create('in_progress').value;
			const to = GoalStatus.create('cancelled').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow in_progress to not_started (restart)', () => {
			const from = GoalStatus.create('in_progress').value;
			const to = GoalStatus.create('not_started').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should allow cancelled to not_started (reopen)', () => {
			const from = GoalStatus.create('cancelled').value;
			const to = GoalStatus.create('not_started').value;
			expect(from.canTransitionTo(to)).toBe(true);
		});

		it('should not allow completed to any status', () => {
			const from = GoalStatus.create('completed').value;
			const toNotStarted = GoalStatus.create('not_started').value;
			const toInProgress = GoalStatus.create('in_progress').value;
			const toCancelled = GoalStatus.create('cancelled').value;

			expect(from.canTransitionTo(toNotStarted)).toBe(false);
			expect(from.canTransitionTo(toInProgress)).toBe(false);
			expect(from.canTransitionTo(toCancelled)).toBe(false);
		});

		it('should not allow not_started to completed', () => {
			const from = GoalStatus.create('not_started').value;
			const to = GoalStatus.create('completed').value;
			expect(from.canTransitionTo(to)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same status', () => {
			const status1 = GoalStatus.create('in_progress').value;
			const status2 = GoalStatus.create('in_progress').value;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different statuses', () => {
			const status1 = GoalStatus.create('in_progress').value;
			const status2 = GoalStatus.create('completed').value;
			expect(status1.equals(status2)).toBe(false);
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/GoalStatus.*
git commit -m "feat(goal): add GoalStatus value object with state transitions"
```

---

## Task 2: GoalPriority Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/GoalPriority.ts`
- Create: `src/domain/Goal/value-objects/GoalPriority.test.ts`

**Requirements:**

- 3 valid priorities: 'low', 'medium', 'high'
- Priority comparison methods
- Minimum 18 tests

**Implementation:**

```typescript
// src/domain/Goal/value-objects/GoalPriority.ts
import { Result } from '$domain/Result';
import { GoalPriorityValidationError } from '../errors/GoalErrors';

type GoalPriorityValue = 'low' | 'medium' | 'high';

const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

const PRIORITY_LEVELS: Record<GoalPriorityValue, number> = {
	low: 1,
	medium: 2,
	high: 3
};

interface GoalPriorityProps {
	value: GoalPriorityValue;
}

export class GoalPriority {
	private constructor(private readonly props: GoalPriorityProps) {}

	static create(priority: string): Result<GoalPriority, GoalPriorityValidationError> {
		const trimmed = priority.trim();
		if (!trimmed) {
			return Result.error(new GoalPriorityValidationError('Goal priority cannot be empty'));
		}

		const normalized = trimmed.toLowerCase();
		if (!(VALID_PRIORITIES as readonly string[]).includes(normalized)) {
			return Result.error(
				new GoalPriorityValidationError(
					`Invalid goal priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`
				)
			);
		}

		return Result.ok(new GoalPriority({ value: normalized as GoalPriorityValue }));
	}

	get value(): GoalPriorityValue {
		return this.props.value;
	}

	get level(): number {
		return PRIORITY_LEVELS[this.props.value];
	}

	isLow(): boolean {
		return this.props.value === 'low';
	}

	isMedium(): boolean {
		return this.props.value === 'medium';
	}

	isHigh(): boolean {
		return this.props.value === 'high';
	}

	isHigherThan(other: GoalPriority): boolean {
		return this.level > other.level;
	}

	isLowerThan(other: GoalPriority): boolean {
		return this.level < other.level;
	}

	equals(other: GoalPriority): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Tests (18 minimum):**

```typescript
// src/domain/Goal/value-objects/GoalPriority.test.ts
import { describe, it, expect } from 'vitest';
import { GoalPriority } from './GoalPriority';
import { GoalPriorityValidationError } from '../errors/GoalErrors';

describe('GoalPriority', () => {
	describe('create', () => {
		it('should create valid low priority', () => {
			const result = GoalPriority.create('low');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('low');
		});

		it('should create valid medium priority', () => {
			const result = GoalPriority.create('medium');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('medium');
		});

		it('should create valid high priority', () => {
			const result = GoalPriority.create('high');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('high');
		});

		it('should normalize uppercase priority', () => {
			const result = GoalPriority.create('HIGH');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('high');
		});

		it('should trim whitespace', () => {
			const result = GoalPriority.create('  low  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('low');
		});

		it('should reject empty string', () => {
			const result = GoalPriority.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalPriorityValidationError);
		});

		it('should reject invalid priority', () => {
			const result = GoalPriority.create('urgent');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalPriorityValidationError);
		});
	});

	describe('priority checks', () => {
		it('should identify low priority', () => {
			const priority = GoalPriority.create('low').value;
			expect(priority.isLow()).toBe(true);
			expect(priority.isMedium()).toBe(false);
			expect(priority.isHigh()).toBe(false);
		});

		it('should identify medium priority', () => {
			const priority = GoalPriority.create('medium').value;
			expect(priority.isLow()).toBe(false);
			expect(priority.isMedium()).toBe(true);
			expect(priority.isHigh()).toBe(false);
		});

		it('should identify high priority', () => {
			const priority = GoalPriority.create('high').value;
			expect(priority.isLow()).toBe(false);
			expect(priority.isMedium()).toBe(false);
			expect(priority.isHigh()).toBe(true);
		});
	});

	describe('level', () => {
		it('should return correct level for low', () => {
			const priority = GoalPriority.create('low').value;
			expect(priority.level).toBe(1);
		});

		it('should return correct level for medium', () => {
			const priority = GoalPriority.create('medium').value;
			expect(priority.level).toBe(2);
		});

		it('should return correct level for high', () => {
			const priority = GoalPriority.create('high').value;
			expect(priority.level).toBe(3);
		});
	});

	describe('comparison', () => {
		it('should identify high is higher than medium', () => {
			const high = GoalPriority.create('high').value;
			const medium = GoalPriority.create('medium').value;
			expect(high.isHigherThan(medium)).toBe(true);
		});

		it('should identify medium is higher than low', () => {
			const medium = GoalPriority.create('medium').value;
			const low = GoalPriority.create('low').value;
			expect(medium.isHigherThan(low)).toBe(true);
		});

		it('should identify low is lower than high', () => {
			const low = GoalPriority.create('low').value;
			const high = GoalPriority.create('high').value;
			expect(low.isLowerThan(high)).toBe(true);
		});

		it('should return false for same priority comparison', () => {
			const medium1 = GoalPriority.create('medium').value;
			const medium2 = GoalPriority.create('medium').value;
			expect(medium1.isHigherThan(medium2)).toBe(false);
			expect(medium1.isLowerThan(medium2)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same priority', () => {
			const priority1 = GoalPriority.create('medium').value;
			const priority2 = GoalPriority.create('medium').value;
			expect(priority1.equals(priority2)).toBe(true);
		});

		it('should return false for different priorities', () => {
			const priority1 = GoalPriority.create('low').value;
			const priority2 = GoalPriority.create('high').value;
			expect(priority1.equals(priority2)).toBe(false);
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/GoalPriority.*
git commit -m "feat(goal): add GoalPriority value object with comparison"
```

---

## Task 3: GoalTitle Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/GoalTitle.ts`
- Create: `src/domain/Goal/value-objects/GoalTitle.test.ts`

**Requirements:**

- Length: 1-200 characters
- Trimmed, non-empty
- Minimum 16 tests

**Implementation:**

```typescript
// src/domain/Goal/value-objects/GoalTitle.ts
import { Result } from '$domain/Result';
import { GoalTitleValidationError } from '../errors/GoalErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 200;

interface GoalTitleProps {
	value: string;
}

export class GoalTitle {
	private constructor(private readonly props: GoalTitleProps) {}

	static create(title: string): Result<GoalTitle, GoalTitleValidationError> {
		const trimmed = title.trim();

		if (!trimmed) {
			return Result.error(new GoalTitleValidationError('Goal title cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new GoalTitleValidationError(`Goal title must be at least ${MIN_LENGTH} character`)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new GoalTitleValidationError(`Goal title cannot exceed ${MAX_LENGTH} characters`)
			);
		}

		return Result.ok(new GoalTitle({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	get length(): number {
		return this.props.value.length;
	}

	equals(other: GoalTitle): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Tests (16 minimum):**

```typescript
// src/domain/Goal/value-objects/GoalTitle.test.ts
import { describe, it, expect } from 'vitest';
import { GoalTitle } from './GoalTitle';
import { GoalTitleValidationError } from '../errors/GoalErrors';

describe('GoalTitle', () => {
	describe('create', () => {
		it('should create valid title', () => {
			const result = GoalTitle.create('Improve code quality');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Improve code quality');
		});

		it('should trim whitespace', () => {
			const result = GoalTitle.create('  Complete training  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Complete training');
		});

		it('should reject empty string', () => {
			const result = GoalTitle.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalTitleValidationError);
		});

		it('should reject whitespace-only string', () => {
			const result = GoalTitle.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalTitleValidationError);
		});

		it('should accept title at minimum length', () => {
			const result = GoalTitle.create('A');
			expect(result.isOk).toBe(true);
		});

		it('should accept title at maximum length', () => {
			const title = 'A'.repeat(200);
			const result = GoalTitle.create(title);
			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(200);
		});

		it('should reject title exceeding maximum length', () => {
			const title = 'A'.repeat(201);
			const result = GoalTitle.create(title);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalTitleValidationError);
			expect(result.error.message).toContain('cannot exceed 200 characters');
		});

		it('should handle special characters', () => {
			const result = GoalTitle.create('Increase sales by 25% in Q4');
			expect(result.isOk).toBe(true);
		});

		it('should handle unicode characters', () => {
			const result = GoalTitle.create('Améliorer la qualité 🎯');
			expect(result.isOk).toBe(true);
		});
	});

	describe('length', () => {
		it('should return correct length', () => {
			const title = GoalTitle.create('Test goal').value;
			expect(title.length).toBe(9);
		});

		it('should return length after trimming', () => {
			const title = GoalTitle.create('  Test  ').value;
			expect(title.length).toBe(4);
		});
	});

	describe('equals', () => {
		it('should return true for identical titles', () => {
			const title1 = GoalTitle.create('Complete project').value;
			const title2 = GoalTitle.create('Complete project').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different titles', () => {
			const title1 = GoalTitle.create('Complete project').value;
			const title2 = GoalTitle.create('Start project').value;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should handle trimmed comparison', () => {
			const title1 = GoalTitle.create('Test').value;
			const title2 = GoalTitle.create('  Test  ').value;
			expect(title1.equals(title2)).toBe(true);
		});
	});

	describe('toString', () => {
		it('should return string value', () => {
			const title = GoalTitle.create('Test goal').value;
			expect(title.toString()).toBe('Test goal');
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/GoalTitle.*
git commit -m "feat(goal): add GoalTitle value object with validation"
```

---

## Task 4: GoalDescription Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/GoalDescription.ts`
- Create: `src/domain/Goal/value-objects/GoalDescription.test.ts`

**Requirements:**

- Length: 0-2000 characters (optional, can be empty)
- Trimmed
- Minimum 14 tests

**Implementation:**

```typescript
// src/domain/Goal/value-objects/GoalDescription.ts
import { Result } from '$domain/Result';
import { GoalDescriptionValidationError } from '../errors/GoalErrors';

const MAX_LENGTH = 2000;

interface GoalDescriptionProps {
	value: string;
}

export class GoalDescription {
	private constructor(private readonly props: GoalDescriptionProps) {}

	static create(description: string): Result<GoalDescription, GoalDescriptionValidationError> {
		const trimmed = description.trim();

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new GoalDescriptionValidationError(
					`Goal description cannot exceed ${MAX_LENGTH} characters`
				)
			);
		}

		return Result.ok(new GoalDescription({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	get length(): number {
		return this.props.value.length;
	}

	isEmpty(): boolean {
		return this.props.value.length === 0;
	}

	equals(other: GoalDescription): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Tests (14 minimum):**

```typescript
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
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/GoalDescription.*
git commit -m "feat(goal): add GoalDescription value object"
```

---

## Task 5: TargetDate Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/TargetDate.ts`
- Create: `src/domain/Goal/value-objects/TargetDate.test.ts`

**Requirements:**

- ISO 8601 date string validation
- Year range: 2000-2100
- Overdue detection logic
- Defensive date copying
- Minimum 20 tests

**Implementation:**

```typescript
// src/domain/Goal/value-objects/TargetDate.ts
import { Result } from '$domain/Result';
import { TargetDateValidationError } from '../errors/GoalErrors';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

interface TargetDateProps {
	value: Date;
}

export class TargetDate {
	private constructor(private readonly props: TargetDateProps) {}

	static create(date: string | Date): Result<TargetDate, TargetDateValidationError> {
		const dateObj = typeof date === 'string' ? new Date(date) : date;

		if (isNaN(dateObj.getTime())) {
			return Result.error(new TargetDateValidationError('Invalid target date'));
		}

		const year = dateObj.getFullYear();
		if (year < MIN_YEAR || year > MAX_YEAR) {
			return Result.error(
				new TargetDateValidationError(
					`Target date year must be between ${MIN_YEAR} and ${MAX_YEAR}`
				)
			);
		}

		// Defensive copy
		return Result.ok(new TargetDate({ value: new Date(dateObj) }));
	}

	get value(): Date {
		// Defensive copy on output
		return new Date(this.props.value);
	}

	toISOString(): string {
		return this.props.value.toISOString().split('T')[0];
	}

	isOverdue(referenceDate: Date = new Date()): boolean {
		// Compare only dates, not times
		const targetDate = new Date(this.props.value);
		targetDate.setHours(0, 0, 0, 0);

		const refDate = new Date(referenceDate);
		refDate.setHours(0, 0, 0, 0);

		return targetDate < refDate;
	}

	isPast(referenceDate: Date = new Date()): boolean {
		return this.props.value < referenceDate;
	}

	isFuture(referenceDate: Date = new Date()): boolean {
		return this.props.value > referenceDate;
	}

	daysUntil(referenceDate: Date = new Date()): number {
		const targetDate = new Date(this.props.value);
		targetDate.setHours(0, 0, 0, 0);

		const refDate = new Date(referenceDate);
		refDate.setHours(0, 0, 0, 0);

		const diffMs = targetDate.getTime() - refDate.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	}

	equals(other: TargetDate): boolean {
		return this.props.value.getTime() === other.props.value.getTime();
	}

	toString(): string {
		return this.toISOString();
	}
}
```

**Tests (20 minimum):**

```typescript
// src/domain/Goal/value-objects/TargetDate.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TargetDate } from './TargetDate';
import { TargetDateValidationError } from '../errors/GoalErrors';

describe('TargetDate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('create', () => {
		it('should create from ISO string', () => {
			const result = TargetDate.create('2025-12-31');
			expect(result.isOk).toBe(true);
		});

		it('should create from Date object', () => {
			const date = new Date('2025-12-31');
			const result = TargetDate.create(date);
			expect(result.isOk).toBe(true);
		});

		it('should reject invalid date string', () => {
			const result = TargetDate.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TargetDateValidationError);
		});

		it('should reject year before 2000', () => {
			const result = TargetDate.create('1999-12-31');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should reject year after 2100', () => {
			const result = TargetDate.create('2101-01-01');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should accept year 2000', () => {
			const result = TargetDate.create('2000-01-01');
			expect(result.isOk).toBe(true);
		});

		it('should accept year 2100', () => {
			const result = TargetDate.create('2100-12-31');
			expect(result.isOk).toBe(true);
		});

		it('should create defensive copy from Date object', () => {
			const originalDate = new Date('2025-12-31');
			const result = TargetDate.create(originalDate);
			expect(result.isOk).toBe(true);

			originalDate.setFullYear(2026);
			expect(result.value.value.getFullYear()).toBe(2025);
		});
	});

	describe('value getter', () => {
		it('should return defensive copy', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			const date1 = targetDate.value;
			const date2 = targetDate.value;

			expect(date1).not.toBe(date2);
			expect(date1.getTime()).toBe(date2.getTime());
		});

		it('should protect against mutation', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			const date = targetDate.value;
			date.setFullYear(2026);

			expect(targetDate.value.getFullYear()).toBe(2025);
		});
	});

	describe('isOverdue', () => {
		it('should return true for past date', () => {
			const targetDate = TargetDate.create('2025-06-01').value;
			expect(targetDate.isOverdue()).toBe(true);
		});

		it('should return false for future date', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			expect(targetDate.isOverdue()).toBe(false);
		});

		it('should return false for today', () => {
			const targetDate = TargetDate.create('2025-06-15').value;
			expect(targetDate.isOverdue()).toBe(false);
		});

		it('should use custom reference date', () => {
			const targetDate = TargetDate.create('2025-06-10').value;
			const referenceDate = new Date('2025-06-20');
			expect(targetDate.isOverdue(referenceDate)).toBe(true);
		});
	});

	describe('daysUntil', () => {
		it('should return positive days for future date', () => {
			const targetDate = TargetDate.create('2025-06-20').value;
			expect(targetDate.daysUntil()).toBe(5);
		});

		it('should return negative days for past date', () => {
			const targetDate = TargetDate.create('2025-06-10').value;
			expect(targetDate.daysUntil()).toBe(-5);
		});

		it('should return 0 for today', () => {
			const targetDate = TargetDate.create('2025-06-15').value;
			expect(targetDate.daysUntil()).toBe(0);
		});
	});

	describe('equals', () => {
		it('should return true for same date', () => {
			const date1 = TargetDate.create('2025-12-31').value;
			const date2 = TargetDate.create('2025-12-31').value;
			expect(date1.equals(date2)).toBe(true);
		});

		it('should return false for different dates', () => {
			const date1 = TargetDate.create('2025-12-31').value;
			const date2 = TargetDate.create('2025-12-30').value;
			expect(date1.equals(date2)).toBe(false);
		});
	});

	describe('toISOString', () => {
		it('should return ISO date string without time', () => {
			const targetDate = TargetDate.create('2025-12-31').value;
			expect(targetDate.toISOString()).toBe('2025-12-31');
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/TargetDate.*
git commit -m "feat(goal): add TargetDate value object with overdue detection"
```

---

## Task 6: Progress Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/Progress.ts`
- Create: `src/domain/Goal/value-objects/Progress.test.ts`

**Requirements:**

- Range: 0-100 (percentage)
- Completion check (100%)
- Minimum 18 tests

**Implementation:**

```typescript
// src/domain/Goal/value-objects/Progress.ts
import { Result } from '$domain/Result';
import { ProgressValidationError } from '../errors/GoalErrors';

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;

interface ProgressProps {
	value: number;
}

export class Progress {
	private constructor(private readonly props: ProgressProps) {}

	static create(progress: number): Result<Progress, ProgressValidationError> {
		if (!Number.isFinite(progress)) {
			return Result.error(new ProgressValidationError('Progress must be a valid number'));
		}

		if (progress < MIN_PROGRESS) {
			return Result.error(
				new ProgressValidationError(`Progress cannot be less than ${MIN_PROGRESS}%`)
			);
		}

		if (progress > MAX_PROGRESS) {
			return Result.error(new ProgressValidationError(`Progress cannot exceed ${MAX_PROGRESS}%`));
		}

		return Result.ok(new Progress({ value: Math.round(progress) }));
	}

	static zero(): Progress {
		return new Progress({ value: 0 });
	}

	static complete(): Progress {
		return new Progress({ value: 100 });
	}

	get value(): number {
		return this.props.value;
	}

	isZero(): boolean {
		return this.props.value === 0;
	}

	isComplete(): boolean {
		return this.props.value === 100;
	}

	isPartial(): boolean {
		return this.props.value > 0 && this.props.value < 100;
	}

	increment(amount: number): Result<Progress, ProgressValidationError> {
		return Progress.create(this.props.value + amount);
	}

	decrement(amount: number): Result<Progress, ProgressValidationError> {
		return Progress.create(this.props.value - amount);
	}

	setTo(newProgress: number): Result<Progress, ProgressValidationError> {
		return Progress.create(newProgress);
	}

	formatPercentage(): string {
		return `${this.props.value}%`;
	}

	equals(other: Progress): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value.toString();
	}
}
```

**Tests (18 minimum):**

```typescript
// src/domain/Goal/value-objects/Progress.test.ts
import { describe, it, expect } from 'vitest';
import { Progress } from './Progress';
import { ProgressValidationError } from '../errors/GoalErrors';

describe('Progress', () => {
	describe('create', () => {
		it('should create progress at 0', () => {
			const result = Progress.create(0);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('should create progress at 100', () => {
			const result = Progress.create(100);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(100);
		});

		it('should create progress at 50', () => {
			const result = Progress.create(50);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(50);
		});

		it('should round decimal values', () => {
			const result = Progress.create(45.7);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(46);
		});

		it('should reject negative progress', () => {
			const result = Progress.create(-1);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});

		it('should reject progress over 100', () => {
			const result = Progress.create(101);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});

		it('should reject NaN', () => {
			const result = Progress.create(NaN);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});

		it('should reject Infinity', () => {
			const result = Progress.create(Infinity);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});
	});

	describe('static constructors', () => {
		it('should create zero progress', () => {
			const progress = Progress.zero();
			expect(progress.value).toBe(0);
		});

		it('should create complete progress', () => {
			const progress = Progress.complete();
			expect(progress.value).toBe(100);
		});
	});

	describe('status checks', () => {
		it('should identify zero progress', () => {
			const progress = Progress.create(0).value;
			expect(progress.isZero()).toBe(true);
			expect(progress.isComplete()).toBe(false);
			expect(progress.isPartial()).toBe(false);
		});

		it('should identify complete progress', () => {
			const progress = Progress.create(100).value;
			expect(progress.isZero()).toBe(false);
			expect(progress.isComplete()).toBe(true);
			expect(progress.isPartial()).toBe(false);
		});

		it('should identify partial progress', () => {
			const progress = Progress.create(50).value;
			expect(progress.isZero()).toBe(false);
			expect(progress.isComplete()).toBe(false);
			expect(progress.isPartial()).toBe(true);
		});
	});

	describe('increment', () => {
		it('should increment progress', () => {
			const progress = Progress.create(30).value;
			const result = progress.increment(20);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(50);
		});

		it('should reject increment exceeding 100', () => {
			const progress = Progress.create(90).value;
			const result = progress.increment(20);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});
	});

	describe('decrement', () => {
		it('should decrement progress', () => {
			const progress = Progress.create(50).value;
			const result = progress.decrement(20);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(30);
		});

		it('should reject decrement below 0', () => {
			const progress = Progress.create(10).value;
			const result = progress.decrement(20);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ProgressValidationError);
		});
	});

	describe('formatPercentage', () => {
		it('should format as percentage', () => {
			const progress = Progress.create(75).value;
			expect(progress.formatPercentage()).toBe('75%');
		});
	});

	describe('equals', () => {
		it('should return true for same progress', () => {
			const progress1 = Progress.create(50).value;
			const progress2 = Progress.create(50).value;
			expect(progress1.equals(progress2)).toBe(true);
		});

		it('should return false for different progress', () => {
			const progress1 = Progress.create(50).value;
			const progress2 = Progress.create(75).value;
			expect(progress1.equals(progress2)).toBe(false);
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/Progress.*
git commit -m "feat(goal): add Progress value object with validation"
```

---

## Task 7: Quarter Value Object

**Files:**

- Create: `src/domain/Goal/value-objects/Quarter.ts`
- Create: `src/domain/Goal/value-objects/Quarter.test.ts`

**Requirements:**

- Valid quarters: Q1, Q2, Q3, Q4 (optional field)
- Parse from string (e.g., "Q1", "Q2")
- Minimum 16 tests

**Implementation:**

```typescript
// src/domain/Goal/value-objects/Quarter.ts
import { Result } from '$domain/Result';
import { QuarterValidationError } from '../errors/GoalErrors';

type QuarterValue = 1 | 2 | 3 | 4;

const VALID_QUARTERS: QuarterValue[] = [1, 2, 3, 4];

interface QuarterProps {
	value: QuarterValue;
}

export class Quarter {
	private constructor(private readonly props: QuarterProps) {}

	static create(quarter: string | number): Result<Quarter, QuarterValidationError> {
		let quarterNum: number;

		if (typeof quarter === 'string') {
			const trimmed = quarter.trim().toUpperCase();
			if (trimmed.startsWith('Q')) {
				quarterNum = parseInt(trimmed.substring(1), 10);
			} else {
				quarterNum = parseInt(trimmed, 10);
			}
		} else {
			quarterNum = quarter;
		}

		if (isNaN(quarterNum) || !VALID_QUARTERS.includes(quarterNum as QuarterValue)) {
			return Result.error(
				new QuarterValidationError(`Invalid quarter: ${quarter}. Must be Q1, Q2, Q3, or Q4`)
			);
		}

		return Result.ok(new Quarter({ value: quarterNum as QuarterValue }));
	}

	get value(): QuarterValue {
		return this.props.value;
	}

	format(): string {
		return `Q${this.props.value}`;
	}

	getMonthRange(): [number, number] {
		const ranges: Record<QuarterValue, [number, number]> = {
			1: [1, 3],
			2: [4, 6],
			3: [7, 9],
			4: [10, 12]
		};
		return ranges[this.props.value];
	}

	equals(other: Quarter): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.format();
	}
}
```

**Tests (16 minimum):**

```typescript
// src/domain/Goal/value-objects/Quarter.test.ts
import { describe, it, expect } from 'vitest';
import { Quarter } from './Quarter';
import { QuarterValidationError } from '../errors/GoalErrors';

describe('Quarter', () => {
	describe('create', () => {
		it('should create from Q1 string', () => {
			const result = Quarter.create('Q1');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1);
		});

		it('should create from Q2 string', () => {
			const result = Quarter.create('Q2');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2);
		});

		it('should create from Q3 string', () => {
			const result = Quarter.create('Q3');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(3);
		});

		it('should create from Q4 string', () => {
			const result = Quarter.create('Q4');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(4);
		});

		it('should create from number 1', () => {
			const result = Quarter.create(1);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1);
		});

		it('should normalize lowercase', () => {
			const result = Quarter.create('q2');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2);
		});

		it('should trim whitespace', () => {
			const result = Quarter.create('  Q3  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(3);
		});

		it('should parse number string without Q', () => {
			const result = Quarter.create('4');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(4);
		});

		it('should reject Q0', () => {
			const result = Quarter.create('Q0');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(QuarterValidationError);
		});

		it('should reject Q5', () => {
			const result = Quarter.create('Q5');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(QuarterValidationError);
		});

		it('should reject invalid string', () => {
			const result = Quarter.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(QuarterValidationError);
		});
	});

	describe('format', () => {
		it('should format as Q1', () => {
			const quarter = Quarter.create(1).value;
			expect(quarter.format()).toBe('Q1');
		});

		it('should format as Q4', () => {
			const quarter = Quarter.create(4).value;
			expect(quarter.format()).toBe('Q4');
		});
	});

	describe('getMonthRange', () => {
		it('should return months for Q1', () => {
			const quarter = Quarter.create(1).value;
			expect(quarter.getMonthRange()).toEqual([1, 3]);
		});

		it('should return months for Q2', () => {
			const quarter = Quarter.create(2).value;
			expect(quarter.getMonthRange()).toEqual([4, 6]);
		});

		it('should return months for Q3', () => {
			const quarter = Quarter.create(3).value;
			expect(quarter.getMonthRange()).toEqual([7, 9]);
		});

		it('should return months for Q4', () => {
			const quarter = Quarter.create(4).value;
			expect(quarter.getMonthRange()).toEqual([10, 12]);
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/value-objects/Quarter.*
git commit -m "feat(goal): add Quarter value object with validation"
```

---

## Task 8: Goal Entity

**Files:**

- Create: `src/domain/Goal/entities/Goal.ts`
- Create: `src/domain/Goal/entities/Goal.test.ts`

**Requirements:**

- Combines all value objects
- Status transitions with validation
- Progress updates
- Completion logic (auto-complete at 100% progress)
- Defensive date copies
- Minimum 28 tests

**Implementation:**

```typescript
// src/domain/Goal/entities/Goal.ts
import { Result } from '$domain/Result';
import { GoalStatus } from '../value-objects/GoalStatus';
import { GoalPriority } from '../value-objects/GoalPriority';
import { GoalTitle } from '../value-objects/GoalTitle';
import { GoalDescription } from '../value-objects/GoalDescription';
import { TargetDate } from '../value-objects/TargetDate';
import { Progress } from '../value-objects/Progress';
import { Quarter } from '../value-objects/Quarter';
import { GoalValidationError, InvalidStatusTransitionError, GoalError } from '../errors/GoalErrors';

export interface GoalProps {
	id: string;
	employeeId: string;
	title: GoalTitle;
	description: GoalDescription;
	targetDate: TargetDate;
	progress: Progress;
	status: GoalStatus;
	priority: GoalPriority;
	quarter?: Quarter;
	year?: number;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
	completedAt?: Date;
}

export class Goal {
	private constructor(private readonly props: GoalProps) {}

	static create(props: GoalProps): Result<Goal, GoalValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new GoalValidationError('Goal ID is required'));
		}

		if (!props.employeeId?.trim()) {
			return Result.error(new GoalValidationError('Employee ID is required'));
		}

		if (!props.createdBy?.trim()) {
			return Result.error(new GoalValidationError('Created By is required'));
		}

		// Validate year if provided
		if (props.year !== undefined && (props.year < 2000 || props.year > 2100)) {
			return Result.error(new GoalValidationError('Year must be between 2000 and 2100'));
		}

		// Defensive copies for dates
		const defensiveProps: GoalProps = {
			...props,
			createdAt: new Date(props.createdAt),
			updatedAt: new Date(props.updatedAt),
			completedAt: props.completedAt ? new Date(props.completedAt) : undefined
		};

		return Result.ok(new Goal(defensiveProps));
	}

	// Getters
	get id(): string {
		return this.props.id;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get title(): GoalTitle {
		return this.props.title;
	}

	get description(): GoalDescription {
		return this.props.description;
	}

	get targetDate(): TargetDate {
		return this.props.targetDate;
	}

	get progress(): Progress {
		return this.props.progress;
	}

	get status(): GoalStatus {
		return this.props.status;
	}

	get priority(): GoalPriority {
		return this.props.priority;
	}

	get quarter(): Quarter | undefined {
		return this.props.quarter;
	}

	get year(): number | undefined {
		return this.props.year;
	}

	get createdBy(): string {
		return this.props.createdBy;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt);
	}

	get updatedAt(): Date {
		return new Date(this.props.updatedAt);
	}

	get completedAt(): Date | undefined {
		return this.props.completedAt ? new Date(this.props.completedAt) : undefined;
	}

	// Business logic
	updateStatus(newStatus: GoalStatus): Result<Goal, InvalidStatusTransitionError> {
		if (!this.props.status.canTransitionTo(newStatus)) {
			return Result.error(
				new InvalidStatusTransitionError(
					`Cannot transition from ${this.props.status.value} to ${newStatus.value}`
				)
			);
		}

		const completedAt = newStatus.isCompleted() ? new Date() : this.props.completedAt;

		return Result.ok(
			new Goal({
				...this.props,
				status: newStatus,
				updatedAt: new Date(),
				completedAt
			})
		);
	}

	updateProgress(newProgress: Progress): Result<Goal, GoalError> {
		// Auto-complete if progress reaches 100%
		const shouldComplete = newProgress.isComplete() && !this.props.status.isCompleted();
		const newStatus = shouldComplete ? GoalStatus.create('completed').value : this.props.status;
		const completedAt = shouldComplete ? new Date() : this.props.completedAt;

		return Result.ok(
			new Goal({
				...this.props,
				progress: newProgress,
				status: newStatus,
				updatedAt: new Date(),
				completedAt
			})
		);
	}

	updatePriority(newPriority: GoalPriority): Goal {
		return new Goal({
			...this.props,
			priority: newPriority,
			updatedAt: new Date()
		});
	}

	updateTargetDate(newTargetDate: TargetDate): Goal {
		return new Goal({
			...this.props,
			targetDate: newTargetDate,
			updatedAt: new Date()
		});
	}

	isComplete(): boolean {
		return this.props.status.isCompleted();
	}

	isOverdue(): boolean {
		if (this.props.status.isTerminal()) {
			return false;
		}
		return this.props.targetDate.isOverdue();
	}

	isActive(): boolean {
		return this.props.status.isActive();
	}

	equals(other: Goal): boolean {
		return this.props.id === other.props.id;
	}
}
```

**Tests (28 minimum):**

```typescript
// src/domain/Goal/entities/Goal.test.ts
import { describe, it, expect } from 'vitest';
import { Goal } from './Goal';
import { GoalStatus } from '../value-objects/GoalStatus';
import { GoalPriority } from '../value-objects/GoalPriority';
import { GoalTitle } from '../value-objects/GoalTitle';
import { GoalDescription } from '../value-objects/GoalDescription';
import { TargetDate } from '../value-objects/TargetDate';
import { Progress } from '../value-objects/Progress';
import { Quarter } from '../value-objects/Quarter';
import { GoalValidationError, InvalidStatusTransitionError } from '../errors/GoalErrors';

describe('Goal', () => {
	const createValidProps = () => ({
		id: 'goal-123',
		employeeId: 'emp-456',
		title: GoalTitle.create('Complete training').value,
		description: GoalDescription.create('Complete React training course').value,
		targetDate: TargetDate.create('2025-12-31').value,
		progress: Progress.create(0).value,
		status: GoalStatus.create('not_started').value,
		priority: GoalPriority.create('high').value,
		quarter: Quarter.create('Q4').value,
		year: 2025,
		createdBy: 'manager-789',
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01')
	});

	describe('create', () => {
		it('should create valid goal', () => {
			const result = Goal.create(createValidProps());
			expect(result.isOk).toBe(true);
		});

		it('should reject empty id', () => {
			const props = { ...createValidProps(), id: '' };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalValidationError);
		});

		it('should reject empty employeeId', () => {
			const props = { ...createValidProps(), employeeId: '' };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalValidationError);
		});

		it('should reject empty createdBy', () => {
			const props = { ...createValidProps(), createdBy: '' };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalValidationError);
		});

		it('should reject invalid year below 2000', () => {
			const props = { ...createValidProps(), year: 1999 };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should reject invalid year above 2100', () => {
			const props = { ...createValidProps(), year: 2101 };
			const result = Goal.create(props);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('between 2000 and 2100');
		});

		it('should create without optional quarter', () => {
			const props = { ...createValidProps(), quarter: undefined };
			const result = Goal.create(props);
			expect(result.isOk).toBe(true);
		});

		it('should create without optional year', () => {
			const props = { ...createValidProps(), year: undefined };
			const result = Goal.create(props);
			expect(result.isOk).toBe(true);
		});

		it('should create defensive copies of dates', () => {
			const createdAt = new Date('2025-01-01');
			const props = { ...createValidProps(), createdAt };
			const goal = Goal.create(props).value;

			createdAt.setFullYear(2026);
			expect(goal.createdAt.getFullYear()).toBe(2025);
		});
	});

	describe('updateStatus', () => {
		it('should transition from not_started to in_progress', () => {
			const goal = Goal.create(createValidProps()).value;
			const newStatus = GoalStatus.create('in_progress').value;
			const result = goal.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should transition from in_progress to completed', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('in_progress').value
			};
			const goal = Goal.create(props).value;
			const newStatus = GoalStatus.create('completed').value;
			const result = goal.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('completed');
			expect(result.value.completedAt).toBeDefined();
		});

		it('should reject invalid transition from completed', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value,
				completedAt: new Date()
			};
			const goal = Goal.create(props).value;
			const newStatus = GoalStatus.create('in_progress').value;
			const result = goal.updateStatus(newStatus);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidStatusTransitionError);
		});

		it('should update updatedAt timestamp', () => {
			const goal = Goal.create(createValidProps()).value;
			const originalUpdatedAt = goal.updatedAt.getTime();

			// Wait a bit to ensure timestamp changes
			const newStatus = GoalStatus.create('in_progress').value;
			const updatedGoal = goal.updateStatus(newStatus).value;

			expect(updatedGoal.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
		});
	});

	describe('updateProgress', () => {
		it('should update progress', () => {
			const goal = Goal.create(createValidProps()).value;
			const newProgress = Progress.create(50).value;
			const result = goal.updateProgress(newProgress);

			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(50);
		});

		it('should auto-complete when progress reaches 100%', () => {
			const goal = Goal.create(createValidProps()).value;
			const completeProgress = Progress.complete();
			const result = goal.updateProgress(completeProgress);

			expect(result.isOk).toBe(true);
			expect(result.value.progress.value).toBe(100);
			expect(result.value.status.isCompleted()).toBe(true);
			expect(result.value.completedAt).toBeDefined();
		});

		it('should not change status if already completed', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value,
				progress: Progress.complete(),
				completedAt: new Date('2025-06-01')
			};
			const goal = Goal.create(props).value;
			const result = goal.updateProgress(Progress.complete());

			expect(result.isOk).toBe(true);
			expect(result.value.status.isCompleted()).toBe(true);
		});
	});

	describe('updatePriority', () => {
		it('should update priority', () => {
			const goal = Goal.create(createValidProps()).value;
			const newPriority = GoalPriority.create('low').value;
			const updatedGoal = goal.updatePriority(newPriority);

			expect(updatedGoal.priority.value).toBe('low');
		});
	});

	describe('updateTargetDate', () => {
		it('should update target date', () => {
			const goal = Goal.create(createValidProps()).value;
			const newDate = TargetDate.create('2026-06-30').value;
			const updatedGoal = goal.updateTargetDate(newDate);

			expect(updatedGoal.targetDate.toISOString()).toBe('2026-06-30');
		});
	});

	describe('isComplete', () => {
		it('should return true for completed goal', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isComplete()).toBe(true);
		});

		it('should return false for incomplete goal', () => {
			const goal = Goal.create(createValidProps()).value;
			expect(goal.isComplete()).toBe(false);
		});
	});

	describe('isOverdue', () => {
		it('should return true for overdue goal', () => {
			const props = {
				...createValidProps(),
				targetDate: TargetDate.create('2020-01-01').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isOverdue()).toBe(true);
		});

		it('should return false for future goal', () => {
			const props = {
				...createValidProps(),
				targetDate: TargetDate.create('2099-12-31').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isOverdue()).toBe(false);
		});

		it('should return false for completed goal even if past target date', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('completed').value,
				targetDate: TargetDate.create('2020-01-01').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isOverdue()).toBe(false);
		});
	});

	describe('isActive', () => {
		it('should return true for in_progress goal', () => {
			const props = {
				...createValidProps(),
				status: GoalStatus.create('in_progress').value
			};
			const goal = Goal.create(props).value;
			expect(goal.isActive()).toBe(true);
		});

		it('should return false for not_started goal', () => {
			const goal = Goal.create(createValidProps()).value;
			expect(goal.isActive()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same goal ID', () => {
			const goal1 = Goal.create(createValidProps()).value;
			const goal2 = Goal.create(createValidProps()).value;
			expect(goal1.equals(goal2)).toBe(true);
		});

		it('should return false for different goal IDs', () => {
			const props1 = createValidProps();
			const props2 = { ...createValidProps(), id: 'different-id' };
			const goal1 = Goal.create(props1).value;
			const goal2 = Goal.create(props2).value;
			expect(goal1.equals(goal2)).toBe(false);
		});
	});

	describe('defensive copies', () => {
		it('should protect createdAt from external mutation', () => {
			const goal = Goal.create(createValidProps()).value;
			const createdAt = goal.createdAt;
			createdAt.setFullYear(2099);

			expect(goal.createdAt.getFullYear()).toBe(2025);
		});

		it('should protect updatedAt from external mutation', () => {
			const goal = Goal.create(createValidProps()).value;
			const updatedAt = goal.updatedAt;
			updatedAt.setFullYear(2099);

			expect(goal.updatedAt.getFullYear()).toBe(2025);
		});

		it('should protect completedAt from external mutation', () => {
			const props = {
				...createValidProps(),
				completedAt: new Date('2025-06-01')
			};
			const goal = Goal.create(props).value;
			const completedAt = goal.completedAt!;
			completedAt.setFullYear(2099);

			expect(goal.completedAt!.getFullYear()).toBe(2025);
		});
	});
});
```

**Commit:**

```bash
git add src/domain/Goal/entities/Goal.*
git commit -m "feat(goal): add Goal entity with status transitions and progress tracking"
```

---

## Task 9: Domain Layer Barrel Exports

**Files:**

- Create: `src/domain/Goal/errors/GoalErrors.ts`
- Create: `src/domain/Goal/index.ts`

**Implementation:**

```typescript
// src/domain/Goal/errors/GoalErrors.ts
export class GoalError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GoalError';
	}
}

export class GoalValidationError extends GoalError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalValidationError';
	}
}

export class GoalStatusValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalStatusValidationError';
	}
}

export class GoalPriorityValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalPriorityValidationError';
	}
}

export class GoalTitleValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalTitleValidationError';
	}
}

export class GoalDescriptionValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalDescriptionValidationError';
	}
}

export class TargetDateValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'TargetDateValidationError';
	}
}

export class ProgressValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'ProgressValidationError';
	}
}

export class QuarterValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'QuarterValidationError';
	}
}

export class GoalNotFoundError extends GoalError {
	constructor(id: string) {
		super(`Goal not found: ${id}`);
		this.name = 'GoalNotFoundError';
	}
}

export class InvalidStatusTransitionError extends GoalError {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidStatusTransitionError';
	}
}
```

```typescript
// src/domain/Goal/index.ts
// Value Objects
export { GoalStatus } from './value-objects/GoalStatus';
export { GoalPriority } from './value-objects/GoalPriority';
export { GoalTitle } from './value-objects/GoalTitle';
export { GoalDescription } from './value-objects/GoalDescription';
export { TargetDate } from './value-objects/TargetDate';
export { Progress } from './value-objects/Progress';
export { Quarter } from './value-objects/Quarter';

// Entities
export { Goal } from './entities/Goal';
export type { GoalProps } from './entities/Goal';

// Errors
export {
	GoalError,
	GoalValidationError,
	GoalStatusValidationError,
	GoalPriorityValidationError,
	GoalTitleValidationError,
	GoalDescriptionValidationError,
	TargetDateValidationError,
	ProgressValidationError,
	QuarterValidationError,
	GoalNotFoundError,
	InvalidStatusTransitionError
} from './errors/GoalErrors';
```

**Commit:**

```bash
git add src/domain/Goal/
git commit -m "feat(goal): add domain layer barrel exports and error hierarchy"
```

---

## Task 10: GoalRepository Port

**Files:**

- Create: `src/services/ports/GoalRepository.ts`

**Implementation:**

```typescript
// src/services/ports/GoalRepository.ts
import { Result } from '$domain/Result';
import { Goal, GoalNotFoundError, GoalValidationError, GoalError } from '$domain/Goal';

export interface GoalFilter {
	employeeId?: string;
	status?: string;
	priority?: string;
	quarter?: string;
	year?: number;
	limit?: number;
	offset?: number;
}

export interface CreateGoalData {
	employeeId: string;
	title: string;
	description: string;
	targetDate: string;
	progress?: number;
	status?: string;
	priority?: string;
	quarter?: string;
	year?: number;
	createdBy: string;
}

export interface UpdateGoalData {
	title?: string;
	description?: string;
	targetDate?: string;
	progress?: number;
	status?: string;
	priority?: string;
	quarter?: string;
	year?: number;
}

export interface GoalRepository {
	/**
	 * Find a goal by ID
	 * @returns Goal if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Goal, GoalNotFoundError>>;

	/**
	 * Find all goals with optional filtering
	 * @returns Array of goals or error
	 */
	findAll(filter?: GoalFilter): Promise<Result<Goal[], GoalError>>;

	/**
	 * Create a new goal
	 * @returns Created goal or validation error
	 */
	create(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>>;

	/**
	 * Update an existing goal
	 * @returns Updated goal or error
	 */
	update(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>>;

	/**
	 * Delete a goal
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, GoalNotFoundError>>;

	/**
	 * Get goals for an employee
	 * @returns Array of goals for the employee
	 */
	getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>>;

	/**
	 * Get goals by status
	 * @returns Array of goals with the specified status
	 */
	getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>>;
}
```

**Commit:**

```bash
git add src/services/ports/GoalRepository.ts
git commit -m "feat(goal): add GoalRepository port interface"
```

---

## Task 11: GoalService

**Files:**

- Create: `src/services/GoalService.ts`
- Create: `src/services/GoalService.test.ts`

**Requirements:**

- CRUD operations (create, read, update, delete)
- Statistics calculation
- Progress tracking
- Minimum 22 tests

**Implementation:**

```typescript
// src/services/GoalService.ts
import { Result } from '$domain/Result';
import { Goal, GoalNotFoundError, GoalValidationError, GoalError } from '$domain/Goal';
import type {
	GoalRepository,
	CreateGoalData,
	UpdateGoalData,
	GoalFilter
} from './ports/GoalRepository';

export interface GoalStatistics {
	totalGoals: number;
	activeGoals: number;
	completedGoals: number;
	overdueGoals: number;
	highPriorityGoals: number;
	averageProgress: number;
	completionRate: number;
}

export class GoalService {
	constructor(private readonly repository: GoalRepository) {}

	async getGoalById(id: string): Promise<Result<Goal, GoalNotFoundError>> {
		return this.repository.findById(id);
	}

	async getAllGoals(filter?: GoalFilter): Promise<Result<Goal[], GoalError>> {
		return this.repository.findAll(filter);
	}

	async createGoal(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>> {
		return this.repository.create(data);
	}

	async updateGoal(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>> {
		return this.repository.update(id, data);
	}

	async deleteGoal(id: string): Promise<Result<void, GoalNotFoundError>> {
		return this.repository.delete(id);
	}

	async getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>> {
		return this.repository.getGoalsForEmployee(employeeId);
	}

	async getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>> {
		return this.repository.getGoalsByStatus(status);
	}

	calculateStatistics(goals: Goal[]): GoalStatistics {
		const totalGoals = goals.length;
		const activeGoals = goals.filter((g) => g.isActive()).length;
		const completedGoals = goals.filter((g) => g.isComplete()).length;
		const overdueGoals = goals.filter((g) => g.isOverdue()).length;
		const highPriorityGoals = goals.filter((g) => g.priority.isHigh()).length;

		const avgProgress =
			totalGoals > 0 ? goals.reduce((sum, g) => sum + g.progress.value, 0) / totalGoals : 0;

		const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

		return {
			totalGoals,
			activeGoals,
			completedGoals,
			overdueGoals,
			highPriorityGoals,
			averageProgress: Math.round(avgProgress),
			completionRate: Math.round(completionRate)
		};
	}
}
```

**Tests (22 minimum):**

```typescript
// src/services/GoalService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GoalService } from './GoalService';
import type {
	GoalRepository,
	CreateGoalData,
	UpdateGoalData,
	GoalFilter
} from './ports/GoalRepository';
import {
	Goal,
	GoalStatus,
	GoalPriority,
	GoalTitle,
	GoalDescription,
	TargetDate,
	Progress,
	Quarter,
	GoalNotFoundError,
	GoalValidationError,
	GoalError
} from '$domain/Goal';
import { Result } from '$domain/Result';

// Mock repository
class MockGoalRepository implements GoalRepository {
	private goals: Map<string, Goal> = new Map();

	async findById(id: string): Promise<Result<Goal, GoalNotFoundError>> {
		const goal = this.goals.get(id);
		if (!goal) {
			return Result.error(new GoalNotFoundError(id));
		}
		return Result.ok(goal);
	}

	async findAll(filter?: GoalFilter): Promise<Result<Goal[], GoalError>> {
		return Result.ok(Array.from(this.goals.values()));
	}

	async create(data: CreateGoalData): Promise<Result<Goal, GoalValidationError>> {
		const goal = Goal.create({
			id: `goal-${Date.now()}`,
			employeeId: data.employeeId,
			title: GoalTitle.create(data.title).value,
			description: GoalDescription.create(data.description).value,
			targetDate: TargetDate.create(data.targetDate).value,
			progress: Progress.create(data.progress ?? 0).value,
			status: GoalStatus.create(data.status ?? 'not_started').value,
			priority: GoalPriority.create(data.priority ?? 'medium').value,
			quarter: data.quarter ? Quarter.create(data.quarter).value : undefined,
			year: data.year,
			createdBy: data.createdBy,
			createdAt: new Date(),
			updatedAt: new Date()
		}).value;

		this.goals.set(goal.id, goal);
		return Result.ok(goal);
	}

	async update(id: string, data: UpdateGoalData): Promise<Result<Goal, GoalError>> {
		const goalResult = await this.findById(id);
		if (goalResult.isError) {
			return Result.error(new GoalError(goalResult.error.message));
		}

		const existing = goalResult.value;
		const updated = Goal.create({
			...existing,
			title: data.title ? GoalTitle.create(data.title).value : existing.title,
			description: data.description
				? GoalDescription.create(data.description).value
				: existing.description,
			targetDate: data.targetDate ? TargetDate.create(data.targetDate).value : existing.targetDate,
			progress:
				data.progress !== undefined ? Progress.create(data.progress).value : existing.progress,
			status: data.status ? GoalStatus.create(data.status).value : existing.status,
			priority: data.priority ? GoalPriority.create(data.priority).value : existing.priority,
			updatedAt: new Date()
		}).value;

		this.goals.set(id, updated);
		return Result.ok(updated);
	}

	async delete(id: string): Promise<Result<void, GoalNotFoundError>> {
		if (!this.goals.has(id)) {
			return Result.error(new GoalNotFoundError(id));
		}
		this.goals.delete(id);
		return Result.ok(undefined);
	}

	async getGoalsForEmployee(employeeId: string): Promise<Result<Goal[], GoalError>> {
		const goals = Array.from(this.goals.values()).filter((g) => g.employeeId === employeeId);
		return Result.ok(goals);
	}

	async getGoalsByStatus(status: string): Promise<Result<Goal[], GoalError>> {
		const goals = Array.from(this.goals.values()).filter((g) => g.status.value === status);
		return Result.ok(goals);
	}
}

describe('GoalService', () => {
	let service: GoalService;
	let repository: MockGoalRepository;

	beforeEach(() => {
		repository = new MockGoalRepository();
		service = new GoalService(repository);
	});

	describe('getGoalById', () => {
		it('should return goal when found', async () => {
			const createData: CreateGoalData = {
				employeeId: 'emp-123',
				title: 'Complete training',
				description: 'Complete React training course',
				targetDate: '2025-12-31',
				createdBy: 'manager-456'
			};
			const created = await repository.create(createData);
			const goalId = created.value.id;

			const result = await service.getGoalById(goalId);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(goalId);
		});

		it('should return error when not found', async () => {
			const result = await service.getGoalById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});
	});

	describe('createGoal', () => {
		it('should create goal with valid data', async () => {
			const createData: CreateGoalData = {
				employeeId: 'emp-123',
				title: 'Complete training',
				description: 'Complete React training course',
				targetDate: '2025-12-31',
				priority: 'high',
				createdBy: 'manager-456'
			};

			const result = await service.createGoal(createData);

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Complete training');
		});
	});

	describe('updateGoal', () => {
		it('should update goal', async () => {
			const createData: CreateGoalData = {
				employeeId: 'emp-123',
				title: 'Original title',
				description: 'Original description',
				targetDate: '2025-12-31',
				createdBy: 'manager-456'
			};
			const created = await repository.create(createData);
			const goalId = created.value.id;

			const updateData: UpdateGoalData = {
				title: 'Updated title'
			};

			const result = await service.updateGoal(goalId, updateData);

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated title');
		});

		it('should return error for nonexistent goal', async () => {
			const result = await service.updateGoal('nonexistent', { title: 'New title' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalError);
		});
	});

	describe('deleteGoal', () => {
		it('should delete goal', async () => {
			const createData: CreateGoalData = {
				employeeId: 'emp-123',
				title: 'To be deleted',
				description: 'This will be deleted',
				targetDate: '2025-12-31',
				createdBy: 'manager-456'
			};
			const created = await repository.create(createData);
			const goalId = created.value.id;

			const result = await service.deleteGoal(goalId);

			expect(result.isOk).toBe(true);

			const findResult = await service.getGoalById(goalId);
			expect(findResult.isError).toBe(true);
		});

		it('should return error for nonexistent goal', async () => {
			const result = await service.deleteGoal('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});
	});

	describe('getGoalsForEmployee', () => {
		it('should return goals for employee', async () => {
			await repository.create({
				employeeId: 'emp-123',
				title: 'Goal 1',
				description: 'Description 1',
				targetDate: '2025-12-31',
				createdBy: 'manager-456'
			});

			await repository.create({
				employeeId: 'emp-123',
				title: 'Goal 2',
				description: 'Description 2',
				targetDate: '2025-12-31',
				createdBy: 'manager-456'
			});

			await repository.create({
				employeeId: 'emp-999',
				title: 'Other goal',
				description: 'Other description',
				targetDate: '2025-12-31',
				createdBy: 'manager-456'
			});

			const result = await service.getGoalsForEmployee('emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(2);
		});
	});

	describe('getGoalsByStatus', () => {
		it('should return goals by status', async () => {
			await repository.create({
				employeeId: 'emp-123',
				title: 'In progress goal',
				description: 'Description',
				targetDate: '2025-12-31',
				status: 'in_progress',
				createdBy: 'manager-456'
			});

			await repository.create({
				employeeId: 'emp-123',
				title: 'Completed goal',
				description: 'Description',
				targetDate: '2025-12-31',
				status: 'completed',
				createdBy: 'manager-456'
			});

			const result = await service.getGoalsByStatus('in_progress');

			expect(result.isOk).toBe(true);
			expect(result.value.length).toBe(1);
			expect(result.value[0].status.value).toBe('in_progress');
		});
	});

	describe('calculateStatistics', () => {
		it('should calculate statistics for goals', async () => {
			const goals = [
				Goal.create({
					id: 'goal-1',
					employeeId: 'emp-123',
					title: GoalTitle.create('Goal 1').value,
					description: GoalDescription.create('Description').value,
					targetDate: TargetDate.create('2099-12-31').value,
					progress: Progress.create(50).value,
					status: GoalStatus.create('in_progress').value,
					priority: GoalPriority.create('high').value,
					createdBy: 'manager-456',
					createdAt: new Date(),
					updatedAt: new Date()
				}).value,
				Goal.create({
					id: 'goal-2',
					employeeId: 'emp-123',
					title: GoalTitle.create('Goal 2').value,
					description: GoalDescription.create('Description').value,
					targetDate: TargetDate.create('2020-01-01').value,
					progress: Progress.create(100).value,
					status: GoalStatus.create('completed').value,
					priority: GoalPriority.create('medium').value,
					createdBy: 'manager-456',
					createdAt: new Date(),
					updatedAt: new Date()
				}).value
			];

			const stats = service.calculateStatistics(goals);

			expect(stats.totalGoals).toBe(2);
			expect(stats.activeGoals).toBe(1);
			expect(stats.completedGoals).toBe(1);
			expect(stats.highPriorityGoals).toBe(1);
			expect(stats.averageProgress).toBe(75);
			expect(stats.completionRate).toBe(50);
		});

		it('should handle empty goal list', () => {
			const stats = service.calculateStatistics([]);

			expect(stats.totalGoals).toBe(0);
			expect(stats.activeGoals).toBe(0);
			expect(stats.completedGoals).toBe(0);
			expect(stats.overdueGoals).toBe(0);
			expect(stats.averageProgress).toBe(0);
			expect(stats.completionRate).toBe(0);
		});
	});
});
```

**Commit:**

```bash
git add src/services/GoalService.*
git commit -m "feat(goal): add GoalService with CRUD and statistics"
```

---

## Task 12: GraphQLGoalAdapter

**Files:**

- Create: `src/adapters/graphql/GraphQLGoalAdapter.ts`
- Create: `src/adapters/graphql/GraphQLGoalAdapter.test.ts`

**Requirements:**

- Implements GoalRepository port
- GraphQL queries and mutations for all operations
- Domain transformation (GraphQL → Domain entities)
- Minimum 22 tests

**Note:** Follow the pattern from GraphQLPerformanceReviewAdapter and GraphQLTaskAdapter. Implementation details omitted for brevity - implementer should follow established patterns.

**Commit:**

```bash
git add src/adapters/graphql/GraphQLGoalAdapter.*
git commit -m "feat(goal): add GraphQLGoalAdapter implementing repository port"
```

---

## Task 13: goalServiceFactory

**Files:**

- Create: `src/lib/services/goalServiceFactory.ts`

**Implementation:**

```typescript
// src/lib/services/goalServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { GoalService } from '$services/GoalService';
import { GraphQLGoalAdapter } from '$adapters/graphql/GraphQLGoalAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createGoalService(event: RequestEvent): GoalService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLGoalAdapter(client);
	return new GoalService(adapter);
}
```

**Commit:**

```bash
git add src/lib/services/goalServiceFactory.ts
git commit -m "feat(goal): add goalServiceFactory for DI"
```

---

## Task 14: Update ServiceContainer

**Files:**

- Modify: `src/lib/server/services.ts`

**Changes:**

1. Add imports for GoalService and factory
2. Add private `_goalService` field
3. Add `goalService` getter with lazy initialization
4. Add re-export of `createGoalService`

**Commit:**

```bash
git add src/lib/server/services.ts
git commit -m "feat(goal): integrate goalService into ServiceContainer"
```

---

## Task 15: Migration Completion Report

**Files:**

- Create: `docs/architecture/goals-hexagonal-migration-completion.md`

**Requirements:**

- Complete migration summary (10/100 → 90/100 score)
- Test count breakdown (140-160 tests expected)
- All architectural patterns documented
- File inventory
- Next steps

**Commit:**

```bash
git add docs/architecture/goals-hexagonal-migration-completion.md
git commit -m "docs(goal): add hexagonal migration completion report"
```

---

## Task 16: Update MEMORY.md

**Files:**

- Modify: `~/.claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md`

**Changes:**

1. Update "Hexagonal Architecture Status" (7/23 → 8/23)
2. Add Goals to completed list with score and test count
3. Add new "Goals Hexagonal Migration" section with details
4. Update architecture reports list

**Note:** Do NOT commit MEMORY.md (not tracked in git)

---

## Summary

**Expected Results:**

- **Score:** 10/100 → 90/100
- **Tests:** 140-160 comprehensive tests
- **Files:** 16 domain files, 2 service files, 2 adapter files, 2 integration files
- **LOC:** Consolidate 1050 LOC into clean hexagonal architecture

**Architectural Patterns:**

- Result<T, E> for error handling
- Private constructor + static `create()` factory
- Immutability (methods return new instances)
- Defensive date copies
- Port-adapter separation

**Modules Completed:** 8/23 (Employee, Department, Leave Request, Auth/JWT, Tasks, RBAC, Performance Reviews, Goals)

**Next Recommended:** Events/Calendar (3 days), Timesheet (5 days), or Reports (4 days)
