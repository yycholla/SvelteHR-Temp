# Events Module Hexagonal Architecture Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Events module from GraphQL-centric architecture to hexagonal architecture with domain-driven design patterns.

**Architecture:** Transform 434 LOC of GraphQL operations into a clean hexagonal architecture with domain layer (value objects + entities), service layer (port-based), and adapter layer (GraphQL implementation). Event and EventAttendee entities manage RSVP workflow with strong business rules.

**Tech Stack:** TypeScript 5, Vitest 3.2, Result<T,E> pattern, URQL GraphQL client

**Current State:**

- GraphQL operations: 434 lines (queries, mutations, service)
- No domain layer
- Score: ~15/100

**Target State:**

- Domain layer: 9 value objects, 2 entities, comprehensive error hierarchy
- Service layer: EventRepository port, EventService
- Adapter layer: GraphQLEventAdapter
- Score: 90/100
- Tests: 250-300 (estimated)

---

## Task 1: EventStatus Value Object

**Goal:** Create EventStatus value object with status transition validation.

**Files:**

- Create: `src/domain/Event/value-objects/EventStatus.ts`
- Create: `src/domain/Event/value-objects/EventStatus.test.ts`

**Context:** EventStatus has 5 states: scheduled, ongoing, completed, cancelled, postponed. Need transition rules (e.g., can't go from completed to scheduled).

**Step 1: Write failing tests**

Create `src/domain/Event/value-objects/EventStatus.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { EventStatus } from './EventStatus';
import { EventStatusValidationError } from '../errors/EventErrors';

describe('EventStatus', () => {
	describe('create', () => {
		it('should create valid scheduled status', () => {
			const result = EventStatus.create('scheduled');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('scheduled');
		});

		it('should create valid ongoing status', () => {
			const result = EventStatus.create('ongoing');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('ongoing');
		});

		it('should create valid completed status', () => {
			const result = EventStatus.create('completed');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('completed');
		});

		it('should create valid cancelled status', () => {
			const result = EventStatus.create('cancelled');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('cancelled');
		});

		it('should create valid postponed status', () => {
			const result = EventStatus.create('postponed');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('postponed');
		});

		it('should normalize uppercase to lowercase', () => {
			const result = EventStatus.create('SCHEDULED');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('scheduled');
		});

		it('should normalize mixed case to lowercase', () => {
			const result = EventStatus.create('OnGoing');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('ongoing');
		});

		it('should normalize kebab-case to snake_case for backwards compatibility', () => {
			const result = EventStatus.create('no-response');
			expect(result.isOk).toBe(true);
			// Note: This is for compatibility but EventStatus doesn't have no_response
			// Let's skip this test for EventStatus
		});

		it('should trim whitespace', () => {
			const result = EventStatus.create('  scheduled  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('scheduled');
		});

		it('should reject empty string', () => {
			const result = EventStatus.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventStatusValidationError);
			expect(result.error.message).toContain('Invalid event status');
		});

		it('should reject invalid status', () => {
			const result = EventStatus.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventStatusValidationError);
		});

		it('should reject whitespace-only string', () => {
			const result = EventStatus.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventStatusValidationError);
		});
	});

	describe('equals', () => {
		it('should return true for same status', () => {
			const status1 = EventStatus.create('scheduled').value;
			const status2 = EventStatus.create('scheduled').value;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different statuses', () => {
			const status1 = EventStatus.create('scheduled').value;
			const status2 = EventStatus.create('ongoing').value;
			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('status checks', () => {
		it('should identify scheduled status', () => {
			const status = EventStatus.create('scheduled').value;
			expect(status.isScheduled()).toBe(true);
			expect(status.isOngoing()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
			expect(status.isPostponed()).toBe(false);
		});

		it('should identify ongoing status', () => {
			const status = EventStatus.create('ongoing').value;
			expect(status.isScheduled()).toBe(false);
			expect(status.isOngoing()).toBe(true);
			expect(status.isCompleted()).toBe(false);
		});

		it('should identify completed status', () => {
			const status = EventStatus.create('completed').value;
			expect(status.isCompleted()).toBe(true);
			expect(status.isScheduled()).toBe(false);
		});

		it('should identify cancelled status', () => {
			const status = EventStatus.create('cancelled').value;
			expect(status.isCancelled()).toBe(true);
			expect(status.isScheduled()).toBe(false);
		});

		it('should identify postponed status', () => {
			const status = EventStatus.create('postponed').value;
			expect(status.isPostponed()).toBe(true);
			expect(status.isScheduled()).toBe(false);
		});
	});

	describe('canTransitionTo', () => {
		it('should allow scheduled -> ongoing transition', () => {
			const scheduled = EventStatus.create('scheduled').value;
			const ongoing = EventStatus.create('ongoing').value;
			expect(scheduled.canTransitionTo(ongoing)).toBe(true);
		});

		it('should allow scheduled -> cancelled transition', () => {
			const scheduled = EventStatus.create('scheduled').value;
			const cancelled = EventStatus.create('cancelled').value;
			expect(scheduled.canTransitionTo(cancelled)).toBe(true);
		});

		it('should allow scheduled -> postponed transition', () => {
			const scheduled = EventStatus.create('scheduled').value;
			const postponed = EventStatus.create('postponed').value;
			expect(scheduled.canTransitionTo(postponed)).toBe(true);
		});

		it('should allow ongoing -> completed transition', () => {
			const ongoing = EventStatus.create('ongoing').value;
			const completed = EventStatus.create('completed').value;
			expect(ongoing.canTransitionTo(completed)).toBe(true);
		});

		it('should allow ongoing -> cancelled transition', () => {
			const ongoing = EventStatus.create('ongoing').value;
			const cancelled = EventStatus.create('cancelled').value;
			expect(ongoing.canTransitionTo(cancelled)).toBe(true);
		});

		it('should allow postponed -> scheduled transition (rescheduling)', () => {
			const postponed = EventStatus.create('postponed').value;
			const scheduled = EventStatus.create('scheduled').value;
			expect(postponed.canTransitionTo(scheduled)).toBe(true);
		});

		it('should allow postponed -> cancelled transition', () => {
			const postponed = EventStatus.create('postponed').value;
			const cancelled = EventStatus.create('cancelled').value;
			expect(postponed.canTransitionTo(cancelled)).toBe(true);
		});

		it('should reject completed -> scheduled transition', () => {
			const completed = EventStatus.create('completed').value;
			const scheduled = EventStatus.create('scheduled').value;
			expect(completed.canTransitionTo(scheduled)).toBe(false);
		});

		it('should reject completed -> ongoing transition', () => {
			const completed = EventStatus.create('completed').value;
			const ongoing = EventStatus.create('ongoing').value;
			expect(completed.canTransitionTo(ongoing)).toBe(false);
		});

		it('should reject cancelled -> any transition (terminal state)', () => {
			const cancelled = EventStatus.create('cancelled').value;
			const scheduled = EventStatus.create('scheduled').value;
			const ongoing = EventStatus.create('ongoing').value;
			const completed = EventStatus.create('completed').value;
			expect(cancelled.canTransitionTo(scheduled)).toBe(false);
			expect(cancelled.canTransitionTo(ongoing)).toBe(false);
			expect(cancelled.canTransitionTo(completed)).toBe(false);
		});

		it('should allow same status transition (idempotent)', () => {
			const scheduled = EventStatus.create('scheduled').value;
			expect(scheduled.canTransitionTo(scheduled)).toBe(true);
		});
	});

	describe('toString', () => {
		it('should return status value as string', () => {
			const status = EventStatus.create('scheduled').value;
			expect(status.toString()).toBe('scheduled');
		});
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test src/domain/Event/value-objects/EventStatus.test.ts`

Expected: FAIL with "Cannot find module './EventStatus'"

**Step 3: Create EventStatus implementation**

Create `src/domain/Event/value-objects/EventStatus.ts`:

```typescript
import { Result } from '$domain/Result';
import { EventStatusValidationError } from '../errors/EventErrors';

export type EventStatusValue = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';

const VALID_STATUSES: readonly EventStatusValue[] = [
	'scheduled',
	'ongoing',
	'completed',
	'cancelled',
	'postponed'
] as const;

interface EventStatusProps {
	value: EventStatusValue;
}

export class EventStatus {
	private constructor(private readonly props: EventStatusProps) {}

	static create(status: string): Result<EventStatus, EventStatusValidationError> {
		const normalized = status.trim().toLowerCase() as EventStatusValue;

		if (!(VALID_STATUSES as readonly string[]).includes(normalized)) {
			return Result.error(
				new EventStatusValidationError(
					`Invalid event status: "${status}". Valid statuses are: ${VALID_STATUSES.join(', ')}`
				)
			);
		}

		return Result.ok(new EventStatus({ value: normalized }));
	}

	get value(): EventStatusValue {
		return this.props.value;
	}

	equals(other: EventStatus): boolean {
		return this.props.value === other.props.value;
	}

	isScheduled(): boolean {
		return this.props.value === 'scheduled';
	}

	isOngoing(): boolean {
		return this.props.value === 'ongoing';
	}

	isCompleted(): boolean {
		return this.props.value === 'completed';
	}

	isCancelled(): boolean {
		return this.props.value === 'cancelled';
	}

	isPostponed(): boolean {
		return this.props.value === 'postponed';
	}

	canTransitionTo(newStatus: EventStatus): boolean {
		const current = this.props.value;
		const next = newStatus.props.value;

		// Same status is always allowed (idempotent)
		if (current === next) {
			return true;
		}

		const validTransitions: Record<EventStatusValue, EventStatusValue[]> = {
			scheduled: ['ongoing', 'cancelled', 'postponed'],
			ongoing: ['completed', 'cancelled'],
			completed: [], // Terminal state
			cancelled: [], // Terminal state
			postponed: ['scheduled', 'cancelled'] // Can reschedule or cancel
		};

		return validTransitions[current].includes(next);
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 4: Create error placeholder**

Create `src/domain/Event/errors/EventErrors.ts`:

```typescript
export class EventError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EventError';
	}
}

export class EventStatusValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventStatusValidationError';
	}
}
```

**Step 5: Run tests to verify they pass**

Run: `npm run test src/domain/Event/value-objects/EventStatus.test.ts`

Expected: All 32 tests PASS

**Step 6: Commit**

```bash
git add src/domain/Event/value-objects/EventStatus.ts src/domain/Event/value-objects/EventStatus.test.ts src/domain/Event/errors/EventErrors.ts
git commit -m "feat(domain): add EventStatus value object with transition validation

- 5 statuses: scheduled, ongoing, completed, cancelled, postponed
- Transition validation (completed/cancelled are terminal)
- 32 passing tests"
```

---

## Task 2: EventType Value Object

**Goal:** Create EventType value object with 7 event types.

**Files:**

- Create: `src/domain/Event/value-objects/EventType.ts`
- Create: `src/domain/Event/value-objects/EventType.test.ts`
- Modify: `src/domain/Event/errors/EventErrors.ts`

**Context:** EventType has 7 types: meeting, training, review, social, holiday, time_off, other.

**Step 1: Write failing tests**

Create `src/domain/Event/value-objects/EventType.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { EventType } from './EventType';
import { EventTypeValidationError } from '../errors/EventErrors';

describe('EventType', () => {
	describe('create', () => {
		it('should create valid meeting type', () => {
			const result = EventType.create('meeting');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('meeting');
		});

		it('should create valid training type', () => {
			const result = EventType.create('training');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('training');
		});

		it('should create valid review type', () => {
			const result = EventType.create('review');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('review');
		});

		it('should create valid social type', () => {
			const result = EventType.create('social');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('social');
		});

		it('should create valid holiday type', () => {
			const result = EventType.create('holiday');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('holiday');
		});

		it('should create valid time_off type', () => {
			const result = EventType.create('time_off');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('time_off');
		});

		it('should create valid other type', () => {
			const result = EventType.create('other');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('other');
		});

		it('should normalize uppercase to lowercase', () => {
			const result = EventType.create('MEETING');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('meeting');
		});

		it('should normalize kebab-case to snake_case', () => {
			const result = EventType.create('time-off');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('time_off');
		});

		it('should trim whitespace', () => {
			const result = EventType.create('  meeting  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('meeting');
		});

		it('should reject empty string', () => {
			const result = EventType.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventTypeValidationError);
		});

		it('should reject invalid type', () => {
			const result = EventType.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventTypeValidationError);
		});
	});

	describe('equals', () => {
		it('should return true for same type', () => {
			const type1 = EventType.create('meeting').value;
			const type2 = EventType.create('meeting').value;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			const type1 = EventType.create('meeting').value;
			const type2 = EventType.create('training').value;
			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('type checks', () => {
		it('should identify meeting type', () => {
			const type = EventType.create('meeting').value;
			expect(type.isMeeting()).toBe(true);
			expect(type.isTraining()).toBe(false);
		});

		it('should identify training type', () => {
			const type = EventType.create('training').value;
			expect(type.isTraining()).toBe(true);
			expect(type.isMeeting()).toBe(false);
		});

		it('should identify holiday type', () => {
			const type = EventType.create('holiday').value;
			expect(type.isHoliday()).toBe(true);
		});

		it('should identify time_off type', () => {
			const type = EventType.create('time_off').value;
			expect(type.isTimeOff()).toBe(true);
		});
	});

	describe('toString', () => {
		it('should return type value as string', () => {
			const type = EventType.create('meeting').value;
			expect(type.toString()).toBe('meeting');
		});
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test src/domain/Event/value-objects/EventType.test.ts`

Expected: FAIL

**Step 3: Implement EventType**

Create `src/domain/Event/value-objects/EventType.ts`:

```typescript
import { Result } from '$domain/Result';
import { EventTypeValidationError } from '../errors/EventErrors';

export type EventTypeValue =
	| 'meeting'
	| 'training'
	| 'review'
	| 'social'
	| 'holiday'
	| 'time_off'
	| 'other';

const VALID_TYPES: readonly EventTypeValue[] = [
	'meeting',
	'training',
	'review',
	'social',
	'holiday',
	'time_off',
	'other'
] as const;

interface EventTypeProps {
	value: EventTypeValue;
}

export class EventType {
	private constructor(private readonly props: EventTypeProps) {}

	static create(type: string): Result<EventType, EventTypeValidationError> {
		const normalized = type.trim().toLowerCase().replace(/-/g, '_') as EventTypeValue;

		if (!(VALID_TYPES as readonly string[]).includes(normalized)) {
			return Result.error(
				new EventTypeValidationError(
					`Invalid event type: "${type}". Valid types are: ${VALID_TYPES.join(', ')}`
				)
			);
		}

		return Result.ok(new EventType({ value: normalized }));
	}

	get value(): EventTypeValue {
		return this.props.value;
	}

	equals(other: EventType): boolean {
		return this.props.value === other.props.value;
	}

	isMeeting(): boolean {
		return this.props.value === 'meeting';
	}

	isTraining(): boolean {
		return this.props.value === 'training';
	}

	isReview(): boolean {
		return this.props.value === 'review';
	}

	isSocial(): boolean {
		return this.props.value === 'social';
	}

	isHoliday(): boolean {
		return this.props.value === 'holiday';
	}

	isTimeOff(): boolean {
		return this.props.value === 'time_off';
	}

	isOther(): boolean {
		return this.props.value === 'other';
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 4: Add error class**

Modify `src/domain/Event/errors/EventErrors.ts`:

```typescript
export class EventError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EventError';
	}
}

export class EventStatusValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventStatusValidationError';
	}
}

export class EventTypeValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventTypeValidationError';
	}
}
```

**Step 5: Run tests**

Run: `npm run test src/domain/Event/value-objects/EventType.test.ts`

Expected: All 20 tests PASS

**Step 6: Commit**

```bash
git add src/domain/Event/value-objects/EventType.ts src/domain/Event/value-objects/EventType.test.ts src/domain/Event/errors/EventErrors.ts
git commit -m "feat(domain): add EventType value object

- 7 types: meeting, training, review, social, holiday, time_off, other
- Normalization (kebab-case to snake_case)
- 20 passing tests"
```

---

## Task 3: EventTitle Value Object

**Goal:** Create EventTitle value object (1-200 characters).

**Files:**

- Create: `src/domain/Event/value-objects/EventTitle.ts`
- Create: `src/domain/Event/value-objects/EventTitle.test.ts`
- Modify: `src/domain/Event/errors/EventErrors.ts`

**Step 1: Write failing tests**

Create `src/domain/Event/value-objects/EventTitle.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { EventTitle } from './EventTitle';
import { EventTitleValidationError } from '../errors/EventErrors';

describe('EventTitle', () => {
	describe('create', () => {
		it('should create valid title with minimum length', () => {
			const result = EventTitle.create('A');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('A');
		});

		it('should create valid title with typical length', () => {
			const result = EventTitle.create('Team Meeting');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Team Meeting');
		});

		it('should create valid title at maximum length (200 chars)', () => {
			const longTitle = 'A'.repeat(200);
			const result = EventTitle.create(longTitle);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(longTitle);
		});

		it('should trim whitespace', () => {
			const result = EventTitle.create('  Team Meeting  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Team Meeting');
		});

		it('should reject empty string', () => {
			const result = EventTitle.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventTitleValidationError);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should reject whitespace-only string', () => {
			const result = EventTitle.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventTitleValidationError);
		});

		it('should reject title exceeding 200 characters', () => {
			const longTitle = 'A'.repeat(201);
			const result = EventTitle.create(longTitle);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventTitleValidationError);
			expect(result.error.message).toContain('200 characters');
		});
	});

	describe('equals', () => {
		it('should return true for same title', () => {
			const title1 = EventTitle.create('Team Meeting').value;
			const title2 = EventTitle.create('Team Meeting').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different titles', () => {
			const title1 = EventTitle.create('Team Meeting').value;
			const title2 = EventTitle.create('All Hands').value;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const title1 = EventTitle.create('Team Meeting').value;
			const title2 = EventTitle.create('team meeting').value;
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return title value as string', () => {
			const title = EventTitle.create('Team Meeting').value;
			expect(title.toString()).toBe('Team Meeting');
		});
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test src/domain/Event/value-objects/EventTitle.test.ts`

Expected: FAIL

**Step 3: Implement EventTitle**

Create `src/domain/Event/value-objects/EventTitle.ts`:

```typescript
import { Result } from '$domain/Result';
import { EventTitleValidationError } from '../errors/EventErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 200;

interface EventTitleProps {
	value: string;
}

export class EventTitle {
	private constructor(private readonly props: EventTitleProps) {}

	static create(title: string): Result<EventTitle, EventTitleValidationError> {
		const trimmed = title.trim();

		if (trimmed.length === 0) {
			return Result.error(new EventTitleValidationError('Event title cannot be empty'));
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new EventTitleValidationError(
					`Event title must not exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new EventTitle({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	equals(other: EventTitle): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 4: Add error, run tests, commit**

```bash
git add src/domain/Event/value-objects/EventTitle.ts src/domain/Event/value-objects/EventTitle.test.ts src/domain/Event/errors/EventErrors.ts
git commit -m "feat(domain): add EventTitle value object (1-200 chars, 13 tests)"
```

---

## Task 4-8: Remaining Value Objects (Condensed)

Following the same TDD pattern (tests → implementation → commit), create these value objects:

### Task 4: EventDescription (0-2000 chars, optional)

- File: `src/domain/Event/value-objects/EventDescription.ts` + `.test.ts`
- 10 tests: empty string allowed, max 2000 chars, trimming
- Commit: `"feat(domain): add EventDescription value object (0-2000 chars, 10 tests)"`

### Task 5: EventTime (start/end validation, timezone)

- File: `src/domain/Event/value-objects/EventTime.ts` + `.test.ts`
- Props: `startTime: Date, endTime: Date`
- Validation: endTime >= startTime, defensive date copies (input AND output)
- 18 tests: valid times, end before start error, all-day events, defensive copies
- Commit: `"feat(domain): add EventTime value object (start/end validation, 18 tests)"`

### Task 6: Location (0-500 chars, optional)

- File: `src/domain/Event/value-objects/Location.ts` + `.test.ts`
- 8 tests: empty allowed, max 500 chars, trimming
- Commit: `"feat(domain): add Location value object (0-500 chars, 8 tests)"`

### Task 7: RsvpStatus (6 statuses)

- File: `src/domain/Event/value-objects/RsvpStatus.ts` + `.test.ts`
- Statuses: pending, accepted, declined, tentative, no_response, waitlisted
- 15 tests: all 6 statuses, normalization, checks (isAccepted, isPending, etc.)
- Commit: `"feat(domain): add RsvpStatus value object (6 statuses, 15 tests)"`

### Task 8: EventColor (hex color validation)

- File: `src/domain/Event/value-objects/EventColor.ts` + `.test.ts`
- Validation: `#RRGGBB` or `#RGB` format
- 12 tests: valid formats, invalid formats, normalization to 6-digit
- Commit: `"feat(domain): add EventColor value object (hex validation, 12 tests)"`

**Total Value Objects Tests:** EventStatus(32) + EventType(20) + EventTitle(13) + EventDescription(10) + EventTime(18) + Location(8) + RsvpStatus(15) + EventColor(12) = **128 tests**

---

## Task 9: EventAttendee Entity

**Goal:** Create EventAttendee entity for RSVP management.

**Files:**

- Create: `src/domain/Event/entities/EventAttendee.ts`
- Create: `src/domain/Event/entities/EventAttendee.test.ts`

**Step 1: Write failing tests**

Create `src/domain/Event/entities/EventAttendee.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { EventAttendee, type EventAttendeeProps } from './EventAttendee';
import { RsvpStatus } from '../value-objects/RsvpStatus';
import { EventAttendeeValidationError } from '../errors/EventErrors';

describe('EventAttendee', () => {
	const validProps: EventAttendeeProps = {
		id: 'attendee-123',
		eventId: 'event-456',
		employeeId: 'emp-789',
		responseStatus: RsvpStatus.create('pending').value,
		isRequired: false,
		isOrganizer: false,
		reminderTime: null,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-01T00:00:00Z')
	};

	describe('create', () => {
		it('should create valid attendee', () => {
			const result = EventAttendee.create(validProps);
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('attendee-123');
			expect(result.value.eventId).toBe('event-456');
			expect(result.value.employeeId).toBe('emp-789');
		});

		it('should create attendee with reminder time', () => {
			const result = EventAttendee.create({
				...validProps,
				reminderTime: 30 // 30 minutes before
			});
			expect(result.isOk).toBe(true);
			expect(result.value.reminderTime).toBe(30);
		});

		it('should create organizer attendee', () => {
			const result = EventAttendee.create({
				...validProps,
				isOrganizer: true
			});
			expect(result.isOk).toBe(true);
			expect(result.value.isOrganizer).toBe(true);
		});

		it('should defend against date mutation (createdAt)', () => {
			const createdAt = new Date('2026-01-01T00:00:00Z');
			const result = EventAttendee.create({ ...validProps, createdAt });
			createdAt.setFullYear(2099);
			expect(result.value.createdAt.getFullYear()).toBe(2026);
		});

		it('should defend against date mutation on getter (createdAt)', () => {
			const result = EventAttendee.create(validProps);
			const retrieved = result.value.createdAt;
			retrieved.setFullYear(2099);
			expect(result.value.createdAt.getFullYear()).toBe(2026);
		});
	});

	describe('updateResponse', () => {
		it('should update RSVP status', () => {
			const attendee = EventAttendee.create(validProps).value;
			const accepted = RsvpStatus.create('accepted').value;
			const updated = attendee.updateResponse(accepted);

			expect(updated.responseStatus.value).toBe('accepted');
			expect(updated.updatedAt.getTime()).toBeGreaterThan(attendee.updatedAt.getTime());
		});

		it('should preserve immutability', () => {
			const original = EventAttendee.create(validProps).value;
			const accepted = RsvpStatus.create('accepted').value;
			const updated = original.updateResponse(accepted);

			expect(original.responseStatus.value).toBe('pending');
			expect(updated.responseStatus.value).toBe('accepted');
			expect(original.id).toBe(updated.id);
		});
	});

	describe('setReminder', () => {
		it('should set reminder time', () => {
			const attendee = EventAttendee.create(validProps).value;
			const updated = attendee.setReminder(60);

			expect(updated.reminderTime).toBe(60);
			expect(updated.updatedAt.getTime()).toBeGreaterThan(attendee.updatedAt.getTime());
		});

		it('should clear reminder time', () => {
			const attendee = EventAttendee.create({ ...validProps, reminderTime: 30 }).value;
			const updated = attendee.setReminder(null);

			expect(updated.reminderTime).toBeNull();
		});
	});

	describe('equals', () => {
		it('should return true for same ID', () => {
			const attendee1 = EventAttendee.create(validProps).value;
			const attendee2 = EventAttendee.create(validProps).value;
			expect(attendee1.equals(attendee2)).toBe(true);
		});

		it('should return false for different IDs', () => {
			const attendee1 = EventAttendee.create(validProps).value;
			const attendee2 = EventAttendee.create({ ...validProps, id: 'different' }).value;
			expect(attendee1.equals(attendee2)).toBe(false);
		});
	});
});
```

**Step 2: Implement EventAttendee**

```typescript
import { Result } from '$domain/Result';
import { RsvpStatus } from '../value-objects/RsvpStatus';
import { EventAttendeeValidationError } from '../errors/EventErrors';

export interface EventAttendeeProps {
	id: string;
	eventId: string;
	employeeId: string;
	responseStatus: RsvpStatus;
	isRequired: boolean;
	isOrganizer: boolean;
	reminderTime: number | null; // Minutes before event
	createdAt: Date;
	updatedAt: Date;
}

export class EventAttendee {
	private constructor(private readonly props: EventAttendeeProps) {}

	static create(props: EventAttendeeProps): Result<EventAttendee, EventAttendeeValidationError> {
		// Defensive date copies
		const safePro props = {
			...props,
			createdAt: new Date(props.createdAt.getTime()),
			updatedAt: new Date(props.updatedAt.getTime())
		};

		return Result.ok(new EventAttendee(safeProps));
	}

	get id(): string {
		return this.props.id;
	}

	get eventId(): string {
		return this.props.eventId;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get responseStatus(): RsvpStatus {
		return this.props.responseStatus;
	}

	get isRequired(): boolean {
		return this.props.isRequired;
	}

	get isOrganizer(): boolean {
		return this.props.isOrganizer;
	}

	get reminderTime(): number | null {
		return this.props.reminderTime;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt.getTime());
	}

	get updatedAt(): Date {
		return new Date(this.props.updatedAt.getTime());
	}

	updateResponse(newStatus: RsvpStatus): EventAttendee {
		return new EventAttendee({
			...this.props,
			responseStatus: newStatus,
			updatedAt: new Date()
		});
	}

	setReminder(minutes: number | null): EventAttendee {
		return new EventAttendee({
			...this.props,
			reminderTime: minutes,
			updatedAt: new Date()
		});
	}

	equals(other: EventAttendee): boolean {
		return this.props.id === other.props.id;
	}
}
```

**Step 3: Run tests, commit**

```bash
git add src/domain/Event/entities/EventAttendee.ts src/domain/Event/entities/EventAttendee.test.ts
git commit -m "feat(domain): add EventAttendee entity (15 tests)"
```

---

## Task 10: Event Entity

**Goal:** Create Event entity (main aggregate).

**Files:**

- Create: `src/domain/Event/entities/Event.ts`
- Create: `src/domain/Event/entities/Event.test.ts`

**Key Features:**

- Aggregates EventAttendee entities
- Status transition validation via EventStatus.canTransitionTo()
- Business logic: addAttendee(), removeAttendee(), updateStatus()
- Defensive date copies (input AND output)

**Tests:** 35 tests covering:

- Creation validation
- Status transitions
- Attendee management
- Date immutability
- equals() method

**Commit:**

```bash
git commit -m "feat(domain): add Event entity with attendee aggregation (35 tests)"
```

---

## Task 11: Domain Layer Barrel Exports

**Goal:** Create index files for clean imports.

**Files:**

- Modify: `src/domain/Event/errors/EventErrors.ts` (complete hierarchy)
- Create: `src/domain/Event/index.ts`

**Step 1: Complete error hierarchy**

All error classes:

- EventError (base)
- EventValidationError extends EventError
- EventNotFoundError extends EventError
- EventStatusValidationError, EventTypeValidationError, EventTitleValidationError, etc.

**Step 2: Create barrel export**

`src/domain/Event/index.ts`:

```typescript
// Value Objects
export { EventStatus, type EventStatusValue } from './value-objects/EventStatus';
export { EventType, type EventTypeValue } from './value-objects/EventType';
export { EventTitle } from './value-objects/EventTitle';
export { EventDescription } from './value-objects/EventDescription';
export { EventTime } from './value-objects/EventTime';
export { Location } from './value-objects/Location';
export { RsvpStatus, type RsvpStatusValue } from './value-objects/RsvpStatus';
export { EventColor } from './value-objects/EventColor';

// Entities
export { EventAttendee, type EventAttendeeProps } from './entities/EventAttendee';
export { Event, type EventProps } from './entities/Event';

// Errors
export {
	EventError,
	EventValidationError,
	EventNotFoundError,
	EventStatusValidationError,
	EventTypeValidationError,
	EventTitleValidationError,
	EventDescriptionValidationError,
	EventTimeValidationError,
	LocationValidationError,
	RsvpStatusValidationError,
	EventColorValidationError,
	EventAttendeeValidationError
} from './errors/EventErrors';
```

**Commit:**

```bash
git commit -m "feat(domain): add Event domain layer barrel exports"
```

---

## Task 12: EventRepository Port Interface

**Goal:** Create port interface for Event repository.

**Files:**

- Create: `src/services/ports/EventRepository.ts`

**Content:**

```typescript
import { Result } from '$domain/Result';
import {
	Event,
	EventAttendee,
	EventNotFoundError,
	EventValidationError,
	EventError
} from '$domain/Event';

export interface EventFilter {
	status?: string;
	eventType?: string;
	organizerId?: string;
	upcomingOnly?: boolean;
	limit?: number;
	offset?: number;
}

export interface CreateEventData {
	title: string;
	description?: string;
	eventType: string;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
	location?: string;
	organizerId: string;
	status?: string;
	color?: string;
	isPublic: boolean;
}

export interface UpdateEventData {
	title?: string;
	description?: string;
	eventType?: string;
	startTime?: Date;
	endTime?: Date;
	isAllDay?: boolean;
	location?: string;
	status?: string;
	color?: string;
	isPublic?: boolean;
}

export interface EventRepository {
	findById(id: string): Promise<Result<Event, EventNotFoundError>>;
	findAll(filter?: EventFilter): Promise<Result<Event[], EventError>>;
	create(data: CreateEventData): Promise<Result<Event, EventValidationError>>;
	update(id: string, data: UpdateEventData): Promise<Result<Event, EventError>>;
	delete(id: string): Promise<Result<void, EventNotFoundError>>;

	// Attendee operations
	addAttendee(
		eventId: string,
		employeeId: string,
		isRequired: boolean
	): Promise<Result<EventAttendee, EventError>>;
	updateAttendeeResponse(
		attendeeId: string,
		status: string
	): Promise<Result<EventAttendee, EventError>>;
	setAttendeeReminder(
		attendeeId: string,
		minutes: number | null
	): Promise<Result<EventAttendee, EventError>>;
}
```

**Commit:**

```bash
git commit -m "feat(service): add EventRepository port interface"
```

---

## Task 13: EventService

**Goal:** Create EventService with business logic.

**Files:**

- Create: `src/services/EventService.ts`
- Create: `src/services/EventService.test.ts`

**Methods (10):**

1. getEventById()
2. getAllEvents()
3. createEvent()
4. updateEvent()
5. deleteEvent()
6. addAttendee()
7. updateRsvp()
8. setReminder()
9. getUpcomingEvents()
10. getUserEvents()

**Tests:** 28 tests with MockEventRepository

**Critical:** Add try-catch blocks to all async methods (learned from Goals module)

**Commit:**

```bash
git commit -m "feat(service): add EventService with RSVP logic (28 tests)"
```

---

## Task 14: GraphQLEventAdapter

**Goal:** Implement GraphQL adapter for EventRepository.

**Files:**

- Create: `src/adapters/graphql/GraphQLEventAdapter.ts`
- Create: `src/adapters/graphql/GraphQLEventAdapter.test.ts`

**Features:**

- Implements EventRepository port
- Maps GraphQL responses to domain entities
- Resilient error handling (skip invalid data in findAll)
- Uses existing GraphQL queries/mutations

**Tests:** 24 tests (findById, findAll, create, update, delete, attendee operations)

**Commit:**

```bash
git commit -m "feat(adapter): add GraphQLEventAdapter (24 tests)"
```

---

## Task 15: Service Factory

**Goal:** Create DI factory for EventService.

**Files:**

- Create: `src/lib/services/eventServiceFactory.ts`

**Content:**

```typescript
import type { RequestEvent } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLEventAdapter } from '$adapters/graphql/GraphQLEventAdapter';
import { EventService } from '$services/EventService';

export function createEventService(event: RequestEvent): EventService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);
	const adapter = new GraphQLEventAdapter(client);
	return new EventService(adapter);
}
```

**Commit:**

```bash
git commit -m "feat(service): add eventServiceFactory for DI"
```

---

## Task 16: ServiceContainer Integration

**Goal:** Add EventService to ServiceContainer.

**Files:**

- Modify: `src/lib/server/services.ts`

**Changes:**

1. Import EventService and createEventService
2. Add `_eventService` private field
3. Add `eventService` getter with lazy initialization
4. Add `createEventService` re-export

**Commit:**

```bash
git commit -m "feat(service): integrate EventService into ServiceContainer"
```

---

## Task 17: Migration Completion Report

**Goal:** Document migration results.

**Files:**

- Create: `docs/architecture/events-hexagonal-migration-completion.md`

**Sections:**

1. Executive Summary
2. Architecture Transformation
3. Domain Layer Details
4. Service Layer Details
5. Adapter Layer Details
6. Test Coverage
7. Metrics
8. Lessons Learned
9. Next Steps

**Commit:**

```bash
git commit -m "docs: add Events module hexagonal migration completion report"
```

---

## Task 18: Update Memory

**Goal:** Update project memory with Events module completion.

**Files:**

- Modify: `~/.claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md`

**Changes:**

- Update completed modules: 8/23 → 9/23
- Add Events (90/100) to completed list
- Update remaining count: 14 modules

**Commit:**

```bash
git commit -m "docs: update memory with Events module completion"
```

---

## Execution Summary

**Total Tasks:** 18
**Estimated Tests:** 250-280
**Estimated Time:** 3-4 days
**Target Score:** 10/100 → 90/100

**Test Breakdown:**

- Value Objects (Tasks 1-8): 128 tests
- EventAttendee Entity (Task 9): 15 tests
- Event Entity (Task 10): 35 tests
- EventService (Task 13): 28 tests
- GraphQLEventAdapter (Task 14): 24 tests
- **Total:** ~230 tests

**Key Patterns:**

- Result<T, E> for error handling
- Private constructor + static create() factory
- Immutability (defensive date copies, new instances on updates)
- Try-catch blocks in service/adapter layers
- Port/adapter separation

---

## Ready for Execution

Plan complete! Use **superpowers:subagent-driven-development** to execute this plan task-by-task in the current session.
