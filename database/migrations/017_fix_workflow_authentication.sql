-- Migration: Fix Workflow Authentication Issues
-- Created: 2025-09-15
-- Description: Fix authentication handling in workflow trigger function

-- Update the workflow trigger function to handle null user_id gracefully
CREATE OR REPLACE FUNCTION hr_public.trigger_workflow_simple(
    p_trigger_type hr_public.workflow_trigger_type,
    p_trigger_data JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    workflow_def RECORD;
    instance_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user with better fallback logic
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;
    
    -- If no authenticated user, find a system admin user
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id 
        FROM hr_public.users 
        WHERE email = 'admin@postgraphile-hr.com' 
        LIMIT 1;
        
        -- If no admin user found, create a system user for workflow operations
        IF current_user_id IS NULL THEN
            RAISE EXCEPTION 'No valid user found for workflow operation. Please ensure system admin user exists.';
        END IF;
    END IF;
    
    -- Find first active workflow that matches this trigger
    SELECT * INTO workflow_def
    FROM hr_public.workflow_definitions 
    WHERE trigger_type = p_trigger_type 
      AND status = 'ACTIVE'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active workflow found for trigger type: %', p_trigger_type;
    END IF;
    
    -- Create workflow instance
    INSERT INTO hr_public.workflow_instances (
        workflow_definition_id,
        instance_name,
        triggered_by_user_id,
        triggered_by_event,
        trigger_data,
        context_data,
        current_step_id,
        status,
        started_at
    ) VALUES (
        workflow_def.id,
        workflow_def.name || ' - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
        current_user_id,
        p_trigger_type::TEXT,
        p_trigger_data,
        jsonb_build_object(
            'workflow_id', workflow_def.id,
            'trigger_type', p_trigger_type,
            'trigger_data', p_trigger_data,
            'triggered_by', current_user_id,
            'started_at', NOW()
        ),
        (workflow_def.definition->'steps'->0->>'id'),
        'RUNNING'::hr_public.workflow_instance_status,
        NOW()
    ) RETURNING id INTO instance_id;
    
    -- Log workflow trigger
    INSERT INTO hr_hidden.workflow_event_log (
        workflow_instance_id, event_type, event_message, event_data, user_id
    ) VALUES (
        instance_id, 'WORKFLOW_TRIGGERED', 
        'Workflow triggered by ' || p_trigger_type::TEXT,
        p_trigger_data, current_user_id
    );
    
    -- Create a simple notification as proof of concept
    INSERT INTO hr_public.notifications (
        user_id, title, message, type, is_read, metadata
    ) VALUES (
        current_user_id,
        'Workflow Started: ' || workflow_def.name,
        'A new workflow has been triggered: ' || workflow_def.description,
        'WORKFLOW',
        false,
        jsonb_build_object('workflow_instance_id', instance_id, 'workflow_generated', true)
    );
    
    RETURN instance_id;
END;
$$;

-- Update function comment for PostGraphile
COMMENT ON FUNCTION hr_public.trigger_workflow_simple(hr_public.workflow_trigger_type, JSONB) IS
'@name triggerWorkflowSimple
@resultFieldName workflowInstanceId
Simplified workflow trigger with authentication handling for testing automation';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.trigger_workflow_simple(hr_public.workflow_trigger_type, JSONB) TO hr_admin, hr_super_admin;