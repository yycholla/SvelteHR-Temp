# SvelteKit Type Checking Issues

**Summary:** 2116 errors and 17 warnings found across 332 files

**Generated:** 2025-11-06

---

## Category 1: TypeScript Generic Constraints

### Database Query Generic Constraints

**Files affected:** `src/lib/server/db.ts`

```
/home/chanway/SvelteHR/src/lib/server/db.ts:38:28
Error: Type 'T' does not satisfy the constraint 'QueryResultRow'.

/home/chanway/SvelteHR/src/lib/server/db.ts:41:40
Error: Type 'T' does not satisfy the constraint 'QueryResultRow'.
```

---

## Category 2: Implicit 'any' Type Errors

### Vite Configuration Middleware

**Files affected:** `vite.config.ts`

```
/home/chanway/SvelteHR/vite.config.ts:11:18
Error: Parameter 'server' implicitly has an 'any' type.

/home/chanway/SvelteHR/vite.config.ts:13:27
Error: Parameter 'req' implicitly has an 'any' type.

/home/chanway/SvelteHR/vite.config.ts:13:32
Error: Parameter 'res' implicitly has an 'any' type.

/home/chanway/SvelteHR/vite.config.ts:13:37
Error: Parameter 'next' implicitly has an 'any' type.

/home/chanway/SvelteHR/vite.config.ts:22:30
Error: Parameter 'name' implicitly has an 'any' type.

/home/chanway/SvelteHR/vite.config.ts:22:36
Error: Parameter 'value' implicitly has an 'any' type.
```

---

## Category 3: Type Configuration Mismatches

### Vite HTTPS Configuration

**Files affected:** `vite.config.ts`

```
/home/chanway/SvelteHR/vite.config.ts:151:3
Error: No overload matches this call.
  The last overload gave the following error.
    Type 'false' has no properties in common with type 'ServerOptions<typeof IncomingMessage, typeof ServerResponse>'.
```

---

## Category 4: Zod Error Handling Issues

### ZodError Property Access

**Files affected:** `src/lib/utils/error-handling.ts`

```
/home/chanway/SvelteHR/src/lib/utils/error-handling.ts:123:44
Error: Property 'errors' does not exist on type 'ZodError<unknown>'.

/home/chanway/SvelteHR/src/lib/utils/error-handling.ts:123:56
Error: Parameter 'err' implicitly has an 'any' type.

/home/chanway/SvelteHR/src/lib/utils/error-handling.ts:168:36
Error: Property 'errors' does not exist on type 'ZodError<unknown>'.
```

---

## Category 5: Missing Namespace Declarations

### Cron Namespace

**Files affected:** `src/lib/server/reminder-scheduler.ts`

```
/home/chanway/SvelteHR/src/lib/server/reminder-scheduler.ts:29:27
Error: Cannot find namespace 'cron'.
```

---

## Category 6: Property Name Mismatches

### Auth Context Property Names

**Files affected:** `src/lib/auth/context.ts`

```
/home/chanway/SvelteHR/src/lib/auth/context.ts:59:43
Error: Property 'displayName' does not exist on type '{ id: string; email: string; display_name?: string | undefined; role?: string | undefined; }'.
Did you mean 'display_name'?

/home/chanway/SvelteHR/src/lib/auth/context.ts:60:19
Error: Property 'full_name' does not exist on type '{ id: string; email: string; display_name?: string | undefined; role?: string | undefined; }'.

/home/chanway/SvelteHR/src/lib/auth/context.ts:60:37
Error: Property 'fullName' does not exist on type '{ id: string; email: string; display_name?: string | undefined; role?: string | undefined; }'.

/home/chanway/SvelteHR/src/lib/auth/context.ts:61:23
Error: Property 'department_id' does not exist on type '{ id: string; email: string; display_name?: string | undefined; role?: string | undefined; }'.
```

---

## Category 7: Undefined Type Issues

### Role Hierarchy Index Access

**Files affected:** `src/lib/auth/context.ts`

```
/home/chanway/SvelteHR/src/lib/auth/context.ts:112:34
Error: Type 'undefined' cannot be used as an index type.
```

---

## Category 8: Async/Await Context Errors

### Top-level Await

**Files affected:** `src/lib/auth/context.ts`

```
/home/chanway/SvelteHR/src/lib/auth/context.ts:137:24
Error: 'await' expressions are only allowed within async functions and at the top level of modules.
```

---

## Category 9: Missing Module Declarations

### Event Types Module Not Found

**Files affected:** Multiple test files

```
/home/chanway/SvelteHR/tests/unit/utils/calendar.spec.ts:109:35
Error: Cannot find module '$lib/types/events' or its corresponding type declarations.

/home/chanway/SvelteHR/tests/unit/utils/rrule.spec.ts:16:40
Error: Cannot find module '$lib/types/events' or its corresponding type declarations.
```

---

## Category 10: Null Assignability Issues

### Task Assignment Type Mismatches

**Files affected:** `tests/unit/utils/tasks.test.ts`

```
/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:91:33
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:248:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:257:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:258:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:268:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:275:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:293:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:302:5
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:311:85
Error: Type 'null' is not assignable to type 'string | undefined'.

/home/chanway/SvelteHR/tests/unit/utils/tasks.test.ts:313:89
Error: Type 'null' is not assignable to type 'string | undefined'.
```

---

## Category 11: Type-only Import Violations

### Playwright Type Imports

**Files affected:** Test utility files

```
/home/chanway/SvelteHR/tests/utils/global-setup.ts:5:20
Error: 'FullConfig' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

/home/chanway/SvelteHR/tests/utils/global-teardown.ts:5:10
Error: 'FullConfig' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

---

## Category 12: Function Argument Type Mismatches

### Playwright API Type Mismatches

**Files affected:** `tests/utils/test-data-helpers.ts`

```
/home/chanway/SvelteHR/tests/utils/test-data-helpers.ts:93:3
Error: Argument of type '(response: HTTPResponse) => boolean | undefined' is not assignable to parameter of type 'string | AwaitablePredicate<HTTPResponse>'.

/home/chanway/SvelteHR/tests/utils/test-data-helpers.ts:251:26
Error: No overload matches this call.
  Type 'string' is not assignable to type '`${string}.jpeg` | `${string}.png` | `${string}.webp` | undefined'.
```

---

## Priority Recommendations

### High Priority (Breaking Functionality)

1. **Missing Module:** `$lib/types/events` - Create this module or fix import paths
2. **ZodError Handling:** Fix property access patterns for Zod validation errors
3. **Async/Await Context:** Ensure proper async function context in auth module

### Medium Priority (Type Safety)

1. **Generic Constraints:** Add proper generic constraints to database query functions
2. **Null Assignability:** Update type definitions to allow `null` where needed or use `undefined`
3. **Type-only Imports:** Add `type` keyword to Playwright imports

### Low Priority (Code Quality)

1. **Implicit 'any' Types:** Add explicit type annotations to Vite configuration
2. **Property Name Mismatches:** Standardize on snake_case vs camelCase for user properties
3. **Vite HTTPS Config:** Fix HTTPS configuration type or remove if unused

---

## Estimated Impact

- **Total Files:** 332
- **Total Errors:** 2116
- **Total Warnings:** 17
- **Critical Files:** ~15 core files with type definition issues
- **Test Files:** Majority of errors in test utilities and unit tests
