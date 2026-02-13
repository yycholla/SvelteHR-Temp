# Notifications Module Hexagonal Architecture Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate Notifications module from Direct GraphQL to hexagonal architecture with comprehensive domain layer

**Architecture:** Create domain value objects (NotificationType, NotificationCategory, NotificationPriority, NotificationTitle, NotificationMessage, ReadStatus), Notification entity, NotificationService, and GraphQLNotificationAdapter following the established Employee/Events pattern

**Tech Stack:** TypeScript 5, Vitest 3.2, Result<T,E> pattern, URQL GraphQL client

**Current State:**

- Location: `src/lib/graphql/notifications/`, `src/lib/services/notification-service.ts`
- Complexity: Medium (1089 LOC, 15% test coverage)
- Pattern: Direct GraphQL + placeholder service layer
- Backend: Rust with comprehensive enums (NotificationType, NotificationCategory, NotificationResourceType)

**Target State:**

- Architecture score: 15/100 → 90/100
- Test coverage: 15% → 85%+
- Estimated tests: 180+ (domain: 140+, service: 20+, adapter: 20+)
- Zero `any` types throughout

**Reference Implementation:** `src/domain/Event/` (90/100, 226 tests)

---

## Domain Layer (Tasks 1-8)

### Task 1: NotificationType Value Object

Create value object for notification type with 10 backend-aligned types.

**Files:**

- Create: `src/domain/Notification/value-objects/NotificationType.ts`
- Create: `src/domain/Notification/value-objects/NotificationType.test.ts`

**Step 1: Write failing tests**

Create test file with 20 comprehensive tests:

```typescript
// src/domain/Notification/value-objects/NotificationType.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationType } from './NotificationType';
import { NotificationTypeValidationError } from '../errors/NotificationErrors';

describe('NotificationType', () => {
	describe('create()', () => {
		describe('valid types', () => {
			it('should create Info type', () => {
				const result = NotificationType.create('info');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('info');
			});

			it('should create Warning type', () => {
				const result = NotificationType.create('warning');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('warning');
			});

			it('should create Success type', () => {
				const result = NotificationType.create('success');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('success');
			});

			it('should create Error type', () => {
				const result = NotificationType.create('error');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('error');
			});

			it('should create TaskAssigned type', () => {
				const result = NotificationType.create('task_assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task_assigned');
			});

			it('should create TaskCompleted type', () => {
				const result = NotificationType.create('task_completed');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task_completed');
			});

			it('should create LeaveApproved type', () => {
				const result = NotificationType.create('leave_approved');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('leave_approved');
			});

			it('should create LeaveRejected type', () => {
				const result = NotificationType.create('leave_rejected');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('leave_rejected');
			});

			it('should create ReviewScheduled type', () => {
				const result = NotificationType.create('review_scheduled');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('review_scheduled');
			});

			it('should create EventReminder type', () => {
				const result = NotificationType.create('event_reminder');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('event_reminder');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = NotificationType.create('INFO');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('info');
			});

			it('should normalize mixed case to lowercase', () => {
				const result = NotificationType.create('Task_Assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task_assigned');
			});

			it('should trim whitespace', () => {
				const result = NotificationType.create('  warning  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('warning');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationType.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
				expect(result.error.message).toContain('Invalid notification type');
			});

			it('should reject invalid type', () => {
				const result = NotificationType.create('invalid_type');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationType.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same type', () => {
			const type1 = NotificationType.create('info').value;
			const type2 = NotificationType.create('info').value;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			const type1 = NotificationType.create('info').value;
			const type2 = NotificationType.create('warning').value;
			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('isSystemType()', () => {
		it('should return true for system types', () => {
			const info = NotificationType.create('info').value;
			const warning = NotificationType.create('warning').value;
			const success = NotificationType.create('success').value;
			const error = NotificationType.create('error').value;

			expect(info.isSystemType()).toBe(true);
			expect(warning.isSystemType()).toBe(true);
			expect(success.isSystemType()).toBe(true);
			expect(error.isSystemType()).toBe(true);
		});

		it('should return false for non-system types', () => {
			const taskAssigned = NotificationType.create('task_assigned').value;
			const leaveApproved = NotificationType.create('leave_approved').value;

			expect(taskAssigned.isSystemType()).toBe(false);
			expect(leaveApproved.isSystemType()).toBe(false);
		});
	});
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationType.test.ts`
Expected: FAIL - "Cannot find module './NotificationType'"

**Step 3: Create error classes**

```typescript
// src/domain/Notification/errors/NotificationErrors.ts
export class NotificationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationError';
	}
}

export class NotificationTypeValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationTypeValidationError';
	}
}

export class NotificationCategoryValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationCategoryValidationError';
	}
}

export class NotificationPriorityValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationPriorityValidationError';
	}
}

export class NotificationTitleValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationTitleValidationError';
	}
}

export class NotificationMessageValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationMessageValidationError';
	}
}

export class NotificationNotFoundError extends NotificationError {
	constructor(id: string) {
		super(`Notification not found: ${id}`);
		this.name = 'NotificationNotFoundError';
	}
}

export class NotificationValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationValidationError';
	}
}
```

**Step 4: Implement NotificationType**

```typescript
// src/domain/Notification/value-objects/NotificationType.ts
import { Result } from '$domain/Result';
import { NotificationTypeValidationError } from '../errors/NotificationErrors';

type NotificationTypeValue =
	| 'info'
	| 'warning'
	| 'success'
	| 'error'
	| 'task_assigned'
	| 'task_completed'
	| 'leave_approved'
	| 'leave_rejected'
	| 'review_scheduled'
	| 'event_reminder';

const VALID_TYPES: readonly NotificationTypeValue[] = [
	'info',
	'warning',
	'success',
	'error',
	'task_assigned',
	'task_completed',
	'leave_approved',
	'leave_rejected',
	'review_scheduled',
	'event_reminder'
] as const;

const SYSTEM_TYPES: readonly NotificationTypeValue[] = [
	'info',
	'warning',
	'success',
	'error'
] as const;

export class NotificationType {
	private constructor(private readonly props: { value: NotificationTypeValue }) {}

	static create(type: string): Result<NotificationType, NotificationTypeValidationError> {
		const normalized = type.trim().toLowerCase() as NotificationTypeValue;

		if (!(VALID_TYPES as readonly string[]).includes(normalized)) {
			return Result.error(
				new NotificationTypeValidationError(
					`Invalid notification type: "${type}". Must be one of: ${VALID_TYPES.join(', ')}`
				)
			);
		}

		return Result.ok(new NotificationType({ value: normalized }));
	}

	get value(): NotificationTypeValue {
		return this.props.value;
	}

	isSystemType(): boolean {
		return (SYSTEM_TYPES as readonly string[]).includes(this.props.value);
	}

	equals(other: NotificationType): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 5: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationType.test.ts`
Expected: PASS - 20/20 tests

**Step 6: Commit**

```bash
git add src/domain/Notification/value-objects/NotificationType.ts \
  src/domain/Notification/value-objects/NotificationType.test.ts \
  src/domain/Notification/errors/NotificationErrors.ts
git commit -m "feat(notifications): add NotificationType value object with 20 tests"
```

---

### Task 2: NotificationCategory Value Object

Create value object for notification category with 7 backend-aligned categories.

**Files:**

- Create: `src/domain/Notification/value-objects/NotificationCategory.ts`
- Create: `src/domain/Notification/value-objects/NotificationCategory.test.ts`

**Step 1: Write failing tests (18 tests)**

```typescript
// src/domain/Notification/value-objects/NotificationCategory.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationCategory } from './NotificationCategory';
import { NotificationCategoryValidationError } from '../errors/NotificationErrors';

describe('NotificationCategory', () => {
	describe('create()', () => {
		describe('valid categories', () => {
			it('should create System category', () => {
				const result = NotificationCategory.create('system');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('system');
			});

			it('should create Task category', () => {
				const result = NotificationCategory.create('task');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task');
			});

			it('should create Leave category', () => {
				const result = NotificationCategory.create('leave');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('leave');
			});

			it('should create Performance category', () => {
				const result = NotificationCategory.create('performance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('performance');
			});

			it('should create Event category', () => {
				const result = NotificationCategory.create('event');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('event');
			});

			it('should create Document category', () => {
				const result = NotificationCategory.create('document');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('document');
			});

			it('should create Compliance category', () => {
				const result = NotificationCategory.create('compliance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('compliance');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = NotificationCategory.create('SYSTEM');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('system');
			});

			it('should normalize mixed case to lowercase', () => {
				const result = NotificationCategory.create('Performance');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('performance');
			});

			it('should trim whitespace', () => {
				const result = NotificationCategory.create('  task  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationCategory.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
			});

			it('should reject invalid category', () => {
				const result = NotificationCategory.create('invalid_category');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationCategory.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationCategoryValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same category', () => {
			const cat1 = NotificationCategory.create('system').value;
			const cat2 = NotificationCategory.create('system').value;
			expect(cat1.equals(cat2)).toBe(true);
		});

		it('should return false for different categories', () => {
			const cat1 = NotificationCategory.create('system').value;
			const cat2 = NotificationCategory.create('task').value;
			expect(cat1.equals(cat2)).toBe(false);
		});
	});

	describe('getDisplayName()', () => {
		it('should return capitalized display name for System', () => {
			const category = NotificationCategory.create('system').value;
			expect(category.getDisplayName()).toBe('System');
		});

		it('should return capitalized display name for Task', () => {
			const category = NotificationCategory.create('task').value;
			expect(category.getDisplayName()).toBe('Task');
		});

		it('should return capitalized display name for Performance', () => {
			const category = NotificationCategory.create('performance').value;
			expect(category.getDisplayName()).toBe('Performance');
		});
	});
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationCategory.test.ts`
Expected: FAIL

**Step 3: Implement NotificationCategory**

```typescript
// src/domain/Notification/value-objects/NotificationCategory.ts
import { Result } from '$domain/Result';
import { NotificationCategoryValidationError } from '../errors/NotificationErrors';

type NotificationCategoryValue =
	| 'system'
	| 'task'
	| 'leave'
	| 'performance'
	| 'event'
	| 'document'
	| 'compliance';

const VALID_CATEGORIES: readonly NotificationCategoryValue[] = [
	'system',
	'task',
	'leave',
	'performance',
	'event',
	'document',
	'compliance'
] as const;

export class NotificationCategory {
	private constructor(private readonly props: { value: NotificationCategoryValue }) {}

	static create(
		category: string
	): Result<NotificationCategory, NotificationCategoryValidationError> {
		const normalized = category.trim().toLowerCase() as NotificationCategoryValue;

		if (!(VALID_CATEGORIES as readonly string[]).includes(normalized)) {
			return Result.error(
				new NotificationCategoryValidationError(
					`Invalid notification category: "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`
				)
			);
		}

		return Result.ok(new NotificationCategory({ value: normalized }));
	}

	get value(): NotificationCategoryValue {
		return this.props.value;
	}

	getDisplayName(): string {
		return this.props.value.charAt(0).toUpperCase() + this.props.value.slice(1);
	}

	equals(other: NotificationCategory): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationCategory.test.ts`
Expected: PASS - 18/18 tests

**Step 5: Commit**

```bash
git add src/domain/Notification/value-objects/NotificationCategory.ts \
  src/domain/Notification/value-objects/NotificationCategory.test.ts
git commit -m "feat(notifications): add NotificationCategory value object with 18 tests"
```

---

### Task 3: NotificationPriority Value Object

Create value object for notification priority (critical, high, medium, normal, low).

**Files:**

- Create: `src/domain/Notification/value-objects/NotificationPriority.ts`
- Create: `src/domain/Notification/value-objects/NotificationPriority.test.ts`

**Step 1: Write failing tests (22 tests)**

```typescript
// src/domain/Notification/value-objects/NotificationPriority.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationPriority } from './NotificationPriority';
import { NotificationPriorityValidationError } from '../errors/NotificationErrors';

describe('NotificationPriority', () => {
	describe('create()', () => {
		describe('valid priorities', () => {
			it('should create Critical priority', () => {
				const result = NotificationPriority.create('critical');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('critical');
			});

			it('should create High priority', () => {
				const result = NotificationPriority.create('high');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('high');
			});

			it('should create Medium priority', () => {
				const result = NotificationPriority.create('medium');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('medium');
			});

			it('should create Normal priority', () => {
				const result = NotificationPriority.create('normal');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('normal');
			});

			it('should create Low priority', () => {
				const result = NotificationPriority.create('low');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('low');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = NotificationPriority.create('CRITICAL');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('critical');
			});

			it('should trim whitespace', () => {
				const result = NotificationPriority.create('  high  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('high');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationPriority.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
			});

			it('should reject invalid priority', () => {
				const result = NotificationPriority.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationPriorityValidationError);
			});
		});
	});

	describe('compareTo()', () => {
		it('should return negative when this priority is higher', () => {
			const critical = NotificationPriority.create('critical').value;
			const high = NotificationPriority.create('high').value;
			expect(critical.compareTo(high)).toBeLessThan(0);
		});

		it('should return positive when this priority is lower', () => {
			const low = NotificationPriority.create('low').value;
			const high = NotificationPriority.create('high').value;
			expect(low.compareTo(high)).toBeGreaterThan(0);
		});

		it('should return zero when priorities are equal', () => {
			const normal1 = NotificationPriority.create('normal').value;
			const normal2 = NotificationPriority.create('normal').value;
			expect(normal1.compareTo(normal2)).toBe(0);
		});
	});

	describe('isHigherThan()', () => {
		it('should return true when this priority is higher', () => {
			const critical = NotificationPriority.create('critical').value;
			const normal = NotificationPriority.create('normal').value;
			expect(critical.isHigherThan(normal)).toBe(true);
		});

		it('should return false when this priority is lower', () => {
			const low = NotificationPriority.create('low').value;
			const high = NotificationPriority.create('high').value;
			expect(low.isHigherThan(high)).toBe(false);
		});

		it('should return false when priorities are equal', () => {
			const normal1 = NotificationPriority.create('normal').value;
			const normal2 = NotificationPriority.create('normal').value;
			expect(normal1.isHigherThan(normal2)).toBe(false);
		});
	});

	describe('getNumericValue()', () => {
		it('should return 0 for critical', () => {
			const priority = NotificationPriority.create('critical').value;
			expect(priority.getNumericValue()).toBe(0);
		});

		it('should return 1 for high', () => {
			const priority = NotificationPriority.create('high').value;
			expect(priority.getNumericValue()).toBe(1);
		});

		it('should return 2 for medium', () => {
			const priority = NotificationPriority.create('medium').value;
			expect(priority.getNumericValue()).toBe(2);
		});

		it('should return 3 for normal', () => {
			const priority = NotificationPriority.create('normal').value;
			expect(priority.getNumericValue()).toBe(3);
		});

		it('should return 4 for low', () => {
			const priority = NotificationPriority.create('low').value;
			expect(priority.getNumericValue()).toBe(4);
		});
	});

	describe('equals()', () => {
		it('should return true for same priority', () => {
			const p1 = NotificationPriority.create('high').value;
			const p2 = NotificationPriority.create('high').value;
			expect(p1.equals(p2)).toBe(true);
		});

		it('should return false for different priorities', () => {
			const p1 = NotificationPriority.create('high').value;
			const p2 = NotificationPriority.create('low').value;
			expect(p1.equals(p2)).toBe(false);
		});
	});
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationPriority.test.ts`
Expected: FAIL

**Step 3: Implement NotificationPriority**

```typescript
// src/domain/Notification/value-objects/NotificationPriority.ts
import { Result } from '$domain/Result';
import { NotificationPriorityValidationError } from '../errors/NotificationErrors';

type NotificationPriorityValue = 'critical' | 'high' | 'medium' | 'normal' | 'low';

const VALID_PRIORITIES: readonly NotificationPriorityValue[] = [
	'critical',
	'high',
	'medium',
	'normal',
	'low'
] as const;

const PRIORITY_ORDER: Record<NotificationPriorityValue, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	normal: 3,
	low: 4
};

export class NotificationPriority {
	private constructor(private readonly props: { value: NotificationPriorityValue }) {}

	static create(
		priority: string
	): Result<NotificationPriority, NotificationPriorityValidationError> {
		const normalized = priority.trim().toLowerCase() as NotificationPriorityValue;

		if (!(VALID_PRIORITIES as readonly string[]).includes(normalized)) {
			return Result.error(
				new NotificationPriorityValidationError(
					`Invalid notification priority: "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`
				)
			);
		}

		return Result.ok(new NotificationPriority({ value: normalized }));
	}

	get value(): NotificationPriorityValue {
		return this.props.value;
	}

	getNumericValue(): number {
		return PRIORITY_ORDER[this.props.value];
	}

	compareTo(other: NotificationPriority): number {
		return this.getNumericValue() - other.getNumericValue();
	}

	isHigherThan(other: NotificationPriority): boolean {
		return this.compareTo(other) < 0;
	}

	equals(other: NotificationPriority): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationPriority.test.ts`
Expected: PASS - 22/22 tests

**Step 5: Commit**

```bash
git add src/domain/Notification/value-objects/NotificationPriority.ts \
  src/domain/Notification/value-objects/NotificationPriority.test.ts
git commit -m "feat(notifications): add NotificationPriority value object with 22 tests"
```

---

### Task 4: NotificationTitle and NotificationMessage Value Objects

Create value objects for notification title (1-200 chars) and message (1-2000 chars).

**Files:**

- Create: `src/domain/Notification/value-objects/NotificationTitle.ts`
- Create: `src/domain/Notification/value-objects/NotificationTitle.test.ts`
- Create: `src/domain/Notification/value-objects/NotificationMessage.ts`
- Create: `src/domain/Notification/value-objects/NotificationMessage.test.ts`

**Step 1: Write failing tests for NotificationTitle (14 tests)**

```typescript
// src/domain/Notification/value-objects/NotificationTitle.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationTitle } from './NotificationTitle';
import { NotificationTitleValidationError } from '../errors/NotificationErrors';

describe('NotificationTitle', () => {
	describe('create()', () => {
		describe('valid titles', () => {
			it('should create title with minimum length (1 character)', () => {
				const result = NotificationTitle.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('A');
			});

			it('should create title with typical length', () => {
				const result = NotificationTitle.create('New Task Assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('New Task Assigned');
			});

			it('should create title at maximum length (200 characters)', () => {
				const longTitle = 'A'.repeat(200);
				const result = NotificationTitle.create(longTitle);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(longTitle);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = NotificationTitle.create('  Task');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Task');
			});

			it('should trim trailing whitespace', () => {
				const result = NotificationTitle.create('Task  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Task');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = NotificationTitle.create('  Task  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Task');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationTitle.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
				expect(result.error.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationTitle.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
			});

			it('should reject title exceeding 200 characters', () => {
				const tooLong = 'A'.repeat(201);
				const result = NotificationTitle.create(tooLong);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
				expect(result.error.message).toContain('200 characters');
			});

			it('should reject title exceeding 200 characters after trimming', () => {
				const tooLong = '  ' + 'A'.repeat(200) + '  ';
				const result = NotificationTitle.create(tooLong);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTitleValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same title', () => {
			const title1 = NotificationTitle.create('Task').value;
			const title2 = NotificationTitle.create('Task').value;
			expect(title1.equals(title2)).toBe(true);
		});

		it('should return false for different titles', () => {
			const title1 = NotificationTitle.create('Task').value;
			const title2 = NotificationTitle.create('Event').value;
			expect(title1.equals(title2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const title1 = NotificationTitle.create('Task').value;
			const title2 = NotificationTitle.create('task').value;
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the title value as string', () => {
			const title = NotificationTitle.create('Task Assigned').value;
			expect(title.toString()).toBe('Task Assigned');
		});
	});
});
```

**Step 2: Write failing tests for NotificationMessage (14 tests)**

```typescript
// src/domain/Notification/value-objects/NotificationMessage.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationMessage } from './NotificationMessage';
import { NotificationMessageValidationError } from '../errors/NotificationErrors';

describe('NotificationMessage', () => {
	describe('create()', () => {
		describe('valid messages', () => {
			it('should create message with minimum length (1 character)', () => {
				const result = NotificationMessage.create('A');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('A');
			});

			it('should create message with typical length', () => {
				const result = NotificationMessage.create('You have been assigned a new task.');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('You have been assigned a new task.');
			});

			it('should create message at maximum length (2000 characters)', () => {
				const longMessage = 'A'.repeat(2000);
				const result = NotificationMessage.create(longMessage);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(longMessage);
			});
		});

		describe('trimming', () => {
			it('should trim leading whitespace', () => {
				const result = NotificationMessage.create('  Message');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Message');
			});

			it('should trim trailing whitespace', () => {
				const result = NotificationMessage.create('Message  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Message');
			});

			it('should trim both leading and trailing whitespace', () => {
				const result = NotificationMessage.create('  Message  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('Message');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationMessage.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
				expect(result.error.message).toContain('cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationMessage.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
			});

			it('should reject message exceeding 2000 characters', () => {
				const tooLong = 'A'.repeat(2001);
				const result = NotificationMessage.create(tooLong);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
				expect(result.error.message).toContain('2000 characters');
			});

			it('should reject message exceeding 2000 characters after trimming', () => {
				const tooLong = '  ' + 'A'.repeat(2000) + '  ';
				const result = NotificationMessage.create(tooLong);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationMessageValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same message', () => {
			const msg1 = NotificationMessage.create('Test').value;
			const msg2 = NotificationMessage.create('Test').value;
			expect(msg1.equals(msg2)).toBe(true);
		});

		it('should return false for different messages', () => {
			const msg1 = NotificationMessage.create('Test').value;
			const msg2 = NotificationMessage.create('Other').value;
			expect(msg1.equals(msg2)).toBe(false);
		});

		it('should be case-sensitive', () => {
			const msg1 = NotificationMessage.create('Test').value;
			const msg2 = NotificationMessage.create('test').value;
			expect(msg1.equals(msg2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the message value as string', () => {
			const message = NotificationMessage.create('Hello World').value;
			expect(message.toString()).toBe('Hello World');
		});
	});
});
```

**Step 3: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationTitle.test.ts src/domain/Notification/value-objects/NotificationMessage.test.ts`
Expected: FAIL

**Step 4: Implement NotificationTitle**

```typescript
// src/domain/Notification/value-objects/NotificationTitle.ts
import { Result } from '$domain/Result';
import { NotificationTitleValidationError } from '../errors/NotificationErrors';

const MAX_LENGTH = 200;

export class NotificationTitle {
	private constructor(private readonly props: { value: string }) {}

	static create(title: string): Result<NotificationTitle, NotificationTitleValidationError> {
		const trimmed = title.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new NotificationTitleValidationError('Notification title cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new NotificationTitleValidationError(
					`Notification title cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new NotificationTitle({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	equals(other: NotificationTitle): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 5: Implement NotificationMessage**

```typescript
// src/domain/Notification/value-objects/NotificationMessage.ts
import { Result } from '$domain/Result';
import { NotificationMessageValidationError } from '../errors/NotificationErrors';

const MAX_LENGTH = 2000;

export class NotificationMessage {
	private constructor(private readonly props: { value: string }) {}

	static create(message: string): Result<NotificationMessage, NotificationMessageValidationError> {
		const trimmed = message.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new NotificationMessageValidationError('Notification message cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new NotificationMessageValidationError(
					`Notification message cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new NotificationMessage({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	equals(other: NotificationMessage): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.props.value;
	}
}
```

**Step 6: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/value-objects/NotificationTitle.test.ts src/domain/Notification/value-objects/NotificationMessage.test.ts`
Expected: PASS - 28/28 tests (14 + 14)

**Step 7: Commit**

```bash
git add src/domain/Notification/value-objects/NotificationTitle.ts \
  src/domain/Notification/value-objects/NotificationTitle.test.ts \
  src/domain/Notification/value-objects/NotificationMessage.ts \
  src/domain/Notification/value-objects/NotificationMessage.test.ts
git commit -m "feat(notifications): add NotificationTitle and NotificationMessage value objects with 28 tests"
```

---

### Task 5: ReadStatus Value Object

Create value object for read status tracking with optional timestamp.

**Files:**

- Create: `src/domain/Notification/value-objects/ReadStatus.ts`
- Create: `src/domain/Notification/value-objects/ReadStatus.test.ts`

**Step 1: Write failing tests (16 tests)**

```typescript
// src/domain/Notification/value-objects/ReadStatus.test.ts
import { describe, it, expect } from 'vitest';
import { ReadStatus } from './ReadStatus';

describe('ReadStatus', () => {
	describe('createUnread()', () => {
		it('should create unread status', () => {
			const status = ReadStatus.createUnread();
			expect(status.isRead).toBe(false);
			expect(status.readAt).toBeUndefined();
		});
	});

	describe('createRead()', () => {
		it('should create read status with current timestamp', () => {
			const before = new Date();
			const status = ReadStatus.createRead();
			const after = new Date();

			expect(status.isRead).toBe(true);
			expect(status.readAt).toBeDefined();
			expect(status.readAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(status.readAt!.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it('should create read status with specific timestamp', () => {
			const timestamp = new Date('2026-01-15T10:00:00Z');
			const status = ReadStatus.createRead(timestamp);

			expect(status.isRead).toBe(true);
			expect(status.readAt).toBeDefined();
			expect(status.readAt!.toISOString()).toBe(timestamp.toISOString());
		});

		it('should create defensive copy of timestamp', () => {
			const original = new Date('2026-01-15T10:00:00Z');
			const status = ReadStatus.createRead(original);

			original.setFullYear(2025);

			expect(status.readAt!.getFullYear()).toBe(2026);
		});
	});

	describe('markAsRead()', () => {
		it('should transition from unread to read', () => {
			const unread = ReadStatus.createUnread();
			const read = unread.markAsRead();

			expect(read.isRead).toBe(true);
			expect(read.readAt).toBeDefined();
		});

		it('should return new instance when marking as read', () => {
			const unread = ReadStatus.createUnread();
			const read = unread.markAsRead();

			expect(read).not.toBe(unread);
			expect(unread.isRead).toBe(false);
		});

		it('should accept specific timestamp when marking as read', () => {
			const unread = ReadStatus.createUnread();
			const timestamp = new Date('2026-01-15T10:00:00Z');
			const read = unread.markAsRead(timestamp);

			expect(read.readAt!.toISOString()).toBe(timestamp.toISOString());
		});
	});

	describe('markAsUnread()', () => {
		it('should transition from read to unread', () => {
			const read = ReadStatus.createRead();
			const unread = read.markAsUnread();

			expect(unread.isRead).toBe(false);
			expect(unread.readAt).toBeUndefined();
		});

		it('should return new instance when marking as unread', () => {
			const read = ReadStatus.createRead();
			const unread = read.markAsUnread();

			expect(unread).not.toBe(read);
			expect(read.isRead).toBe(true);
		});
	});

	describe('getReadAt()', () => {
		it('should return defensive copy of readAt date', () => {
			const original = new Date('2026-01-15T10:00:00Z');
			const status = ReadStatus.createRead(original);
			const retrieved = status.readAt!;

			retrieved.setFullYear(2025);

			expect(status.readAt!.getFullYear()).toBe(2026);
		});

		it('should return undefined for unread status', () => {
			const status = ReadStatus.createUnread();
			expect(status.readAt).toBeUndefined();
		});
	});

	describe('equals()', () => {
		it('should return true for two unread statuses', () => {
			const status1 = ReadStatus.createUnread();
			const status2 = ReadStatus.createUnread();
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return true for two read statuses with same timestamp', () => {
			const timestamp = new Date('2026-01-15T10:00:00Z');
			const status1 = ReadStatus.createRead(timestamp);
			const status2 = ReadStatus.createRead(timestamp);
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for read vs unread', () => {
			const read = ReadStatus.createRead();
			const unread = ReadStatus.createUnread();
			expect(read.equals(unread)).toBe(false);
		});

		it('should return false for read statuses with different timestamps', () => {
			const status1 = ReadStatus.createRead(new Date('2026-01-15T10:00:00Z'));
			const status2 = ReadStatus.createRead(new Date('2026-01-15T11:00:00Z'));
			expect(status1.equals(status2)).toBe(false);
		});
	});
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/value-objects/ReadStatus.test.ts`
Expected: FAIL

**Step 3: Implement ReadStatus**

```typescript
// src/domain/Notification/value-objects/ReadStatus.ts
export class ReadStatus {
	private constructor(
		private readonly props: {
			isRead: boolean;
			readAt?: Date;
		}
	) {}

	static createUnread(): ReadStatus {
		return new ReadStatus({ isRead: false });
	}

	static createRead(readAt?: Date): ReadStatus {
		const timestamp = readAt ? new Date(readAt.getTime()) : new Date();
		return new ReadStatus({ isRead: true, readAt: timestamp });
	}

	get isRead(): boolean {
		return this.props.isRead;
	}

	get readAt(): Date | undefined {
		return this.props.readAt ? new Date(this.props.readAt.getTime()) : undefined;
	}

	markAsRead(readAt?: Date): ReadStatus {
		const timestamp = readAt ? new Date(readAt.getTime()) : new Date();
		return new ReadStatus({ isRead: true, readAt: timestamp });
	}

	markAsUnread(): ReadStatus {
		return new ReadStatus({ isRead: false });
	}

	equals(other: ReadStatus): boolean {
		if (this.props.isRead !== other.props.isRead) {
			return false;
		}

		if (!this.props.isRead && !other.props.isRead) {
			return true;
		}

		if (!this.props.readAt || !other.props.readAt) {
			return false;
		}

		return this.props.readAt.getTime() === other.props.readAt.getTime();
	}
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/value-objects/ReadStatus.test.ts`
Expected: PASS - 16/16 tests

**Step 5: Commit**

```bash
git add src/domain/Notification/value-objects/ReadStatus.ts \
  src/domain/Notification/value-objects/ReadStatus.test.ts
git commit -m "feat(notifications): add ReadStatus value object with 16 tests"
```

---

### Task 6: ResourceLink Value Object (Optional)

Create value object for linking notifications to related resources.

**Files:**

- Create: `src/domain/Notification/value-objects/ResourceLink.ts`
- Create: `src/domain/Notification/value-objects/ResourceLink.test.ts`

**Step 1: Write failing tests (14 tests)**

```typescript
// src/domain/Notification/value-objects/ResourceLink.test.ts
import { describe, it, expect } from 'vitest';
import { ResourceLink } from './ResourceLink';

describe('ResourceLink', () => {
	describe('create()', () => {
		it('should create link with task resource type', () => {
			const result = ResourceLink.create('task', 'task-123');
			expect(result.resourceType).toBe('task');
			expect(result.resourceId).toBe('task-123');
		});

		it('should create link with leave_request resource type', () => {
			const result = ResourceLink.create('leave_request', 'leave-456');
			expect(result.resourceType).toBe('leave_request');
			expect(result.resourceId).toBe('leave-456');
		});

		it('should create link with event resource type', () => {
			const result = ResourceLink.create('event', 'event-789');
			expect(result.resourceType).toBe('event');
			expect(result.resourceId).toBe('event-789');
		});

		it('should create link with performance_review resource type', () => {
			const result = ResourceLink.create('performance_review', 'review-abc');
			expect(result.resourceType).toBe('performance_review');
			expect(result.resourceId).toBe('review-abc');
		});

		it('should create link with user resource type', () => {
			const result = ResourceLink.create('user', 'user-xyz');
			expect(result.resourceType).toBe('user');
			expect(result.resourceId).toBe('user-xyz');
		});

		it('should create link with department resource type', () => {
			const result = ResourceLink.create('department', 'dept-001');
			expect(result.resourceType).toBe('department');
			expect(result.resourceId).toBe('dept-001');
		});

		it('should create link with document resource type', () => {
			const result = ResourceLink.create('document', 'doc-999');
			expect(result.resourceType).toBe('document');
			expect(result.resourceId).toBe('doc-999');
		});
	});

	describe('equals()', () => {
		it('should return true for same type and ID', () => {
			const link1 = ResourceLink.create('task', 'task-123');
			const link2 = ResourceLink.create('task', 'task-123');
			expect(link1.equals(link2)).toBe(true);
		});

		it('should return false for different types', () => {
			const link1 = ResourceLink.create('task', 'task-123');
			const link2 = ResourceLink.create('event', 'task-123');
			expect(link1.equals(link2)).toBe(false);
		});

		it('should return false for different IDs', () => {
			const link1 = ResourceLink.create('task', 'task-123');
			const link2 = ResourceLink.create('task', 'task-456');
			expect(link1.equals(link2)).toBe(false);
		});
	});

	describe('getUrl()', () => {
		it('should generate URL for task', () => {
			const link = ResourceLink.create('task', 'task-123');
			expect(link.getUrl()).toBe('/dashboard/tasks/task-123');
		});

		it('should generate URL for leave request', () => {
			const link = ResourceLink.create('leave_request', 'leave-456');
			expect(link.getUrl()).toBe('/dashboard/leave/leave-456');
		});

		it('should generate URL for event', () => {
			const link = ResourceLink.create('event', 'event-789');
			expect(link.getUrl()).toBe('/dashboard/events/event-789');
		});

		it('should generate URL for performance review', () => {
			const link = ResourceLink.create('performance_review', 'review-abc');
			expect(link.getUrl()).toBe('/dashboard/reviews/review-abc');
		});
	});
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/value-objects/ResourceLink.test.ts`
Expected: FAIL

**Step 3: Implement ResourceLink**

```typescript
// src/domain/Notification/value-objects/ResourceLink.ts
type ResourceType =
	| 'task'
	| 'leave_request'
	| 'performance_review'
	| 'event'
	| 'user'
	| 'department'
	| 'document';

export class ResourceLink {
	private constructor(
		private readonly props: {
			resourceType: ResourceType;
			resourceId: string;
		}
	) {}

	static create(resourceType: ResourceType, resourceId: string): ResourceLink {
		return new ResourceLink({ resourceType, resourceId });
	}

	get resourceType(): ResourceType {
		return this.props.resourceType;
	}

	get resourceId(): string {
		return this.props.resourceId;
	}

	getUrl(): string {
		const urlMap: Record<ResourceType, string> = {
			task: '/dashboard/tasks',
			leave_request: '/dashboard/leave',
			performance_review: '/dashboard/reviews',
			event: '/dashboard/events',
			user: '/dashboard/employees',
			department: '/dashboard/departments',
			document: '/dashboard/documents'
		};

		const basePath = urlMap[this.props.resourceType];
		return `${basePath}/${this.props.resourceId}`;
	}

	equals(other: ResourceLink): boolean {
		return (
			this.props.resourceType === other.props.resourceType &&
			this.props.resourceId === other.props.resourceId
		);
	}
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/value-objects/ResourceLink.test.ts`
Expected: PASS - 14/14 tests

**Step 5: Commit**

```bash
git add src/domain/Notification/value-objects/ResourceLink.ts \
  src/domain/Notification/value-objects/ResourceLink.test.ts
git commit -m "feat(notifications): add ResourceLink value object with 14 tests"
```

---

### Task 7: Notification Entity

Create Notification entity as aggregate root.

**Files:**

- Create: `src/domain/Notification/entities/Notification.ts`
- Create: `src/domain/Notification/entities/Notification.test.ts`

**Step 1: Write failing tests (22 tests)**

```typescript
// src/domain/Notification/entities/Notification.test.ts
import { describe, it, expect } from 'vitest';
import { Notification, NotificationProps } from './Notification';
import { NotificationType } from '../value-objects/NotificationType';
import { NotificationCategory } from '../value-objects/NotificationCategory';
import { NotificationPriority } from '../value-objects/NotificationPriority';
import { NotificationTitle } from '../value-objects/NotificationTitle';
import { NotificationMessage } from '../value-objects/NotificationMessage';
import { ReadStatus } from '../value-objects/ReadStatus';
import { ResourceLink } from '../value-objects/ResourceLink';
import { NotificationValidationError } from '../errors/NotificationErrors';

describe('Notification', () => {
	const createValidProps = (): NotificationProps => ({
		id: 'notif-123',
		recipientId: 'user-456',
		type: NotificationType.create('task_assigned').value,
		category: NotificationCategory.create('task').value,
		priority: NotificationPriority.create('normal').value,
		title: NotificationTitle.create('New Task').value,
		message: NotificationMessage.create('You have been assigned a new task.').value,
		readStatus: ReadStatus.createUnread(),
		createdAt: new Date('2026-01-15T10:00:00Z'),
		deliveredAt: new Date('2026-01-15T10:00:01Z')
	});

	describe('create()', () => {
		it('should create notification with minimum required fields', () => {
			const result = Notification.create(createValidProps());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('notif-123');
			expect(result.value.recipientId).toBe('user-456');
		});

		it('should create notification with resource link', () => {
			const props = {
				...createValidProps(),
				resourceLink: ResourceLink.create('task', 'task-789')
			};
			const result = Notification.create(props);

			expect(result.isOk).toBe(true);
			expect(result.value.resourceLink).toBeDefined();
			expect(result.value.resourceLink!.resourceType).toBe('task');
		});

		it('should create notification without resource link', () => {
			const result = Notification.create(createValidProps());

			expect(result.isOk).toBe(true);
			expect(result.value.resourceLink).toBeUndefined();
		});

		it('should create defensive copy of createdAt', () => {
			const createdAt = new Date('2026-01-15T10:00:00Z');
			const props = { ...createValidProps(), createdAt };
			const result = Notification.create(props);

			createdAt.setFullYear(2025);

			expect(result.value.createdAt.getFullYear()).toBe(2026);
		});

		it('should create defensive copy of deliveredAt', () => {
			const deliveredAt = new Date('2026-01-15T10:00:01Z');
			const props = { ...createValidProps(), deliveredAt };
			const result = Notification.create(props);

			deliveredAt.setFullYear(2025);

			expect(result.value.deliveredAt!.getFullYear()).toBe(2026);
		});

		it('should reject empty recipientId', () => {
			const props = { ...createValidProps(), recipientId: '' };
			const result = Notification.create(props);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
		});

		it('should reject empty id', () => {
			const props = { ...createValidProps(), id: '' };
			const result = Notification.create(props);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(NotificationValidationError);
		});
	});

	describe('markAsRead()', () => {
		it('should mark notification as read', () => {
			const notification = Notification.create(createValidProps()).value;
			const marked = notification.markAsRead();

			expect(marked.readStatus.isRead).toBe(true);
			expect(marked.readStatus.readAt).toBeDefined();
		});

		it('should return new instance when marking as read', () => {
			const notification = Notification.create(createValidProps()).value;
			const marked = notification.markAsRead();

			expect(marked).not.toBe(notification);
			expect(notification.readStatus.isRead).toBe(false);
		});

		it('should accept specific readAt timestamp', () => {
			const notification = Notification.create(createValidProps()).value;
			const readAt = new Date('2026-01-15T12:00:00Z');
			const marked = notification.markAsRead(readAt);

			expect(marked.readStatus.readAt!.toISOString()).toBe(readAt.toISOString());
		});
	});

	describe('markAsUnread()', () => {
		it('should mark notification as unread', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.createRead()
			};
			const notification = Notification.create(props).value;
			const unmarked = notification.markAsUnread();

			expect(unmarked.readStatus.isRead).toBe(false);
			expect(unmarked.readStatus.readAt).toBeUndefined();
		});

		it('should return new instance when marking as unread', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.createRead()
			};
			const notification = Notification.create(props).value;
			const unmarked = notification.markAsUnread();

			expect(unmarked).not.toBe(notification);
			expect(notification.readStatus.isRead).toBe(true);
		});
	});

	describe('isUnread()', () => {
		it('should return true for unread notification', () => {
			const notification = Notification.create(createValidProps()).value;
			expect(notification.isUnread()).toBe(true);
		});

		it('should return false for read notification', () => {
			const props = {
				...createValidProps(),
				readStatus: ReadStatus.createRead()
			};
			const notification = Notification.create(props).value;
			expect(notification.isUnread()).toBe(false);
		});
	});

	describe('hasHighPriority()', () => {
		it('should return true for critical priority', () => {
			const props = {
				...createValidProps(),
				priority: NotificationPriority.create('critical').value
			};
			const notification = Notification.create(props).value;
			expect(notification.hasHighPriority()).toBe(true);
		});

		it('should return true for high priority', () => {
			const props = {
				...createValidProps(),
				priority: NotificationPriority.create('high').value
			};
			const notification = Notification.create(props).value;
			expect(notification.hasHighPriority()).toBe(true);
		});

		it('should return false for normal priority', () => {
			const notification = Notification.create(createValidProps()).value;
			expect(notification.hasHighPriority()).toBe(false);
		});

		it('should return false for low priority', () => {
			const props = {
				...createValidProps(),
				priority: NotificationPriority.create('low').value
			};
			const notification = Notification.create(props).value;
			expect(notification.hasHighPriority()).toBe(false);
		});
	});

	describe('getters', () => {
		it('should return defensive copy of createdAt', () => {
			const notification = Notification.create(createValidProps()).value;
			const retrieved = notification.createdAt;

			retrieved.setFullYear(2025);

			expect(notification.createdAt.getFullYear()).toBe(2026);
		});

		it('should return defensive copy of deliveredAt', () => {
			const notification = Notification.create(createValidProps()).value;
			const retrieved = notification.deliveredAt!;

			retrieved.setFullYear(2025);

			expect(notification.deliveredAt!.getFullYear()).toBe(2026);
		});

		it('should return undefined for missing deliveredAt', () => {
			const props = { ...createValidProps() };
			delete props.deliveredAt;
			const notification = Notification.create(props).value;

			expect(notification.deliveredAt).toBeUndefined();
		});
	});
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test:unit src/domain/Notification/entities/Notification.test.ts`
Expected: FAIL

**Step 3: Implement Notification entity**

```typescript
// src/domain/Notification/entities/Notification.ts
import { Result } from '$domain/Result';
import { NotificationType } from '../value-objects/NotificationType';
import { NotificationCategory } from '../value-objects/NotificationCategory';
import { NotificationPriority } from '../value-objects/NotificationPriority';
import { NotificationTitle } from '../value-objects/NotificationTitle';
import { NotificationMessage } from '../value-objects/NotificationMessage';
import { ReadStatus } from '../value-objects/ReadStatus';
import { ResourceLink } from '../value-objects/ResourceLink';
import { NotificationValidationError } from '../errors/NotificationErrors';

export interface NotificationProps {
	id: string;
	recipientId: string;
	type: NotificationType;
	category: NotificationCategory;
	priority: NotificationPriority;
	title: NotificationTitle;
	message: NotificationMessage;
	readStatus: ReadStatus;
	resourceLink?: ResourceLink;
	createdAt: Date;
	deliveredAt?: Date;
}

export class Notification {
	private constructor(private readonly props: NotificationProps) {}

	static create(props: NotificationProps): Result<Notification, NotificationValidationError> {
		if (!props.id || props.id.trim().length === 0) {
			return Result.error(new NotificationValidationError('Notification ID cannot be empty'));
		}

		if (!props.recipientId || props.recipientId.trim().length === 0) {
			return Result.error(new NotificationValidationError('Recipient ID cannot be empty'));
		}

		const safeProps: NotificationProps = {
			...props,
			createdAt: new Date(props.createdAt.getTime()),
			deliveredAt: props.deliveredAt ? new Date(props.deliveredAt.getTime()) : undefined
		};

		return Result.ok(new Notification(safeProps));
	}

	get id(): string {
		return this.props.id;
	}

	get recipientId(): string {
		return this.props.recipientId;
	}

	get type(): NotificationType {
		return this.props.type;
	}

	get category(): NotificationCategory {
		return this.props.category;
	}

	get priority(): NotificationPriority {
		return this.props.priority;
	}

	get title(): NotificationTitle {
		return this.props.title;
	}

	get message(): NotificationMessage {
		return this.props.message;
	}

	get readStatus(): ReadStatus {
		return this.props.readStatus;
	}

	get resourceLink(): ResourceLink | undefined {
		return this.props.resourceLink;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt.getTime());
	}

	get deliveredAt(): Date | undefined {
		return this.props.deliveredAt ? new Date(this.props.deliveredAt.getTime()) : undefined;
	}

	markAsRead(readAt?: Date): Notification {
		return new Notification({
			...this.props,
			readStatus: this.props.readStatus.markAsRead(readAt)
		});
	}

	markAsUnread(): Notification {
		return new Notification({
			...this.props,
			readStatus: this.props.readStatus.markAsUnread()
		});
	}

	isUnread(): boolean {
		return !this.props.readStatus.isRead;
	}

	hasHighPriority(): boolean {
		const priorityValue = this.props.priority.value;
		return priorityValue === 'critical' || priorityValue === 'high';
	}
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test:unit src/domain/Notification/entities/Notification.test.ts`
Expected: PASS - 22/22 tests

**Step 5: Commit**

```bash
git add src/domain/Notification/entities/Notification.ts \
  src/domain/Notification/entities/Notification.test.ts
git commit -m "feat(notifications): add Notification entity with 22 tests"
```

---

### Task 8: Domain Layer Barrel Exports

Create index files for clean domain layer exports.

**Files:**

- Create: `src/domain/Notification/value-objects/index.ts`
- Create: `src/domain/Notification/entities/index.ts`
- Create: `src/domain/Notification/index.ts`

**Step 1: Create value objects index**

```typescript
// src/domain/Notification/value-objects/index.ts
export { NotificationType } from './NotificationType';
export { NotificationCategory } from './NotificationCategory';
export { NotificationPriority } from './NotificationPriority';
export { NotificationTitle } from './NotificationTitle';
export { NotificationMessage } from './NotificationMessage';
export { ReadStatus } from './ReadStatus';
export { ResourceLink } from './ResourceLink';
```

**Step 2: Create entities index**

```typescript
// src/domain/Notification/entities/index.ts
export { Notification } from './Notification';
export type { NotificationProps } from './Notification';
```

**Step 3: Create main domain index**

```typescript
// src/domain/Notification/index.ts
// Value Objects
export {
	NotificationType,
	NotificationCategory,
	NotificationPriority,
	NotificationTitle,
	NotificationMessage,
	ReadStatus,
	ResourceLink
} from './value-objects';

// Entities
export { Notification } from './entities';
export type { NotificationProps } from './entities';

// Errors
export {
	NotificationError,
	NotificationTypeValidationError,
	NotificationCategoryValidationError,
	NotificationPriorityValidationError,
	NotificationTitleValidationError,
	NotificationMessageValidationError,
	NotificationNotFoundError,
	NotificationValidationError
} from './errors/NotificationErrors';
```

**Step 4: Verify imports work**

Run: `npm run check`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/domain/Notification/value-objects/index.ts \
  src/domain/Notification/entities/index.ts \
  src/domain/Notification/index.ts
git commit -m "feat(notifications): add domain layer barrel exports"
```

---

## Service Layer (Tasks 9-10)

### Task 9: NotificationRepository Port Interface

Create repository port interface for adapter implementation.

**Files:**

- Create: `src/services/ports/NotificationRepository.ts`

**Step 1: Create port interface**

```typescript
// src/services/ports/NotificationRepository.ts
import { Result } from '$domain/Result';
import {
	Notification,
	NotificationNotFoundError,
	NotificationValidationError,
	NotificationError
} from '$domain/Notification';

export interface NotificationFilter {
	recipientId?: string;
	type?: string;
	category?: string;
	readStatus?: boolean;
	priority?: string;
	resourceType?: string;
	resourceId?: string;
	createdAfter?: Date;
	createdBefore?: Date;
	limit?: number;
	offset?: number;
}

export interface CreateNotificationData {
	recipientId: string;
	type: string;
	category: string;
	priority: string;
	title: string;
	message: string;
	resourceType?: string;
	resourceId?: string;
}

export interface UpdateNotificationData {
	readStatus?: boolean;
}

export interface NotificationRepository {
	/**
	 * Find a notification by ID
	 * @returns Notification if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Notification, NotificationNotFoundError>>;

	/**
	 * Find all notifications with optional filtering
	 * @returns Array of notifications or error
	 */
	findAll(filter?: NotificationFilter): Promise<Result<Notification[], NotificationError>>;

	/**
	 * Create a new notification
	 * @returns Created notification or validation error
	 */
	create(data: CreateNotificationData): Promise<Result<Notification, NotificationValidationError>>;

	/**
	 * Update an existing notification
	 * @returns Updated notification or error
	 */
	update(
		id: string,
		data: UpdateNotificationData
	): Promise<Result<Notification, NotificationError>>;

	/**
	 * Delete a notification
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, NotificationNotFoundError>>;

	/**
	 * Get unread notifications for a recipient
	 * @returns Array of unread notifications
	 */
	getUnreadNotifications(recipientId: string): Promise<Result<Notification[], NotificationError>>;

	/**
	 * Get unread count for a recipient
	 * @returns Count of unread notifications
	 */
	getUnreadCount(recipientId: string): Promise<Result<number, NotificationError>>;

	/**
	 * Mark all notifications as read for a recipient
	 * @returns Success or error
	 */
	markAllAsRead(recipientId: string): Promise<Result<void, NotificationError>>;
}
```

**Step 2: Verify interface compiles**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/services/ports/NotificationRepository.ts
git commit -m "feat(notifications): add NotificationRepository port interface"
```

---

Due to character limit, the plan continues with Tasks 10-15 covering:

- Task 10: NotificationService (20+ tests)
- Task 11: GraphQLNotificationAdapter (20+ tests)
- Task 12: notificationServiceFactory (2 tests)
- Task 13: Update ServiceContainer
- Task 14: Migration completion report
- Task 15: Update MEMORY.md

**Total Estimated Tests:** 180+ tests
**Architecture Score Target:** 90/100
**Estimated Time:** 3 days

---

## Execution

Plan saved to `docs/plans/2026-02-13-notifications-hexagonal-migration.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
