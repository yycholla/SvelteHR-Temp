# Checklist: Fixing Employee Directory Visibility

**Objective:** Ensure the Employee Directory (`/dashboard/employees`) shows ALL employees to any user who has "View Permissions" (e.g., `employees:read`), rather than filtering based on RLS (Row Level Security) or ownership.

## Phase 1: Diagnosis & Verification

- [x] **Verify Current Behavior**
  - [x] Analyzed code to confirm RLS logic was restricting regular users to their own department.
- [x] **Verify Backend RLS**
  - [x] Located RLS filters in `graphql-rust-server/src/schema/query.rs`.
- [x] **Verify Frontend Filtering**
  - [x] Confirmed `status='active'` default filter in `+page.server.ts`.

## Phase 2: Implementation (Option A - Backend Policy Update)

- [x] **Locate Policy**: Found `apply_user_rls_filter` and `apply_department_rls_filter` in `graphql-rust-server/src/schema/query.rs`.
- [x] **Update Policy**: Modified the policy to allow `SELECT` on `users` and `departments` for ANY authenticated user.
  - [x] Removed department-based filtering for `UserEntity`.
  - [x] Removed department-based filtering for `DepartmentEntity`.
- [ ] **Re-seed/Migrate**: (User action required) Rebuild/Restart backend to apply changes.

## Phase 3: Frontend Adjustments

- [x] **Default Filter Review**:
  - [x] Default `status='active'` matches Directory use case. Regular users see all active employees.
- [x] **Permission Consistency**:
  - [x] `canViewInactiveEmployees` correctly hides filter/columns for regular users.
  - [x] Frontend logic supports the new "All Active" view for regular users without modification.

## Phase 4: Validation

- [ ] **User Testing**:
  - [ ] Log in as Employee -> Verify full list visible.
  - [ ] Log in as Admin -> Verify full list visible + Management actions.
- [ ] **Security Audit**:
  - [ ] Ensure sensitive fields (salary, SSN) are NOT exposed in the `GetAllEmployees` query, only public directory info (Name, Role, Dept, Email).

## Immediate Next Step

- [ ] **Rebuild Backend**: Run `cargo run` or equivalent to verify the changes.
