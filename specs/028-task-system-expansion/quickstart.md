# Quickstart: Task System Expansion

**Feature**: Task System Expansion
**Date**: 2025-10-09
**Purpose**: Validate implementation against all 48 acceptance scenarios

## Prerequisites

```bash
# Ensure database is running
docker compose up -d postgres

# Ensure migrations are applied
npm run db:migrate

# Seed test data (users with different roles, task types)
npm run db:seed:test

# Start development server
npm run dev
```

## Test Data Setup

```sql
-- Test users with different roles
INSERT INTO users (id, email, display_name, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@test.com', 'Admin User', 100),
  ('550e8400-e29b-41d4-a716-446655440002', 'hr@test.com', 'HR Manager', 80),
  ('550e8400-e29b-41d4-a716-446655440003', 'manager@test.com', 'Team Manager', 60),
  ('550e8400-e29b-41d4-a716-446655440004', 'employee@test.com', 'Employee User', 20),
  ('550e8400-e29b-41d4-a716-446655440005', 'report@test.com', 'Direct Report', 20);

-- Set up manager relationship
UPDATE users SET manager_id = '550e8400-e29b-41d4-a716-446655440003'
WHERE id = '550e8400-e29b-41d4-a716-446655440005';
```

## Acceptance Scenario Tests

### Scenario Group 1: Task Creation by Role (Scenarios 1-4)

**Scenario 1**: Employee creates self-assigned task

```bash
# Login as employee
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "employee@test.com", "password": "test123"}'

# Navigate to My Tasks page
open http://localhost:5173/dashboard/tasks

# Click "Create Task" button
# Fill form:
#   Title: "Complete training module"
#   Assignee: "Employee User" (pre-selected, cannot change)
#   Priority: "Medium"
#   Due Date: Tomorrow
# Click "Save"

# Expected: Task created successfully, appears in My Tasks list
# Expected: No other assignee options shown in dropdown
```

**Scenario 2**: Manager creates task for direct report

```bash
# Login as manager
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@test.com", "password": "test123"}'

# Navigate to My Tasks page
open http://localhost:5173/dashboard/tasks

# Click "Create Task" button
# Fill form:
#   Title: "Review code changes"
#   Assignee: "Direct Report" (from dropdown)
#   Priority: "High"
# Click "Save"

# Expected: Task created successfully
# Expected: Assignee dropdown shows "Team Manager" and "Direct Report" only
# Expected: Direct Report sees task in their My Tasks view
```

**Scenario 3**: Admin creates task for any employee

```bash
# Login as admin
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "test123"}'

# Navigate to My Tasks page
open http://localhost:5173/dashboard/tasks

# Click "Create Task" button
# Fill form:
#   Title: "Prepare quarterly report"
#   Assignee: "HR Manager" (from dropdown)
#   Priority: "Urgent"
# Click "Save"

# Expected: Task created successfully
# Expected: Assignee dropdown shows all employees
# Expected: HR Manager sees task in their My Tasks view
```

**Scenario 4**: Employee attempts to assign task to someone else

```bash
# Login as employee
# Navigate to My Tasks page
# Open browser DevTools Console
# Try to modify assignee via API:

const response = await fetch('/api/tasks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Unauthorized task',
    assigneeId: '550e8400-e29b-41d4-a716-446655440003', // Manager ID
    taskTypeId: '<general-type-id>',
    priority: 'Medium'
  })
});

# Expected: 403 Forbidden error
# Expected: Error message: "Employees can only assign tasks to themselves"
```

---

### Scenario Group 2: Task Assignment & Management (Scenarios 5-7)

**Scenario 5**: Assignee dropdown shows only permitted users

```bash
# Login as manager
# Navigate to Create Task form
# Inspect assignee dropdown

# Expected: Dropdown contains:
#   - "Team Manager" (self)
#   - "Direct Report"
# Expected: Dropdown does NOT contain:
#   - "Admin User"
#   - "HR Manager"
#   - "Employee User"
```

**Scenario 6**: New task appears in assignee's task list

```bash
# Login as manager, create task for direct report
# Logout
# Login as direct report
# Navigate to My Tasks

# Expected: Newly created task appears in task list
# Expected: Task shows creator as "Team Manager"
# Expected: Task shows correct title, priority, due date
```

**Scenario 7**: Assignee completes task

```bash
# Login as direct report
# Navigate to My Tasks
# Click on task "Review code changes"
# Change status to "Completed"
# Click "Save"

# Expected: Task status updated to "Completed"
# Expected: Task moves to "Completed Tasks" section
# Expected: Task no longer appears in "Active Tasks"
```

---

### Scenario Group 3: Linked Resources (Scenarios 8-10)

**Scenario 8**: Link performance assessment to task

```bash
# Login as manager
# Navigate to Create Task form
# Fill form:
#   Title: "Complete performance self-assessment"
#   Assignee: "Direct Report"
# Click "Add Linked Resource"
# Select resource type: "Assessment"
# Select resource: "Q4 2024 Self-Assessment"
# Click "Save"

# Expected: Task created with linked resource
# Expected: Resource link visible in task details
```

**Scenario 9**: Navigate to linked resource

```bash
# Login as direct report
# Navigate to My Tasks
# Click on task "Complete performance self-assessment"
# See linked resource "Q4 2024 Self-Assessment"
# Click on resource link

# Expected: Navigate to assessment form page
# Expected: Assessment form loads correctly
```

**Scenario 10**: Multiple linked resources

```bash
# Login as admin
# Create task with multiple resources:
#   - Training: "Security Awareness Training"
#   - Document: "Employee Handbook"
#   - Assessment: "Training Completion Quiz"

# Expected: All 3 resources appear in task details
# Expected: Each resource has clickable link
# Expected: Each resource shows correct type icon
```

---

### Scenario Group 4: Task Flexibility & Types (Scenarios 11-13)

**Scenario 11**: Categorize task by type

```bash
# Login as manager
# Create task:
#   Title: "Complete onboarding checklist"
#   Type: "Onboarding"
#   Assignee: "Direct Report"

# Expected: Task created with "Onboarding" type
# Expected: Task shows onboarding icon/badge
```

**Scenario 12**: Filter tasks by type

```bash
# Login as employee with multiple tasks of different types
# Navigate to My Tasks
# Apply filter: Type = "Assessment"

# Expected: Only assessment tasks shown
# Expected: Filter count shows correct number
# Expected: Onboarding and general tasks hidden
```

**Scenario 13**: Multiple related onboarding tasks

```bash
# Login as admin
# Create onboarding task sequence:
#   1. "Set up workstation" - Onboarding - Direct Report
#   2. "Complete HR paperwork" - Onboarding - Direct Report
#   3. "Attend orientation" - Onboarding - Direct Report

# Expected: All 3 tasks created independently
# Expected: Each task individually assignable
# Expected: Each task individually trackable
```

---

### Scenario Group 5: Task Metadata & Due Dates (Scenarios 14-20)

**Scenario 14**: Set due date on task

```bash
# Create task with due date set to 3 days from now
# View task in My Tasks

# Expected: Due date displays correctly
# Expected: Relative time shown (e.g., "Due in 3 days")
```

**Scenario 15**: Receive reminder notification

```bash
# Create task with due date 2 hours from now
# Wait for reminder scheduler to run (every 15 minutes)
# Check notifications

# Expected: Notification received 1 day before due date
# Expected: Notification received 1 hour before due date
# Expected: Notification shows task title and due time
```

**Scenario 16**: Overdue task visual highlighting

```bash
# Create task with due date 1 hour ago
# Navigate to My Tasks

# Expected: Task highlighted in red
# Expected: "OVERDUE" badge visible
# Expected: Relative time shows "Overdue by X hours"
```

**Scenario 17**: Urgent priority task sorting

```bash
# Create multiple tasks with different priorities:
#   - "Review documentation" - Low
#   - "Fix critical bug" - Urgent
#   - "Update tests" - Medium
# Sort tasks by priority (default)

# Expected: "Fix critical bug" appears first
# Expected: Tasks ordered: Urgent > High > Medium > Low
```

**Scenario 18**: Update task status to In Progress

```bash
# Login as assignee
# Open task
# Change status from "To Do" to "In Progress"
# Save

# Expected: Status updated successfully
# Expected: Task shows "In Progress" badge
# Expected: Updated timestamp reflects change
```

**Scenario 19**: Filter by High priority

```bash
# Navigate to My Tasks with multiple priorities
# Apply filter: Priority = "High"

# Expected: Only high-priority tasks shown
# Expected: Medium, Low, Urgent tasks hidden
```

**Scenario 20**: Relative time display for due dates

```bash
# Create task due in 2 days
# View task details

# Expected: Shows "Due in 2 days"
# After 1 day, shows "Due in 1 day"
# After 2 days, shows "Overdue by X hours"
```

---

### Scenario Group 6: Task Lifecycle Management (Scenarios 21-28)

**Scenario 21**: Task creator edits task

```bash
# Login as task creator
# Open task they created
# Edit title: "Updated task title"
# Save

# Expected: Task updated successfully
# Expected: Changes reflected in task list
# Expected: Audit entry created
```

**Scenario 22**: Task assignee edits task

```bash
# Login as assignee
# Open assigned task
# Edit description: "Updated description"
# Save

# Expected: Task updated successfully
# Expected: Audit entry created with assignee as editor
```

**Scenario 23**: View task audit trail

```bash
# Open task with multiple edits
# Click "View History" tab
# See audit trail

# Expected: All edits listed chronologically
# Expected: Each entry shows: timestamp, user, changed fields
# Expected: Most recent changes at top
```

**Scenario 24**: Task creator archives task

```bash
# Login as creator
# Open task
# Click "Delete" (Archive) button
# Confirm deletion

# Expected: Task archived successfully
# Expected: Task removed from active task lists
# Expected: Task viewable in "Archived Tasks" section
# Expected: Audit entry for deletion created
```

**Scenario 25**: Admin archives any task

```bash
# Login as admin
# Navigate to All Tasks view
# Select task created by another user
# Click "Delete" button
# Confirm

# Expected: Task archived successfully
# Expected: Deletion logged in audit trail
# Expected: Archived by admin user
```

**Scenario 26**: Manager reassigns task

```bash
# Login as manager
# Open task assigned to Direct Report
# Click "Reassign"
# Select new assignee: "Team Manager" (self)
# Save

# Expected: Task reassigned successfully
# Expected: Notifications sent to old and new assignees
# Expected: Audit entry for reassignment created
```

**Scenario 27**: Employee attempts to reassign task

```bash
# Login as employee
# Open assigned task
# Try to find reassign option

# Expected: "Reassign" button not visible
# Expected: API call returns 403 if attempted
```

**Scenario 28**: Reassigned task appears in new assignee list

```bash
# After manager reassigns task to self
# Check My Tasks for manager

# Expected: Task appears in manager's My Tasks
# Expected: Task removed from Direct Report's My Tasks
# Expected: Task history shows reassignment
```

---

### Scenario Group 7: Organizational Changes (Scenarios 29-32)

**Scenario 29**: Manager reassignment transfers task creator ownership

```bash
# Create tasks as manager for direct report
# Admin changes manager relationship in employee profile
# Check task creator field

# Expected: Tasks now show new manager as creator
# Expected: Old manager no longer appears as creator
# Expected: Assignee unchanged
```

**Scenario 30**: Employee deactivation reassigns tasks

```bash
# Create multiple tasks assigned to Direct Report
# Admin deactivates Direct Report employee profile
# Check tasks

# Expected: All active tasks reassigned to Direct Report's manager
# Expected: Completed tasks remain unchanged
# Expected: Task history shows "reassigned due to deactivation"
```

**Scenario 31**: Manager notified of reassigned tasks

```bash
# After employee deactivation
# Login as manager
# Check notifications

# Expected: Notification for each reassigned task
# Expected: Notification explains reason (employee deactivation)
# Expected: Link to task in notification
```

**Scenario 32**: Deactivation note visible on task

```bash
# Open task reassigned due to deactivation
# View task details

# Expected: Note visible: "Reassigned due to employee deactivation"
# Expected: Original assignee name shown
# Expected: Current assignee shown
```

---

### Scenario Group 8: Custom Task Types & Resource Links (Scenarios 33-37)

**Scenario 33**: Admin creates custom task type

```bash
# Login as admin
# Navigate to Settings > Task Types
# Click "Create Task Type"
# Name: "Compliance Training"
# Description: "Tasks related to compliance training"
# Save

# Expected: Task type created successfully
# Expected: New type appears in task creation dropdown
# Expected: Type available to all users
```

**Scenario 34**: Manager attempts to create custom task type

```bash
# Login as manager
# Try to access Settings > Task Types

# Expected: "Task Types" menu not visible
# Expected: 403 error if URL accessed directly
```

**Scenario 35**: Broken resource link marked unavailable

```bash
# Create task with linked document
# Admin deletes the linked document
# Background job runs to validate resources
# View task with deleted resource link

# Expected: Resource link shows "unavailable" status
# Expected: Message: "Resource no longer available"
# Expected: Link not clickable
```

**Scenario 36**: Admin fixes unavailable resource link

```bash
# Login as admin
# Open task with unavailable resource
# Click "Fix Link" button
# Select replacement resource
# Save

# Expected: Resource link updated to new resource
# Expected: Status changed to "available"
# Expected: Audit entry for resource update
```

**Scenario 37**: Non-admin cannot modify unavailable link

```bash
# Login as employee
# View task with unavailable resource

# Expected: "Fix Link" button not visible
# Expected: Read-only view of unavailable status
```

---

### Scenario Group 9: Task Hierarchy & Dependencies (Scenarios 38-45)

**Scenario 38**: Create subtask under parent

```bash
# Create parent task: "Launch new feature"
# Click "Add Subtask"
# Create subtask: "Write documentation"
# Set parent: "Launch new feature"
# Save

# Expected: Subtask created under parent
# Expected: Subtask indented in task list
# Expected: Parent shows subtask count
```

**Scenario 39**: View subtasks with completion status

```bash
# Open parent task with 3 subtasks
# View task details

# Expected: All subtasks listed
# Expected: Completion status shown for each
# Expected: Overall progress bar (e.g., "2 of 3 complete")
```

**Scenario 40**: Create task dependency

```bash
# Create Task A: "Design feature"
# Create Task B: "Implement feature"
# Add dependency: Task B depends on Task A
# Save

# Expected: Dependency created successfully
# Expected: Task B marked as "Blocked by Task A"
# Expected: Task B cannot be started until Task A complete
```

**Scenario 41**: Circular dependency prevention

```bash
# Create Task A depends on Task B
# Try to create Task B depends on Task A

# Expected: Error message: "Circular dependency detected"
# Expected: Dependency not created
# Expected: Explanation of conflict shown
```

**Scenario 42**: Filter by hierarchy view

```bash
# Navigate to My Tasks
# Enable "Hierarchy View" filter
# See tasks

# Expected: Parent tasks shown with expand/collapse icons
# Expected: Subtasks nested beneath parents
# Expected: Indentation shows hierarchy level
```

**Scenario 43**: Parent task progress calculation

```bash
# Create parent with 5 subtasks
# Complete 3 subtasks
# View parent task

# Expected: Parent shows "60% complete"
# Expected: Progress bar visual indicator
# Expected: "3 of 5 subtasks complete" text
```

**Scenario 44**: View blocked task status

```bash
# Open Task B (depends on Task A, not complete)
# View task details

# Expected: Badge shows "Blocked by Task A"
# Expected: Link to blocking task
# Expected: Cannot change status to "In Progress"
```

**Scenario 45**: Task A completion unblocks Task B

```bash
# Complete Task A
# View Task B

# Expected: "Blocked" badge removed
# Expected: Status can now be changed
# Expected: Notification sent to Task B assignee
```

---

### Scenario Group 10: Orphaned Task Handling (Scenarios 46-48)

**Scenario 46**: Deactivation without manager marks task

```bash
# Create employee with no manager assigned
# Assign tasks to this employee
# Admin deactivates employee

# Expected: Tasks remain assigned to deactivated employee
# Expected: Tasks marked with "requires manual reassignment" flag
# Expected: Tasks appear in "Orphaned Tasks" admin view
```

**Scenario 47**: Admin views orphaned tasks

```bash
# Login as admin
# Navigate to Tasks > Orphaned Tasks

# Expected: All tasks requiring manual reassignment shown
# Expected: Original assignee name visible
# Expected: Deactivation date shown
```

**Scenario 48**: Admin notified of orphaned tasks

```bash
# After employee deactivation without manager
# Login as admin
# Check notifications

# Expected: Notification received about orphaned tasks
# Expected: Count of orphaned tasks shown
# Expected: Link to Orphaned Tasks view
```

---

## Integration Test Suite

All scenarios above should be automated as E2E tests using Playwright:

```bash
# Run all task system tests
npm run test:e2e -- specs/028-task-system-expansion

# Run specific scenario group
npm run test:e2e -- task-creation-by-role.spec.ts
npm run test:e2e -- task-hierarchy.spec.ts
npm run test:e2e -- organizational-changes.spec.ts

# Run with UI for debugging
npm run test:e2e:ui
```

## Success Criteria

✅ All 48 acceptance scenarios pass automated tests
✅ Task creation form loads <2s (NFR-001)
✅ Task list (100 items) loads <3s (NFR-002)
✅ Task hierarchy (50 items) renders <2s (NFR-004)
✅ GraphQL operations complete <200ms
✅ Test coverage >90%
✅ No TypeScript compilation errors
✅ All constitutional requirements met

---

**Quickstart Status**: ✅ COMPLETE
