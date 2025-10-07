-- Migration: Create execute_rollback function for rollback operations
-- Feature: 020-we-need-to (Audit Logging with Rollback)
-- Date: 2025-10-03
-- Purpose: Execute rollback operations to restore resources to previous state

-- Create execute_rollback function in hr_public schema
-- This function will be exposed as a GraphQL mutation by PostGraphile
CREATE OR REPLACE FUNCTION hr_public.execute_rollback(
    p_log_id UUID,
    p_reason TEXT,
    p_strategy TEXT DEFAULT 'force',
    p_executed_by UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    new_log_id UUID,
    error TEXT
) AS $$
DECLARE
    v_target_log hr_public.activity_logs%ROWTYPE;
    v_resource_table TEXT;
    v_resource_id UUID;
    v_before_snapshot JSONB;
    v_after_snapshot JSONB;
    v_new_log_id UUID;
    v_current_user_id UUID;
BEGIN
    -- Get current user ID if not provided
    v_current_user_id := COALESCE(
        p_executed_by,
        NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID
    );

    -- Validate user permissions (must be super_admin)
    IF current_setting('jwt.claims.role', true) != 'super_admin' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Only super_admin can execute rollbacks'::TEXT;
        RETURN;
    END IF;

    -- Validate reason
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Rollback reason must be at least 10 characters'::TEXT;
        RETURN;
    END IF;

    -- Get the target activity log
    SELECT * INTO v_target_log
    FROM hr_public.activity_logs
    WHERE id = p_log_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Activity log not found'::TEXT;
        RETURN;
    END IF;

    -- Validate: Cannot rollback a rollback
    IF v_target_log.is_rollback = TRUE THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Cannot rollback a rollback operation'::TEXT;
        RETURN;
    END IF;

    -- Validate: Cannot rollback VIEW operations
    IF UPPER(v_target_log.action) = 'VIEW' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Cannot rollback view operations'::TEXT;
        RETURN;
    END IF;

    -- Check if already rolled back
    IF EXISTS (
        SELECT 1 FROM hr_public.activity_logs
        WHERE rolled_back_log_id = p_log_id
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'This operation has already been rolled back'::TEXT;
        RETURN;
    END IF;

    -- Get resource information
    v_resource_id := v_target_log.resource_id;
    v_before_snapshot := v_target_log.before_snapshot;
    v_after_snapshot := v_target_log.after_snapshot;

    -- Determine the target table based on resource_type (just table name, we'll use hr_public schema)
    v_resource_table := CASE v_target_log.resource_type
        WHEN 'events' THEN 'events'
        WHEN 'event' THEN 'events'
        WHEN 'tasks' THEN 'tasks'
        WHEN 'task' THEN 'tasks'
        WHEN 'leave_requests' THEN 'leave_requests'
        WHEN 'leave_request' THEN 'leave_requests'
        WHEN 'users' THEN 'users'
        WHEN 'profile' THEN 'users'
        WHEN 'employee' THEN 'users'
        WHEN 'departments' THEN 'departments'
        WHEN 'department' THEN 'departments'
        ELSE NULL
    END;

    IF v_resource_table IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, format('Unsupported resource type: %s', v_target_log.resource_type)::TEXT;
        RETURN;
    END IF;

    -- Execute the rollback based on the original action
    BEGIN
        IF UPPER(v_target_log.action) = 'CREATE' THEN
            -- Rollback CREATE = DELETE the resource
            EXECUTE format('DELETE FROM hr_public.%I WHERE id = $1', v_resource_table)
            USING v_resource_id;

            -- Create rollback activity log
            INSERT INTO hr_public.activity_logs (
                employee_id,
                user_id,
                action,
                resource_type,
                resource_id,
                before_snapshot,
                after_snapshot,
                is_rollback,
                rolled_back_log_id,
                details,
                ip_address,
                user_agent
            ) VALUES (
                v_current_user_id,
                v_current_user_id,
                'delete',
                v_target_log.resource_type,
                v_resource_id,
                v_after_snapshot, -- What it was before rollback
                NULL, -- Now it's deleted
                TRUE,
                p_log_id,
                jsonb_build_object(
                    'rollback_reason', p_reason,
                    'rollback_strategy', p_strategy,
                    'original_action', 'create'
                ),
                NULL,
                NULL
            ) RETURNING id INTO v_new_log_id;

        ELSIF UPPER(v_target_log.action) = 'DELETE' THEN
            -- Rollback DELETE = Re-CREATE the resource
            -- This is complex as we need to restore all fields
            EXECUTE format(
                'INSERT INTO hr_public.%I SELECT * FROM jsonb_populate_record(NULL::hr_public.%I, $1)',
                v_resource_table,
                v_resource_table
            ) USING v_before_snapshot;

            -- Create rollback activity log
            INSERT INTO hr_public.activity_logs (
                employee_id,
                user_id,
                action,
                resource_type,
                resource_id,
                before_snapshot,
                after_snapshot,
                is_rollback,
                rolled_back_log_id,
                details,
                ip_address,
                user_agent
            ) VALUES (
                v_current_user_id,
                v_current_user_id,
                'create',
                v_target_log.resource_type,
                v_resource_id,
                NULL,
                v_before_snapshot,
                TRUE,
                p_log_id,
                jsonb_build_object(
                    'rollback_reason', p_reason,
                    'rollback_strategy', p_strategy,
                    'original_action', 'delete'
                ),
                NULL,
                NULL
            ) RETURNING id INTO v_new_log_id;

        ELSIF UPPER(v_target_log.action) = 'UPDATE' THEN
            -- Rollback UPDATE = UPDATE to before_snapshot
            -- Build dynamic UPDATE statement
            DECLARE
                v_update_sql TEXT;
                v_set_clauses TEXT[];
                v_key TEXT;
                v_value TEXT;
            BEGIN
                -- Build SET clauses from before_snapshot
                FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_before_snapshot)
                LOOP
                    IF v_key != 'id' THEN -- Don't update the ID
                        v_set_clauses := array_append(
                            v_set_clauses,
                            format('%I = %L', v_key, v_value)
                        );
                    END IF;
                END LOOP;

                IF array_length(v_set_clauses, 1) > 0 THEN
                    v_update_sql := format(
                        'UPDATE hr_public.%I SET %s WHERE id = $1',
                        v_resource_table,
                        array_to_string(v_set_clauses, ', ')
                    );

                    EXECUTE v_update_sql USING v_resource_id;
                END IF;
            END;

            -- Create rollback activity log
            INSERT INTO hr_public.activity_logs (
                employee_id,
                user_id,
                action,
                resource_type,
                resource_id,
                before_snapshot,
                after_snapshot,
                is_rollback,
                rolled_back_log_id,
                details,
                ip_address,
                user_agent
            ) VALUES (
                v_current_user_id,
                v_current_user_id,
                'update',
                v_target_log.resource_type,
                v_resource_id,
                v_after_snapshot, -- Current state before rollback
                v_before_snapshot, -- Restored state
                TRUE,
                p_log_id,
                jsonb_build_object(
                    'rollback_reason', p_reason,
                    'rollback_strategy', p_strategy,
                    'original_action', 'update'
                ),
                NULL,
                NULL
            ) RETURNING id INTO v_new_log_id;

        ELSE
            RETURN QUERY SELECT FALSE, NULL::UUID, format('Unsupported action type: %s', v_target_log.action)::TEXT;
            RETURN;
        END IF;

        -- Success
        RETURN QUERY SELECT TRUE, v_new_log_id, NULL::TEXT;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, format('Rollback failed: %s', SQLERRM)::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function comment
COMMENT ON FUNCTION hr_public.execute_rollback IS 'Execute a rollback operation to restore a resource to its previous state (super_admin only)';

-- Grant execute permission to super_admin role
GRANT EXECUTE ON FUNCTION hr_public.execute_rollback(UUID, TEXT, TEXT, UUID) TO super_admin;

-- Migration complete
