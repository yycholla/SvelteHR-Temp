# Tasks: Database Schema Optimization for Full Frontend Support

**Feature**: 029-let-s-optimize | **Branch**: `029-let-s-optimize`
**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/029-let-s-optimize/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Overview

This tasks.md file provides a comprehensive, ordered list of 47 tasks to implement Feature 029: Database Schema Optimization. Tasks are organized by priority phase (P0-P4) following a test-driven development approach with migration verification.

**Total Estimated Time**: 25-30 hours
**Priority Phases**: P0 (Emergency) → P1 (High) → P2 (Medium) → P3 (Low) → P4 (Performance)
**Parallel Opportunities**: 18 tasks marked [P] can run in parallel

## Task Execution Rules

1. **Priority-First**: Complete P0 before P1, P1 before P2, etc.
2. **TDD Order**: Write migration → Run migration → Write contract test → Verify schema → Run quickstart validation
3. **Parallel Execution**: Tasks marked [P] can run in parallel (different files, no dependencies)
4. **Sequential Execution**: Tasks without [P] must run sequentially (same file or dependencies)
5. **Validation Gates**: All tests must pass before moving to next phase

## Path Conventions

- **Migrations**: `/home/yycholla/Documents/SvelteHR/db/migrations/`
- **Contract Tests**: `/home/yycholla/Documents/SvelteHR/tests/contract/`
- **Integration Tests**: `/home/yycholla/Documents/SvelteHR/tests/integration/`
- **GraphQL Operations**: `/home/yycholla/Documents/SvelteHR/src/lib/graphql/`
- **Contracts**: `/home/yycholla/Documents/SvelteHR/specs/029-let-s-optimize/contracts/`
- **Quickstart**: `/home/yycholla/Documents/SvelteHR/specs/029-let-s-optimize/quickstart.md`

---

## Phase 3.1: Setup & Prerequisites

### T001: Verify database development environment

**Estimated Time**: 0.25 hours
**Dependencies**: None
**Parallel**: No (first task)

**Steps**:
1. Verify PostgreSQL 15+ running in Docker container
2. Check database connection with `psql -U postgres -d hr_dev`
3. Verify extensions installed: `pgcrypto`, `uuid-ossp`
4. Check schema namespaces exist: `hr_public`, `hr_private`, `public`
5. Run baseline snapshot: `npm run db:snapshot`

**Acceptance Criteria**:
- [x] PostgreSQL 15+ accessible via Docker
- [x] All required extensions installed
- [x] Schema namespaces created
- [x] Baseline snapshot saved to `schema-snapshots/baseline-schema.json`

---

### T002: Create migration tracking infrastructure

**Estimated Time**: 0.5 hours
**Dependencies**: T001
**Parallel**: No

**Steps**:
1. Verify migration tracking table exists: `public.schema_migrations`
2. Document migration naming convention: `YYYYMMDD_NNN_description.sql`
3. Create migration helpers in `scripts/db/new-migration.sh`
4. Test migration rollback capability
5. Document zero-downtime migration strategy

**Acceptance Criteria**:
- [x] Migration tracking table verified
- [x] Migration creation script works
- [x] Rollback procedure documented
- [x] Zero-downtime strategy documented in `db/migrations/README.md`

---

## Phase 3.2: P0 Critical Hotfix (Emergency)

**CRITICAL: Production bug fix - events page crashes due to missing field**

### T003: [P0] Create migration - event_attendees.reminder_time

**Estimated Time**: 0.5 hours
**Dependencies**: T002
**Parallel**: No (blocking P1 tasks)
**Migration File**: `db/migrations/20251011_001_add_event_reminder_time.sql`
**Contract**: `contracts/events-schema.graphql`
**Quickstart**: Test Case P0.1

**Steps**:
1. Create migration file: `scripts/db/new-migration.sh "add event reminder time"`
2. Write idempotent DDL:
   ```sql
   ALTER TABLE hr_public.event_attendees
   ADD COLUMN IF NOT EXISTS reminder_time INTEGER;

   COMMENT ON COLUMN hr_public.event_attendees.reminder_time IS
   'Minutes before event start_time to send notification reminder';
   ```
3. Run migration: `psql -U postgres -d hr_dev -f db/migrations/20251011_001_add_event_reminder_time.sql`
4. Verify field exists:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'event_attendees' AND column_name = 'reminder_time';
   ```
5. Run `ANALYZE hr_public.event_attendees;`

**Acceptance Criteria**:
- [x] Migration file created with idempotent DDL
- [x] Migration runs without errors
- [x] `reminder_time` column exists as INTEGER type
- [x] Column comment documented
- [x] Table statistics updated

---

### T004: [P0] Contract test - event_attendees.reminder_time GraphQL field

**Estimated Time**: 0.5 hours
**Dependencies**: T003
**Parallel**: No
**Test File**: `tests/contract/event-attendees-reminder.test.ts`
**Contract**: `contracts/events-schema.graphql`

**Steps**:
1. Create contract test file in `tests/contract/`
2. Write GraphQL query test:
   ```typescript
   test('EventAttendee has reminderTime field', async () => {
     const query = `
       query GetEventAttendees($eventId: UUID!) {
         eventAttendees(filter: { eventId: { equalTo: $eventId } }) {
           nodes {
             id
             reminderTime
           }
         }
       }
     `;
     const result = await urqlClient.query(query, { eventId: testEventId });
     expect(result.error).toBeUndefined();
     expect(result.data.eventAttendees.nodes[0]).toHaveProperty('reminderTime');
   });
   ```
3. Restart PostGraphile to regenerate GraphQL schema
4. Run contract test: `npm run test:contract -- event-attendees-reminder.test.ts`
5. Verify test passes

**Acceptance Criteria**:
- [ ] Contract test created
- [ ] PostGraphile schema regenerated
- [ ] Test passes - `reminderTime` field queryable
- [ ] No GraphQL errors in response

---

### T005: [P0] Integration test - Event RSVP with reminder

**Estimated Time**: 0.75 hours
**Dependencies**: T004
**Parallel**: No
**Test File**: `tests/integration/event-rsvp-reminder.test.ts`
**Quickstart**: Test Case P0.1

**Steps**:
1. Follow quickstart Test Case P0.1 steps
2. Create integration test with RSVP mutation:
   ```typescript
   test('RSVP with reminder time saves successfully', async () => {
     const mutation = `
       mutation UpdateRSVP($input: UpdateRsvpInput!) {
         updateEventRsvp(input: $input) {
           id
           rsvpStatus
           reminderTime
         }
       }
     `;
     const result = await urqlClient.mutation(mutation, {
       input: {
         attendeeId: testAttendeeId,
         rsvpStatus: 'ACCEPTED',
         reminderTime: 15
       }
     });
     expect(result.data.updateEventRsvp.reminderTime).toBe(15);
   });
   ```
3. Test frontend integration at `/events` page
4. Verify no console errors
5. Run integration test: `npm run test:integration -- event-rsvp-reminder.test.ts`

**Acceptance Criteria**:
- [ ] Integration test created following quickstart
- [ ] RSVP with reminder mutation works
- [ ] Frontend events page loads without crashes
- [ ] Browser console has no GraphQL errors
- [ ] Test passes

---

## Phase 3.3: P1 Core Schema Changes (High Priority)

**All P1 migration tasks can run in parallel [P] - independent database changes**

### T006: [P] [P1] Create migration - users.manager_id

**Estimated Time**: 1 hour
**Dependencies**: T005 (P0 complete)
**Parallel**: [P] (parallel with T007, T008, T009)
**Migration File**: `db/migrations/20251011_002_add_users_manager_id.sql`
**Contract**: `contracts/users-schema.graphql`
**Quickstart**: Test Case P1.1

**Steps**:
1. Create migration file with self-referencing FK:
   ```sql
   -- Add manager_id column
   ALTER TABLE hr_public.users
   ADD COLUMN IF NOT EXISTS manager_id UUID
     REFERENCES hr_public.users(id) ON DELETE SET NULL;

   COMMENT ON COLUMN hr_public.users.manager_id IS
   'Self-referencing FK to users.id for organizational hierarchy';

   -- Create index for manager lookups
   CREATE INDEX IF NOT EXISTS idx_users_manager_id
   ON hr_public.users(manager_id)
   WHERE manager_id IS NOT NULL;

   -- Circular reference prevention trigger
   CREATE OR REPLACE FUNCTION hr_public.prevent_circular_manager_reference()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.manager_id IS NOT NULL THEN
       -- Check if manager_id creates a cycle
       IF EXISTS (
         WITH RECURSIVE manager_chain AS (
           SELECT id, manager_id FROM hr_public.users WHERE id = NEW.manager_id
           UNION ALL
           SELECT u.id, u.manager_id
           FROM hr_public.users u
           JOIN manager_chain mc ON u.id = mc.manager_id
         )
         SELECT 1 FROM manager_chain WHERE id = NEW.id
       ) THEN
         RAISE EXCEPTION 'Cannot create circular manager relationship';
       END IF;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   DROP TRIGGER IF EXISTS check_circular_manager ON hr_public.users;
   CREATE TRIGGER check_circular_manager
   BEFORE INSERT OR UPDATE OF manager_id ON hr_public.users
   FOR EACH ROW EXECUTE FUNCTION hr_public.prevent_circular_manager_reference();
   ```
2. Run migration and verify
3. Test circular reference prevention:
   ```sql
   -- Should fail with error
   UPDATE hr_public.users SET manager_id = '<own_id>' WHERE id = '<user_id>';
   ```
4. Run `ANALYZE hr_public.users;`

**Acceptance Criteria**:
- [ ] Migration creates `manager_id` column with FK constraint
- [ ] Index created for manager lookups
- [ ] Circular reference trigger prevents invalid hierarchies
- [ ] Test SQL confirms circular reference blocked
- [ ] Table statistics updated

---

### T007: [P] [P1] Create migration - users profile fields

**Estimated Time**: 0.75 hours
**Dependencies**: T005
**Parallel**: [P] (parallel with T006, T008, T009)
**Migration File**: `db/migrations/20251011_003_add_users_profile_fields.sql`
**Contract**: `contracts/users-schema.graphql`
**Quickstart**: Test Case P1.2

**Steps**:
1. Create migration file with profile fields:
   ```sql
   -- Add job_title
   ALTER TABLE hr_public.users
   ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

   COMMENT ON COLUMN hr_public.users.job_title IS
   'Job title/position (e.g., "Senior Software Engineer")';

   -- Add avatar_url
   ALTER TABLE hr_public.users
   ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

   COMMENT ON COLUMN hr_public.users.avatar_url IS
   'Profile avatar URL (CDN or storage path)';

   -- Add date_of_birth (PII - requires application-level encryption)
   ALTER TABLE hr_public.users
   ADD COLUMN IF NOT EXISTS date_of_birth DATE;

   COMMENT ON COLUMN hr_public.users.date_of_birth IS
   'Date of birth - PII field requiring application-level encryption before write';

   -- Create index for job title search
   CREATE INDEX IF NOT EXISTS idx_users_job_title
   ON hr_public.users USING GIN (to_tsvector('english', job_title))
   WHERE job_title IS NOT NULL;
   ```
2. Run migration and verify all 3 fields exist
3. Document PII encryption requirement in migration comments
4. Run `ANALYZE hr_public.users;`

**Acceptance Criteria**:
- [ ] All 3 fields created (job_title, avatar_url, date_of_birth)
- [ ] Column comments document purpose and PII requirements
- [ ] Full-text search index on job_title
- [ ] Table statistics updated

---

### T008: [P] [P1] Create migration - departments.manager_ids array

**Estimated Time**: 1 hour
**Dependencies**: T005
**Parallel**: [P] (parallel with T006, T007, T009)
**Migration File**: `db/migrations/20251011_004_add_departments_manager_ids.sql`
**Contract**: `contracts/departments-schema.graphql`
**Quickstart**: Test Case P1.3

**Steps**:
1. Create migration with array column and data migration:
   ```sql
   -- Add manager_ids array column
   ALTER TABLE hr_public.departments
   ADD COLUMN IF NOT EXISTS manager_ids UUID[];

   COMMENT ON COLUMN hr_public.departments.manager_ids IS
   'Array of user IDs representing co-managers (replaces single manager_id)';

   -- Migrate existing manager_id to manager_ids array
   UPDATE hr_public.departments
   SET manager_ids = ARRAY[manager_id]
   WHERE manager_id IS NOT NULL AND manager_ids IS NULL;

   -- Create GIN index for array containment queries
   CREATE INDEX IF NOT EXISTS idx_departments_manager_ids
   ON hr_public.departments USING GIN (manager_ids);

   -- Validation constraint: at least one manager required (optional - comment out if not needed)
   -- ALTER TABLE hr_public.departments
   -- ADD CONSTRAINT chk_departments_has_managers
   -- CHECK (manager_ids IS NOT NULL AND array_length(manager_ids, 1) > 0);

   -- FK validation function (ensures all manager_ids exist in users table)
   CREATE OR REPLACE FUNCTION hr_public.validate_manager_ids()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.manager_ids IS NOT NULL THEN
       IF NOT (SELECT bool_and(EXISTS(SELECT 1 FROM hr_public.users WHERE id = mgr_id))
               FROM unnest(NEW.manager_ids) AS mgr_id) THEN
         RAISE EXCEPTION 'One or more manager IDs do not exist in users table';
       END IF;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   DROP TRIGGER IF EXISTS validate_department_managers ON hr_public.departments;
   CREATE TRIGGER validate_department_managers
   BEFORE INSERT OR UPDATE OF manager_ids ON hr_public.departments
   FOR EACH ROW EXECUTE FUNCTION hr_public.validate_manager_ids();
   ```
2. Run migration and verify data migrated
3. Test array operations:
   ```sql
   -- Test adding co-manager
   UPDATE hr_public.departments
   SET manager_ids = array_append(manager_ids, '<user_id>')
   WHERE id = '<dept_id>';

   -- Verify GIN index used
   EXPLAIN SELECT * FROM hr_public.departments WHERE '<user_id>' = ANY(manager_ids);
   ```
4. Run `ANALYZE hr_public.departments;`

**Acceptance Criteria**:
- [ ] `manager_ids` UUID[] column created
- [ ] Existing `manager_id` data migrated to array
- [ ] GIN index created for array queries
- [ ] FK validation trigger prevents invalid user IDs
- [ ] Test SQL confirms array operations work
- [ ] Table statistics updated

---

### T009: [P] [P1] Create migration - departments data migration validation

**Estimated Time**: 0.5 hours
**Dependencies**: T008
**Parallel**: No (depends on T008)
**Migration File**: Same as T008 (validation queries)
**Quickstart**: Test Case P1.3

**Steps**:
1. Verify data migration success:
   ```sql
   SELECT
     id, name, manager_id, manager_ids,
     CASE
       WHEN manager_id IS NOT NULL AND manager_ids IS NULL THEN 'MIGRATION NEEDED'
       WHEN manager_id IS NOT NULL AND manager_ids = ARRAY[manager_id] THEN 'MIGRATED'
       ELSE 'OK'
     END as migration_status
   FROM hr_public.departments;
   ```
2. Confirm all rows show "MIGRATED" or "OK"
3. Document transition period where both `manager_id` and `manager_ids` exist
4. Plan future migration to deprecate `manager_id` column (separate task after application deployment)

**Acceptance Criteria**:
- [ ] All departments migrated successfully (no "MIGRATION NEEDED" status)
- [ ] Transition period documented
- [ ] Future deprecation task documented

---

## Phase 3.4: P1 Contract Tests & Integration (High Priority)

**Contract tests can run in parallel [P] after migrations complete**

### T010: [P] Contract test - users.manager_id GraphQL schema

**Estimated Time**: 1 hour
**Dependencies**: T006
**Parallel**: [P] (parallel with T011, T012)
**Test File**: `tests/contract/users-manager-hierarchy.test.ts`
**Contract**: `contracts/users-schema.graphql`

**Steps**:
1. Restart PostGraphile to regenerate schema
2. Create contract test file:
   ```typescript
   import { test, expect } from 'vitest';
   import { createUrqlClient } from '$lib/graphql/client';

   test('User type has managerId field', async () => {
     const query = `
       query GetUserWithManager($userId: UUID!) {
         user(id: $userId) {
           id
           managerId
           manager {
             id
             firstName
             lastName
           }
           directReports {
             id
             firstName
             lastName
           }
         }
       }
     `;
     const result = await urqlClient.query(query, { userId: testUserId });
     expect(result.error).toBeUndefined();
     expect(result.data.user).toHaveProperty('managerId');
     expect(result.data.user).toHaveProperty('manager');
     expect(result.data.user).toHaveProperty('directReports');
   });

   test('Reporting chain query works', async () => {
     const query = `
       query GetReportingChain($userId: UUID!) {
         user(id: $userId) {
           id
           firstName
           manager {
             id
             firstName
             manager {
               id
               firstName
             }
           }
         }
       }
     `;
     const result = await urqlClient.query(query, { userId: testUserId });
     expect(result.error).toBeUndefined();
   });
   ```
3. Run contract test: `npm run test:contract -- users-manager-hierarchy.test.ts`
4. Verify all assertions pass

**Acceptance Criteria**:
- [ ] PostGraphile schema regenerated
- [ ] Contract test created with managerId, manager, directReports fields
- [ ] Reporting chain query test passes
- [ ] No GraphQL errors

---

### T011: [P] Contract test - users profile fields GraphQL schema

**Estimated Time**: 0.75 hours
**Dependencies**: T007
**Parallel**: [P] (parallel with T010, T012)
**Test File**: `tests/contract/users-profile-fields.test.ts`
**Contract**: `contracts/users-schema.graphql`

**Steps**:
1. Create contract test:
   ```typescript
   test('User type has profile fields', async () => {
     const query = `
       query GetUserProfile($userId: UUID!) {
         user(id: $userId) {
           id
           jobTitle
           avatarUrl
           dateOfBirth
         }
       }
     `;
     const result = await urqlClient.query(query, { userId: testUserId });
     expect(result.error).toBeUndefined();
     expect(result.data.user).toHaveProperty('jobTitle');
     expect(result.data.user).toHaveProperty('avatarUrl');
     expect(result.data.user).toHaveProperty('dateOfBirth');
   });

   test('Update user profile mutation works', async () => {
     const mutation = `
       mutation UpdateProfile($input: UpdateUserProfileInput!) {
         updateUserProfile(input: $input) {
           id
           jobTitle
           avatarUrl
           dateOfBirth
         }
       }
     `;
     const result = await urqlClient.mutation(mutation, {
       input: {
         userId: testUserId,
         jobTitle: 'Senior Software Engineer',
         avatarUrl: 'https://cdn.example.com/avatar.jpg',
         dateOfBirth: '1990-05-15'
       }
     });
     expect(result.error).toBeUndefined();
     expect(result.data.updateUserProfile.jobTitle).toBe('Senior Software Engineer');
   });
   ```
2. Run contract test
3. Verify all profile fields queryable and updatable

**Acceptance Criteria**:
- [ ] Contract test created for all 3 profile fields
- [ ] Query test passes
- [ ] Mutation test passes
- [ ] No GraphQL errors

---

### T012: [P] Contract test - departments.manager_ids GraphQL schema

**Estimated Time**: 1 hour
**Dependencies**: T008
**Parallel**: [P] (parallel with T010, T011)
**Test File**: `tests/contract/departments-managers.test.ts`
**Contract**: `contracts/departments-schema.graphql`

**Steps**:
1. Create contract test:
   ```typescript
   test('Department type has managerIds array field', async () => {
     const query = `
       query GetDepartmentManagers($deptId: UUID!) {
         department(id: $deptId) {
           id
           name
           managerIds
           managers {
             id
             firstName
             lastName
           }
         }
       }
     `;
     const result = await urqlClient.query(query, { deptId: testDeptId });
     expect(result.error).toBeUndefined();
     expect(result.data.department.managerIds).toBeInstanceOf(Array);
     expect(result.data.department.managers).toBeInstanceOf(Array);
   });

   test('Update department managers mutation works', async () => {
     const mutation = `
       mutation UpdateDeptManagers($input: UpdateDepartmentManagersInput!) {
         updateDepartmentManagers(input: $input) {
           id
           managerIds
           managers {
             id
             firstName
           }
         }
       }
     `;
     const result = await urqlClient.mutation(mutation, {
       input: {
         departmentId: testDeptId,
         managerIds: [managerId1, managerId2]
       }
     });
     expect(result.error).toBeUndefined();
     expect(result.data.updateDepartmentManagers.managerIds).toHaveLength(2);
   });
   ```
2. Run contract test
3. Verify array field and resolved managers work

**Acceptance Criteria**:
- [ ] Contract test created for managerIds array
- [ ] Query returns both managerIds and resolved managers
- [ ] Mutation test passes
- [ ] No GraphQL errors

---

### T013: Integration test - Manager hierarchy end-to-end

**Estimated Time**: 1.5 hours
**Dependencies**: T010, T011, T012 (all P1 contract tests)
**Parallel**: No
**Test File**: `tests/integration/manager-hierarchy.test.ts`
**Quickstart**: Test Case INT-1

**Steps**:
1. Follow quickstart Test Case INT-1 scenario
2. Create integration test with full hierarchy:
   ```typescript
   test('End-to-end manager hierarchy workflow', async () => {
     // 1. Create organizational structure
     const ceo = await createUser({ firstName: 'CEO', role: 'super_admin' });
     const vp = await createUser({ firstName: 'VP', managerId: ceo.id });
     const manager = await createUser({ firstName: 'Manager', managerId: vp.id });
     const employee = await createUser({ firstName: 'Employee', managerId: manager.id });

     // 2. Verify reporting chain
     const reportingChain = await getReportingChain(employee.id);
     expect(reportingChain).toHaveLength(3); // [manager, vp, ceo]

     // 3. Verify direct reports
     const directReports = await getDirectReports(manager.id);
     expect(directReports).toHaveLength(1);
     expect(directReports[0].id).toBe(employee.id);

     // 4. Test circular reference prevention
     await expect(assignManager(ceo.id, employee.id)).rejects.toThrow('circular');
   });
   ```
3. Run integration test
4. Verify all hierarchy operations work

**Acceptance Criteria**:
- [ ] Integration test created following quickstart
- [ ] Organizational structure created successfully
- [ ] Reporting chain query accurate
- [ ] Direct reports query accurate
- [ ] Circular reference prevention works
- [ ] Test passes

---

## Phase 3.5: P2 Feature Tables (Medium Priority)

**P2 table creation migrations can run in parallel [P]**

### T014: [P] [P2] Create migration - employee_skills table

**Estimated Time**: 1.25 hours
**Dependencies**: T013 (P1 complete)
**Parallel**: [P] (parallel with T015, T016, T017, T018, T019)
**Migration File**: `db/migrations/20251011_005_create_employee_skills.sql`
**Contract**: `contracts/employee-skills-schema.graphql`
**Quickstart**: Test Case P2.1

**Steps**:
1. Create migration with full table definition:
   ```sql
   CREATE TABLE IF NOT EXISTS hr_public.employee_skills (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
     skill_name VARCHAR(255) NOT NULL,
     proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
     endorsed_by UUID[],
     years_experience INTEGER CHECK (years_experience >= 0),
     last_used_date DATE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, skill_name)
   );

   COMMENT ON TABLE hr_public.employee_skills IS
   'Employee skills tracking with proficiency levels and endorsements';

   -- Indexes
   CREATE INDEX IF NOT EXISTS idx_employee_skills_user_id
   ON hr_public.employee_skills(user_id);

   CREATE INDEX IF NOT EXISTS idx_employee_skills_skill_name
   ON hr_public.employee_skills USING GIN (to_tsvector('english', skill_name));

   CREATE INDEX IF NOT EXISTS idx_employee_skills_proficiency
   ON hr_public.employee_skills(proficiency_level DESC);

   -- Trigger for updated_at
   CREATE TRIGGER update_employee_skills_updated_at
   BEFORE UPDATE ON hr_public.employee_skills
   FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

   -- RLS policy
   ALTER TABLE hr_public.employee_skills ENABLE ROW LEVEL SECURITY;

   CREATE POLICY employee_skills_select ON hr_public.employee_skills
   FOR SELECT USING (true); -- All users can view skills

   CREATE POLICY employee_skills_insert ON hr_public.employee_skills
   FOR INSERT WITH CHECK (user_id = current_setting('jwt.claims.user_id')::UUID);

   CREATE POLICY employee_skills_update ON hr_public.employee_skills
   FOR UPDATE USING (user_id = current_setting('jwt.claims.user_id')::UUID);

   CREATE POLICY employee_skills_delete ON hr_public.employee_skills
   FOR DELETE USING (user_id = current_setting('jwt.claims.user_id')::UUID);
   ```
2. Run migration and verify table structure
3. Test constraints (proficiency 1-5, unique user_id+skill_name)
4. Run `ANALYZE hr_public.employee_skills;`

**Acceptance Criteria**:
- [ ] Table created with all fields and constraints
- [ ] Proficiency level validation enforced
- [ ] Unique constraint on (user_id, skill_name)
- [ ] Full-text search index on skill_name
- [ ] RLS policies created
- [ ] updated_at trigger works
- [ ] Table statistics updated

---

### T015: [P] [P2] Create migration - employee_certifications table

**Estimated Time**: 1.25 hours
**Dependencies**: T013
**Parallel**: [P] (parallel with T014, T016, T017, T018, T019)
**Migration File**: `db/migrations/20251011_006_create_employee_certifications.sql`
**Contract**: `contracts/employee-certifications-schema.graphql`
**Quickstart**: Test Case P2.2

**Steps**:
1. Create migration with full table definition:
   ```sql
   CREATE TABLE IF NOT EXISTS hr_public.employee_certifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
     certification_name VARCHAR(255) NOT NULL,
     issuer VARCHAR(255) NOT NULL,
     issued_date DATE NOT NULL,
     expiry_date DATE,
     credential_id VARCHAR(255),
     verification_url VARCHAR(500),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, certification_name, issuer),
     CHECK (expiry_date IS NULL OR expiry_date > issued_date)
   );

   COMMENT ON TABLE hr_public.employee_certifications IS
   'Employee certifications with expiration tracking and renewal management';

   -- Indexes
   CREATE INDEX IF NOT EXISTS idx_employee_certifications_user_id
   ON hr_public.employee_certifications(user_id);

   CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiry
   ON hr_public.employee_certifications(expiry_date)
   WHERE expiry_date IS NOT NULL;

   CREATE INDEX IF NOT EXISTS idx_employee_certifications_search
   ON hr_public.employee_certifications USING GIN (
     to_tsvector('english', certification_name || ' ' || issuer)
   );

   -- Computed status function
   CREATE OR REPLACE FUNCTION hr_public.get_certification_status(expiry DATE)
   RETURNS TEXT AS $$
   BEGIN
     IF expiry IS NULL THEN RETURN 'PERMANENT';
     ELSIF expiry < CURRENT_DATE THEN RETURN 'EXPIRED';
     ELSIF expiry <= CURRENT_DATE + INTERVAL '30 days' THEN RETURN 'EXPIRING_SOON';
     ELSE RETURN 'ACTIVE';
     END IF;
   END;
   $$ LANGUAGE plpgsql IMMUTABLE;

   -- Trigger for updated_at
   CREATE TRIGGER update_employee_certifications_updated_at
   BEFORE UPDATE ON hr_public.employee_certifications
   FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

   -- RLS policies
   ALTER TABLE hr_public.employee_certifications ENABLE ROW LEVEL SECURITY;

   CREATE POLICY employee_certifications_select ON hr_public.employee_certifications
   FOR SELECT USING (true);

   CREATE POLICY employee_certifications_manage ON hr_public.employee_certifications
   FOR ALL USING (user_id = current_setting('jwt.claims.user_id')::UUID);
   ```
2. Run migration and verify
3. Test expiry date validation
4. Test status computation function
5. Run `ANALYZE hr_public.employee_certifications;`

**Acceptance Criteria**:
- [ ] Table created with all fields and constraints
- [ ] Expiry date validation enforced
- [ ] Unique constraint on (user_id, certification_name, issuer)
- [ ] Status computation function works
- [ ] Expiry date index created
- [ ] RLS policies created
- [ ] Table statistics updated

---

### T016: [P] [P2] Create migration - performance_reviews expanded ratings

**Estimated Time**: 1 hour
**Dependencies**: T013
**Parallel**: [P] (parallel with T014, T015, T017, T018, T019)
**Migration File**: `db/migrations/20251011_007_add_performance_review_ratings.sql`
**Contract**: `contracts/performance-reviews-schema.graphql`
**Quickstart**: Test Case P2.3

**Steps**:
1. Create migration with 6 new rating fields:
   ```sql
   -- Add 6 new rating category fields
   ALTER TABLE hr_public.performance_reviews
   ADD COLUMN IF NOT EXISTS technical_skills_rating INTEGER CHECK (technical_skills_rating BETWEEN 1 AND 5),
   ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
   ADD COLUMN IF NOT EXISTS teamwork_rating INTEGER CHECK (teamwork_rating BETWEEN 1 AND 5),
   ADD COLUMN IF NOT EXISTS leadership_rating INTEGER CHECK (leadership_rating BETWEEN 1 AND 5),
   ADD COLUMN IF NOT EXISTS problem_solving_rating INTEGER CHECK (problem_solving_rating BETWEEN 1 AND 5),
   ADD COLUMN IF NOT EXISTS initiative_rating INTEGER CHECK (initiative_rating BETWEEN 1 AND 5);

   COMMENT ON COLUMN hr_public.performance_reviews.technical_skills_rating IS
   'Technical skills rating (1-5 scale)';
   COMMENT ON COLUMN hr_public.performance_reviews.communication_rating IS
   'Communication skills rating (1-5 scale)';
   COMMENT ON COLUMN hr_public.performance_reviews.teamwork_rating IS
   'Teamwork and collaboration rating (1-5 scale)';
   COMMENT ON COLUMN hr_public.performance_reviews.leadership_rating IS
   'Leadership skills rating (1-5 scale)';
   COMMENT ON COLUMN hr_public.performance_reviews.problem_solving_rating IS
   'Problem-solving rating (1-5 scale)';
   COMMENT ON COLUMN hr_public.performance_reviews.initiative_rating IS
   'Initiative and proactivity rating (1-5 scale)';

   -- Average rating computation function
   CREATE OR REPLACE FUNCTION hr_public.calculate_average_rating(
     tech INTEGER, comm INTEGER, team INTEGER,
     lead INTEGER, prob INTEGER, init INTEGER
   )
   RETURNS NUMERIC AS $$
   BEGIN
     RETURN ROUND(
       (COALESCE(tech, 0) + COALESCE(comm, 0) + COALESCE(team, 0) +
        COALESCE(lead, 0) + COALESCE(prob, 0) + COALESCE(init, 0))::NUMERIC /
       NULLIF(
         (CASE WHEN tech IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN comm IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN team IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN lead IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN prob IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN init IS NOT NULL THEN 1 ELSE 0 END), 0
       ), 2
     );
   END;
   $$ LANGUAGE plpgsql IMMUTABLE;
   ```
2. Run migration
3. Test rating constraints (all ratings 1-5)
4. Test average calculation function
5. Run `ANALYZE hr_public.performance_reviews;`

**Acceptance Criteria**:
- [ ] All 6 rating fields created
- [ ] CHECK constraints enforce 1-5 range
- [ ] Column comments documented
- [ ] Average rating function works correctly
- [ ] Table statistics updated

---

### T017: [P] [P2] Create migration - employee_goals expanded fields

**Estimated Time**: 0.75 hours
**Dependencies**: T013
**Parallel**: [P] (parallel with T014-T016, T018, T019)
**Migration File**: `db/migrations/20251011_008_add_employee_goals_fields.sql`

**Steps**:
1. Create migration (based on data-model.md P2 section)
2. Add expanded goal tracking fields
3. Run migration and verify
4. Run `ANALYZE hr_public.employee_goals;`

**Acceptance Criteria**:
- [ ] Migration created and runs successfully
- [ ] New fields added to employee_goals table
- [ ] Table statistics updated

---

### T018: [P] [P2] Create migration - hr_reports recurring fields

**Estimated Time**: 0.75 hours
**Dependencies**: T013
**Parallel**: [P] (parallel with T014-T017, T019)
**Migration File**: `db/migrations/20251011_009_add_hr_reports_recurring.sql`

**Steps**:
1. Create migration with RRULE pattern support
2. Add recurrence_pattern JSONB field
3. Add is_recurring boolean field
4. Run migration and verify
5. Run `ANALYZE hr_public.hr_reports;`

**Acceptance Criteria**:
- [ ] Migration created and runs successfully
- [ ] Recurring report fields added
- [ ] Table statistics updated

---

### T019: [P] [P2] Create migration - notifications delivery_channel

**Estimated Time**: 0.5 hours
**Dependencies**: T013
**Parallel**: [P] (parallel with T014-T018)
**Migration File**: `db/migrations/20251011_010_add_notifications_delivery_channel.sql`

**Steps**:
1. Create migration with delivery_channel field
2. Add ENUM type for channels (email, in_app, sms)
3. Run migration and verify
4. Run `ANALYZE hr_public.notifications;`

**Acceptance Criteria**:
- [ ] Migration created and runs successfully
- [ ] delivery_channel ENUM field added
- [ ] Table statistics updated

---

## Phase 3.6: P2 Contract Tests (Medium Priority)

**P2 contract tests can run in parallel [P] after migrations complete**

### T020: [P] Contract test - employee_skills GraphQL schema

**Estimated Time**: 1 hour
**Dependencies**: T014
**Parallel**: [P] (parallel with T021, T022)
**Test File**: `tests/contract/employee-skills.test.ts`
**Contract**: `contracts/employee-skills-schema.graphql`

**Steps**:
1. Restart PostGraphile
2. Create contract test for skills CRUD operations
3. Test endorsement mutations
4. Run contract test
5. Verify all operations work

**Acceptance Criteria**:
- [ ] Contract test created
- [ ] CRUD operations tested
- [ ] Endorsement system tested
- [ ] Test passes

---

### T021: [P] Contract test - employee_certifications GraphQL schema

**Estimated Time**: 1 hour
**Dependencies**: T015
**Parallel**: [P] (parallel with T020, T022)
**Test File**: `tests/contract/employee-certifications.test.ts`
**Contract**: `contracts/employee-certifications-schema.graphql`

**Steps**:
1. Create contract test for certifications CRUD
2. Test expiry date validation
3. Test status computation
4. Run contract test
5. Verify all operations work

**Acceptance Criteria**:
- [ ] Contract test created
- [ ] Expiry validation tested
- [ ] Status computation tested
- [ ] Test passes

---

### T022: [P] Contract test - performance_reviews ratings GraphQL schema

**Estimated Time**: 1 hour
**Dependencies**: T016
**Parallel**: [P] (parallel with T020, T021)
**Test File**: `tests/contract/performance-reviews-ratings.test.ts`
**Contract**: `contracts/performance-reviews-schema.graphql`

**Steps**:
1. Create contract test for rating fields
2. Test rating validation (1-5 range)
3. Test average rating calculation
4. Run contract test
5. Verify all rating operations work

**Acceptance Criteria**:
- [ ] Contract test created
- [ ] All 6 rating fields queryable
- [ ] Rating validation tested
- [ ] Average calculation tested
- [ ] Test passes

---

### T023: Integration test - Skills & Certifications workflow

**Estimated Time**: 1.5 hours
**Dependencies**: T020, T021, T022
**Parallel**: No
**Test File**: `tests/integration/skills-certifications.test.ts`
**Quickstart**: Test Case INT-3

**Steps**:
1. Follow quickstart Test Case INT-3 scenario
2. Create integration test with full career development workflow
3. Test skills → endorsements → certifications → performance review linkage
4. Run integration test
5. Verify complete workflow

**Acceptance Criteria**:
- [ ] Integration test created following quickstart
- [ ] Skills tracking works end-to-end
- [ ] Certifications tracking works
- [ ] Performance reviews reference skills
- [ ] Test passes

---

## Phase 3.7: P3 Enhancements (Low Priority)

### T024: [P3] Create migration - departments hierarchy fields

**Estimated Time**: 1 hour
**Dependencies**: T023 (P2 complete)
**Parallel**: [P] (parallel with T025, T026)
**Migration File**: `db/migrations/20251011_011_add_departments_hierarchy.sql`
**Quickstart**: Test Case P3.1

**Steps**:
1. Create migration with hierarchy fields:
   ```sql
   -- Add parent_dept_id for hierarchical structure
   ALTER TABLE hr_public.departments
   ADD COLUMN IF NOT EXISTS parent_dept_id UUID
     REFERENCES hr_public.departments(id) ON DELETE SET NULL;

   -- Circular reference prevention trigger
   CREATE OR REPLACE FUNCTION hr_public.prevent_circular_dept_hierarchy()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.parent_dept_id IS NOT NULL THEN
       IF EXISTS (
         WITH RECURSIVE dept_chain AS (
           SELECT id, parent_dept_id FROM hr_public.departments WHERE id = NEW.parent_dept_id
           UNION ALL
           SELECT d.id, d.parent_dept_id
           FROM hr_public.departments d
           JOIN dept_chain dc ON d.id = dc.parent_dept_id
         )
         SELECT 1 FROM dept_chain WHERE id = NEW.id
       ) THEN
         RAISE EXCEPTION 'Cannot create circular department hierarchy';
       END IF;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER check_circular_dept_hierarchy
   BEFORE INSERT OR UPDATE OF parent_dept_id ON hr_public.departments
   FOR EACH ROW EXECUTE FUNCTION hr_public.prevent_circular_dept_hierarchy();

   -- Index for hierarchy queries
   CREATE INDEX IF NOT EXISTS idx_departments_parent_dept_id
   ON hr_public.departments(parent_dept_id)
   WHERE parent_dept_id IS NOT NULL;
   ```
2. Run migration
3. Test circular reference prevention
4. Run `ANALYZE hr_public.departments;`

**Acceptance Criteria**:
- [ ] parent_dept_id field created
- [ ] Circular reference prevention works
- [ ] Index created for hierarchy queries
- [ ] Table statistics updated

---

### T025: [P] [P3] Create migration - leave_requests review tracking

**Estimated Time**: 0.75 hours
**Dependencies**: T023
**Parallel**: [P] (parallel with T024, T026)
**Migration File**: `db/migrations/20251011_012_add_leave_review_tracking.sql`
**Quickstart**: Test Case P3.2

**Steps**:
1. Create migration with review tracking fields:
   ```sql
   ALTER TABLE hr_public.leave_requests
   ADD COLUMN IF NOT EXISTS reviewed_by UUID
     REFERENCES hr_public.users(id) ON DELETE SET NULL,
   ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

   COMMENT ON COLUMN hr_public.leave_requests.reviewed_by IS
   'User ID of manager who reviewed the leave request';
   COMMENT ON COLUMN hr_public.leave_requests.reviewed_at IS
   'Timestamp when leave request was reviewed (approved/rejected)';

   CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by
   ON hr_public.leave_requests(reviewed_by);
   ```
2. Run migration
3. Verify fields created
4. Run `ANALYZE hr_public.leave_requests;`

**Acceptance Criteria**:
- [ ] reviewed_by and reviewed_at fields created
- [ ] FK constraint on reviewed_by
- [ ] Index created
- [ ] Table statistics updated

---

### T026: [P] [P3] Create migration - event_attendees scope and organizer fields

**Estimated Time**: 0.75 hours
**Dependencies**: T023
**Parallel**: [P] (parallel with T024, T025)
**Migration File**: `db/migrations/20251011_013_add_event_attendees_enhancements.sql`

**Steps**:
1. Create migration with scope and is_organizer fields:
   ```sql
   CREATE TYPE hr_public.rsvp_scope AS ENUM ('this_event', 'all_events');

   ALTER TABLE hr_public.event_attendees
   ADD COLUMN IF NOT EXISTS scope hr_public.rsvp_scope,
   ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN NOT NULL DEFAULT false;

   COMMENT ON COLUMN hr_public.event_attendees.scope IS
   'RSVP scope for recurring events: this_event or all_events';
   COMMENT ON COLUMN hr_public.event_attendees.is_organizer IS
   'Whether this attendee is an event organizer with edit permissions';
   ```
2. Run migration
3. Verify ENUM type and fields created
4. Run `ANALYZE hr_public.event_attendees;`

**Acceptance Criteria**:
- [ ] rsvp_scope ENUM type created
- [ ] scope and is_organizer fields added
- [ ] Table statistics updated

---

## Phase 3.8: P4 Materialized Views (Performance)

**All P4 materialized view tasks can run in parallel [P]**

### T027: [P] [P4] Create materialized view - department_metrics

**Estimated Time**: 1 hour
**Dependencies**: T026 (P3 complete)
**Parallel**: [P] (parallel with T028, T029, T030)
**Migration File**: `db/migrations/20251011_014_create_mv_department_metrics.sql`
**Contract**: `contracts/materialized-views-schema.graphql`
**Quickstart**: Test Case P4.1

**Steps**:
1. Create migration with materialized view:
   ```sql
   CREATE MATERIALIZED VIEW hr_public.department_metrics AS
   SELECT
     d.id as department_id,
     d.name as department_name,
     COUNT(u.id) FILTER (WHERE u.is_active) as active_employee_count,
     AVG(cr.salary_amount) FILTER (WHERE u.is_active) as average_salary,
     COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('todo', 'in_progress')) as active_tasks_count,
     NOW() as last_refreshed_at
   FROM hr_public.departments d
   LEFT JOIN hr_public.users u ON u.department_id = d.id
   LEFT JOIN hr_private.compensation_records cr ON cr.employee_id = u.id
   LEFT JOIN hr_public.tasks t ON t.department_id = d.id
   GROUP BY d.id, d.name;

   -- Unique index required for CONCURRENTLY refresh
   CREATE UNIQUE INDEX department_metrics_pkey
   ON hr_public.department_metrics(department_id);

   -- Grant SELECT to PostGraphile role
   GRANT SELECT ON hr_public.department_metrics TO postgraphile;
   ```
2. Run migration
3. Test query performance vs. live aggregation
4. Test REFRESH MATERIALIZED VIEW CONCURRENTLY

**Acceptance Criteria**:
- [ ] Materialized view created
- [ ] Unique index on department_id
- [ ] Query performance <50ms (vs >500ms for live query)
- [ ] CONCURRENT refresh works without blocking
- [ ] PostGraphile can query the view

---

### T028: [P] [P4] Create materialized view - goal_statistics

**Estimated Time**: 0.75 hours
**Dependencies**: T026
**Parallel**: [P] (parallel with T027, T029, T030)
**Migration File**: `db/migrations/20251011_015_create_mv_goal_statistics.sql`
**Contract**: `contracts/materialized-views-schema.graphql`

**Steps**:
1. Create materialized view for goal statistics
2. Add unique index for CONCURRENTLY
3. Run migration and test performance
4. Grant SELECT to PostGraphile

**Acceptance Criteria**:
- [ ] Materialized view created
- [ ] Unique index created
- [ ] Query performance improved
- [ ] PostGraphile can query

---

### T029: [P] [P4] Create materialized view - report_analytics

**Estimated Time**: 0.75 hours
**Dependencies**: T026
**Parallel**: [P] (parallel with T027, T028, T030)
**Migration File**: `db/migrations/20251011_016_create_mv_report_analytics.sql`
**Contract**: `contracts/materialized-views-schema.graphql`

**Steps**:
1. Create materialized view for report analytics
2. Add unique index
3. Run migration and test
4. Grant SELECT to PostGraphile

**Acceptance Criteria**:
- [ ] Materialized view created
- [ ] Unique index created
- [ ] Query performance improved
- [ ] PostGraphile can query

---

### T030: [P] [P4] Create materialized view - dashboard_summaries

**Estimated Time**: 0.75 hours
**Dependencies**: T026
**Parallel**: [P] (parallel with T027, T028, T029)
**Migration File**: `db/migrations/20251011_017_create_mv_dashboard_summaries.sql`
**Contract**: `contracts/materialized-views-schema.graphql`

**Steps**:
1. Create materialized view for dashboard KPIs
2. Add unique index
3. Run migration and test
4. Grant SELECT to PostGraphile

**Acceptance Criteria**:
- [ ] Materialized view created
- [ ] Unique index created
- [ ] Query performance improved
- [ ] PostGraphile can query

---

### T031: Contract test - Materialized views GraphQL schema

**Estimated Time**: 1 hour
**Dependencies**: T027, T028, T029, T030
**Parallel**: No
**Test File**: `tests/contract/materialized-views.test.ts`
**Contract**: `contracts/materialized-views-schema.graphql`

**Steps**:
1. Restart PostGraphile
2. Create contract test for all 4 materialized views
3. Test refresh mutations
4. Run contract test
5. Verify all views queryable

**Acceptance Criteria**:
- [ ] Contract test created for all 4 views
- [ ] Query tests pass
- [ ] Refresh mutations work
- [ ] Test passes

---

## Phase 3.9: Schema Verification & Testing

### T032: Verify all migrations applied successfully

**Estimated Time**: 0.5 hours
**Dependencies**: T031
**Parallel**: No

**Steps**:
1. Run schema verification: `npm run db:verify`
2. Compare against baseline snapshot
3. Check migration tracking table:
   ```sql
   SELECT * FROM public.schema_migrations ORDER BY version;
   ```
4. Verify all 17 migrations (20251011_001 through 20251011_017) recorded
5. Generate new schema snapshot: `npm run db:snapshot`

**Acceptance Criteria**:
- [ ] All 17 migrations recorded in schema_migrations
- [ ] Schema verification passes
- [ ] New snapshot generated
- [ ] No schema drift detected

---

### T033: Verify RLS policies on all new/modified tables

**Estimated Time**: 0.75 hours
**Dependencies**: T032
**Parallel**: No

**Steps**:
1. Verify RLS enabled on all tables:
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'hr_public'
   AND tablename IN ('employee_skills', 'employee_certifications', 'event_attendees');
   ```
2. Test RLS policies with different user roles
3. Verify department-scoped access for managers
4. Document RLS policy coverage

**Acceptance Criteria**:
- [ ] RLS enabled on all new tables
- [ ] Policies enforce correct access control
- [ ] Manager department-scoping works
- [ ] Documentation updated

---

### T034: Verify indexes and query performance

**Estimated Time**: 1 hour
**Dependencies**: T032
**Parallel**: No

**Steps**:
1. List all indexes created:
   ```sql
   SELECT tablename, indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'hr_public'
   AND tablename IN (
     'users', 'departments', 'employee_skills', 'employee_certifications',
     'performance_reviews', 'event_attendees', 'leave_requests'
   )
   ORDER BY tablename, indexname;
   ```
2. Verify 20+ indexes created (as per plan.md goal)
3. Test query performance with EXPLAIN ANALYZE
4. Verify indexes used by query planner
5. Document index coverage

**Acceptance Criteria**:
- [ ] 20+ indexes created across tables
- [ ] EXPLAIN ANALYZE shows index usage
- [ ] Query performance meets <200ms p95 goal
- [ ] Index documentation complete

---

### T035: Verify FK constraints and referential integrity

**Estimated Time**: 0.5 hours
**Dependencies**: T032
**Parallel**: No

**Steps**:
1. List all FK constraints:
   ```sql
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_schema = 'hr_public'
   ORDER BY tc.table_name;
   ```
2. Test FK cascade behaviors (ON DELETE CASCADE, ON DELETE SET NULL)
3. Test FK validation (circular reference prevention)
4. Document FK constraint coverage

**Acceptance Criteria**:
- [ ] All FK constraints documented
- [ ] Cascade behaviors tested
- [ ] Circular reference prevention verified
- [ ] Referential integrity maintained

---

## Phase 3.10: Integration Testing (Quickstart Execution)

**Integration tests follow quickstart.md test cases**

### T036: [P] Integration test - P0 Event reminder hotfix

**Estimated Time**: 0.5 hours (already done in T005)
**Dependencies**: T035
**Parallel**: [P] (parallel with T037, T038, T039)
**Quickstart**: Test Case P0.1

**Steps**:
1. Re-run quickstart Test Case P0.1 verification
2. Confirm events page loads without crashes
3. Confirm RSVP with reminder saves

**Acceptance Criteria**:
- [ ] Quickstart P0.1 passes
- [ ] Events page stable
- [ ] No GraphQL errors

---

### T037: [P] Integration test - P1 Manager hierarchy

**Estimated Time**: 0.5 hours (already done in T013)
**Dependencies**: T035
**Parallel**: [P] (parallel with T036, T038, T039)
**Quickstart**: Test Cases P1.1, P1.2, P1.3

**Steps**:
1. Re-run quickstart Test Cases P1.1-P1.3
2. Verify manager assignment, profile updates, co-managers

**Acceptance Criteria**:
- [ ] All P1 quickstart tests pass
- [ ] Manager hierarchy works
- [ ] Profile fields updatable
- [ ] Department co-managers functional

---

### T038: [P] Integration test - P2 Skills & Certifications

**Estimated Time**: 0.5 hours (already done in T023)
**Dependencies**: T035
**Parallel**: [P] (parallel with T036, T037, T039)
**Quickstart**: Test Cases P2.1, P2.2, P2.3

**Steps**:
1. Re-run quickstart Test Cases P2.1-P2.3
2. Verify skills CRUD, certifications tracking, performance ratings

**Acceptance Criteria**:
- [ ] All P2 quickstart tests pass
- [ ] Skills tracking works
- [ ] Certifications expiry tracking works
- [ ] Performance ratings functional

---

### T039: [P] Integration test - P3 Enhancements

**Estimated Time**: 0.5 hours
**Dependencies**: T035
**Parallel**: [P] (parallel with T036, T037, T038)
**Quickstart**: Test Cases P3.1, P3.2

**Steps**:
1. Run quickstart Test Cases P3.1-P3.2
2. Verify department hierarchy, leave review tracking

**Acceptance Criteria**:
- [ ] Department hierarchy tests pass
- [ ] Leave review tracking works
- [ ] Event attendee enhancements functional

---

### T040: Integration test - P4 Materialized views performance

**Estimated Time**: 1 hour
**Dependencies**: T036, T037, T038, T039
**Parallel**: No
**Quickstart**: Test Cases P4.1, PERF-1

**Steps**:
1. Run quickstart Test Cases P4.1 and PERF-1
2. Benchmark materialized view query performance
3. Compare against live aggregation queries
4. Verify <200ms p95 latency goal met
5. Test manual refresh operations
6. Document performance improvements

**Acceptance Criteria**:
- [ ] Materialized views query <50ms
- [ ] 10x faster than live aggregation
- [ ] Manual refresh works
- [ ] Performance goals met (<200ms p95)
- [ ] Performance documentation complete

---

## Phase 3.11: Polish & Documentation

### T041: Update migration README documentation

**Estimated Time**: 0.5 hours
**Dependencies**: T040
**Parallel**: [P] (parallel with T042, T043)

**Steps**:
1. Update `db/migrations/README.md` with:
   - Feature 029 migration overview
   - Priority phase breakdown (P0-P4)
   - Migration dependencies
   - Rollback procedures
   - Zero-downtime deployment strategy
2. Document materialized view refresh schedule
3. Document PII encryption requirements

**Acceptance Criteria**:
- [ ] README updated with Feature 029 details
- [ ] Rollback procedures documented
- [ ] Zero-downtime strategy documented
- [ ] PII encryption requirements clear

---

### T042: [P] Update GraphQL operations for new fields

**Estimated Time**: 1 hour
**Dependencies**: T040
**Parallel**: [P] (parallel with T041, T043)

**Steps**:
1. Update existing GraphQL queries to include new fields:
   - `src/lib/graphql/users-operations.ts` - add managerId, jobTitle, avatarUrl, dateOfBirth
   - `src/lib/graphql/departments-operations.ts` - add managerIds
   - `src/lib/graphql/events-operations.ts` - add reminderTime, scope, isOrganizer
2. Create new GraphQL operations for skills and certifications
3. Add materialized view queries
4. Run type generation: `npm run graphql:codegen`
5. Verify TypeScript types generated correctly

**Acceptance Criteria**:
- [ ] All existing operations updated with new fields
- [ ] New operations created for skills/certifications
- [ ] Materialized view queries added
- [ ] TypeScript types generated
- [ ] No type errors

---

### T043: [P] Create database seeding script for test data

**Estimated Time**: 1 hour
**Dependencies**: T040
**Parallel**: [P] (parallel with T041, T042)

**Steps**:
1. Create `db/seeds/029-test-data.sql` with:
   - Sample users with manager hierarchies
   - Departments with co-managers
   - Employee skills and certifications
   - Performance reviews with ratings
   - Events with attendees and reminders
2. Document seed script usage
3. Test seed script on fresh database

**Acceptance Criteria**:
- [ ] Seed script created
- [ ] Covers all Feature 029 tables
- [ ] Script documented in README
- [ ] Tested on fresh database

---

### T044: Create rollback migration scripts

**Estimated Time**: 1 hour
**Dependencies**: T041
**Parallel**: No

**Steps**:
1. Create rollback migrations for each phase:
   - `db/rollback/029-p4-rollback.sql` - Drop materialized views
   - `db/rollback/029-p3-rollback.sql` - Remove P3 enhancements
   - `db/rollback/029-p2-rollback.sql` - Drop employee_skills, employee_certifications
   - `db/rollback/029-p1-rollback.sql` - Remove manager_id, profile fields, manager_ids
   - `db/rollback/029-p0-rollback.sql` - Remove reminder_time
2. Test rollback scripts on test database
3. Document rollback procedure in README
4. Verify application works on rolled-back schema

**Acceptance Criteria**:
- [ ] Rollback scripts created for all phases
- [ ] Rollback tested successfully
- [ ] Application functional on old schema
- [ ] Rollback procedure documented

---

### T045: Frontend UI updates for new fields (minimal changes)

**Estimated Time**: 2 hours
**Dependencies**: T042
**Parallel**: No

**Steps**:
1. Update user profile edit form to include:
   - Manager dropdown (select from users)
   - Job title input
   - Avatar upload widget
   - Date of birth input (with PII warning)
2. Update department edit form for co-managers multi-select
3. Update event RSVP dialog for reminder time selector
4. Update employee profile to show skills and certifications
5. Test all UI changes in development

**Acceptance Criteria**:
- [ ] User profile form includes all new fields
- [ ] Department co-managers editable
- [ ] Event reminders settable
- [ ] Skills/certifications displayed
- [ ] All UI changes tested

---

### T046: Performance monitoring setup

**Estimated Time**: 1 hour
**Dependencies**: T040
**Parallel**: No

**Steps**:
1. Add query performance monitoring for materialized views
2. Set up alerts for:
   - Materialized view refresh duration >10 seconds
   - Query p95 latency >200ms
   - Schema drift detection
3. Document monitoring setup in README
4. Test alerts trigger correctly

**Acceptance Criteria**:
- [ ] Performance monitoring configured
- [ ] Alerts set up for critical metrics
- [ ] Monitoring documented
- [ ] Alerts tested

---

### T047: Final validation - Run complete quickstart.md

**Estimated Time**: 2 hours
**Dependencies**: T045, T046
**Parallel**: No
**Quickstart**: ALL test cases

**Steps**:
1. Run complete quickstart.md from start to finish
2. Execute all test cases (P0, P1, P2, P3, P4, INT, PERF, ROLLBACK)
3. Verify all acceptance criteria met
4. Document any issues found
5. Create sign-off checklist

**Acceptance Criteria**:
- [ ] All quickstart test cases pass
- [ ] All acceptance criteria met
- [ ] No critical issues found
- [ ] Sign-off checklist complete
- [ ] Feature 029 ready for production

---

## Dependencies Graph

```
Setup Phase:
T001 → T002

P0 Phase (Critical Hotfix):
T002 → T003 → T004 → T005

P1 Phase (Core Schema):
T005 → [T006, T007, T008] (parallel)
T008 → T009
[T006, T007, T008, T009] → [T010, T011, T012] (parallel)
[T010, T011, T012] → T013

P2 Phase (Feature Tables):
T013 → [T014, T015, T016, T017, T018, T019] (parallel)
[T014, T015, T016] → [T020, T021, T022] (parallel)
[T020, T021, T022] → T023

P3 Phase (Enhancements):
T023 → [T024, T025, T026] (parallel)

P4 Phase (Materialized Views):
T026 → [T027, T028, T029, T030] (parallel)
[T027, T028, T029, T030] → T031

Verification Phase:
T031 → T032 → T033 → T034 → T035
T035 → [T036, T037, T038, T039] (parallel)
[T036, T037, T038, T039] → T040

Polish Phase:
T040 → [T041, T042, T043] (parallel)
T041 → T044
[T042, T043, T044] → T045 → T046 → T047
```

## Parallel Execution Examples

**P1 Migrations (Tasks 6-8 in parallel)**:
```bash
# Terminal 1
psql -f db/migrations/20251011_002_add_users_manager_id.sql

# Terminal 2
psql -f db/migrations/20251011_003_add_users_profile_fields.sql

# Terminal 3
psql -f db/migrations/20251011_004_add_departments_manager_ids.sql
```

**P1 Contract Tests (Tasks 10-12 in parallel)**:
```bash
# Single command - run all contract tests in parallel
npm run test:contract -- users-manager-hierarchy.test.ts users-profile-fields.test.ts departments-managers.test.ts
```

**P2 Table Creation (Tasks 14-19 in parallel)**:
```bash
# Run all P2 migrations in parallel (different tables)
for migration in 20251011_005_create_employee_skills.sql \
                 20251011_006_create_employee_certifications.sql \
                 20251011_007_add_performance_review_ratings.sql \
                 20251011_008_add_employee_goals_fields.sql \
                 20251011_009_add_hr_reports_recurring.sql \
                 20251011_010_add_notifications_delivery_channel.sql; do
  psql -f db/migrations/$migration &
done
wait
```

**P4 Materialized Views (Tasks 27-30 in parallel)**:
```bash
# Create all materialized views in parallel
for mv in 20251011_014_create_mv_department_metrics.sql \
          20251011_015_create_mv_goal_statistics.sql \
          20251011_016_create_mv_report_analytics.sql \
          20251011_017_create_mv_dashboard_summaries.sql; do
  psql -f db/migrations/$mv &
done
wait
```

## Validation Checklist

**Before starting implementation**:
- [ ] All design documents reviewed (plan.md, data-model.md, contracts/, quickstart.md)
- [ ] Database environment verified (T001)
- [ ] Migration infrastructure ready (T002)

**After P0 (Critical Hotfix)**:
- [ ] event_attendees.reminder_time field exists
- [ ] Events page loads without crashes
- [ ] Frontend GraphQL queries work

**After P1 (Core Schema)**:
- [ ] Manager hierarchy functional
- [ ] Profile fields updatable
- [ ] Department co-managers work
- [ ] Circular reference prevention tested

**After P2 (Feature Tables)**:
- [ ] employee_skills table created and functional
- [ ] employee_certifications table with expiry tracking
- [ ] Performance review expanded ratings work
- [ ] All contract tests pass

**After P3 (Enhancements)**:
- [ ] Department hierarchy fields created
- [ ] Leave review tracking works
- [ ] Event attendee enhancements functional

**After P4 (Materialized Views)**:
- [ ] All 4 materialized views created
- [ ] Query performance <50ms
- [ ] Manual refresh works
- [ ] Performance goals met

**Final Validation**:
- [ ] All 47 tasks completed
- [ ] All quickstart test cases pass
- [ ] Schema verification passes
- [ ] RLS policies enforced
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Rollback procedures tested
- [ ] Sign-off checklist complete

---

**Feature 029 is ready for production when all 47 tasks are complete and all validation checkboxes are checked.** ✅
