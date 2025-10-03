-- Audit Triggers Contract
-- Feature: 021-i-have-setup (Comprehensive Audit Logging)
-- Date: 2025-10-02
--
-- This file defines the PostgreSQL trigger contracts for automatic audit logging
-- on ALL application tables. These triggers capture CREATE/UPDATE/DELETE operations
-- and insert corresponding entries into the activity_logs table.

-- ============================================================================
-- TRIGGER FUNCTION: Universal Audit Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(20);
  v_before_snapshot JSONB;
  v_after_snapshot JSONB;
  v_user_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
  v_batch_id UUID;
BEGIN
  -- Determine operation type
  IF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_before_snapshot := to_jsonb(OLD);
    v_after_snapshot := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_before_snapshot := to_jsonb(OLD);
    v_after_snapshot := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
    v_before_snapshot := NULL;
    v_after_snapshot := to_jsonb(NEW);
  END IF;

  -- Extract user context from session variables
  -- Application must set these via: SET LOCAL app.current_user_id = '...'
  BEGIN
    v_user_id := current_setting('app.current_user_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback for system-automated changes (no user context)
    v_user_id := NULL;
  END;

  BEGIN
    v_ip_address := current_setting('app.current_ip_address', true)::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  BEGIN
    v_user_agent := current_setting('app.current_user_agent', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  BEGIN
    v_batch_id := current_setting('app.current_batch_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_batch_id := NULL;
  END;

  -- Insert audit log entry
  INSERT INTO activity_logs (
    employee_id,
    action,
    resource_type,
    resource_id,
    before_snapshot,
    after_snapshot,
    ip_address,
    user_agent,
    batch_id,
    is_rollback
  ) VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME, -- Table name
    COALESCE(NEW.id, OLD.id)::TEXT, -- Resource ID
    v_before_snapshot,
    v_after_snapshot,
    v_ip_address,
    v_user_agent,
    v_batch_id,
    false
  );

  -- Notify async worker for signature generation
  PERFORM pg_notify('audit_log_inserted', lastval()::TEXT);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER CONTRACTS: Application Tables
-- ============================================================================

-- TRIGGER: employees table
CREATE TRIGGER audit_trigger_employees
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: departments table
CREATE TRIGGER audit_trigger_departments
AFTER INSERT OR UPDATE OR DELETE ON departments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: users table
CREATE TRIGGER audit_trigger_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: roles table
CREATE TRIGGER audit_trigger_roles
AFTER INSERT OR UPDATE OR DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: permissions table
CREATE TRIGGER audit_trigger_permissions
AFTER INSERT OR UPDATE OR DELETE ON permissions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: role_permissions table
CREATE TRIGGER audit_trigger_role_permissions
AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: events table
CREATE TRIGGER audit_trigger_events
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: tasks table
CREATE TRIGGER audit_trigger_tasks
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- CONTRACT TESTS (Integration Tests - MUST FAIL Initially)
-- ============================================================================

-- Test 1: Employee INSERT trigger
-- GIVEN: A new employee is created
-- WHEN: INSERT operation completes
-- THEN: activity_logs entry exists with action=CREATE, complete snapshot
-- Test file: tests/integration/triggers/employee-insert.test.ts

-- Test 2: Employee UPDATE trigger
-- GIVEN: An existing employee is modified
-- WHEN: UPDATE operation completes
-- THEN: activity_logs entry exists with action=UPDATE, before+after snapshots
-- Test file: tests/integration/triggers/employee-update.test.ts

-- Test 3: Employee DELETE trigger
-- GIVEN: An employee record is deleted
-- WHEN: DELETE operation completes
-- THEN: activity_logs entry exists with action=DELETE, before snapshot only
-- Test file: tests/integration/triggers/employee-delete.test.ts

-- Test 4: Batch operation tracking
-- GIVEN: Multiple employees created with same batch_id
-- WHEN: Batch operation completes
-- THEN: All activity_logs entries have matching batch_id
-- Test file: tests/integration/triggers/batch-operations.test.ts

-- Test 5: System vs user actions differentiation
-- GIVEN: Operation with no app.current_user_id set
-- WHEN: System-automated change occurs
-- THEN: activity_logs entry has employee_id=NULL (system action)
-- Test file: tests/integration/triggers/system-actions.test.ts

-- ============================================================================
-- PERFORMANCE CONTRACT
-- ============================================================================

-- Requirement: Trigger execution must complete in < 5ms per operation
-- Measurement: Use EXPLAIN ANALYZE to measure trigger overhead
-- Acceptance: 95th percentile < 5ms for single-row operations

-- Example benchmark query:
-- EXPLAIN (ANALYZE, BUFFERS) INSERT INTO employees VALUES (...);
-- Expected output: Execution Time: < 5ms (excluding signature generation)
