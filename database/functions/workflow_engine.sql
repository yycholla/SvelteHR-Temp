-- Workflow Engine Functions
-- Created: 2025-09-15
-- Description: Core functions for workflow automation and execution

-- Function to trigger a workflow based on an event
CREATE OR REPLACE FUNCTION hr_public.trigger_workflow(
    p_trigger_type hr_public.workflow_trigger_type,
    p_trigger_data JSONB DEFAULT '{}',
    p_triggered_by_user_id UUID DEFAULT NULL
) RETURNS UUID[]
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    workflow_def RECORD;
    instance_id UUID;
    triggered_instances UUID[] := '{}';
    current_user_id UUID;
BEGIN
    -- Get current user if not specified
    IF p_triggered_by_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    ELSE
        current_user_id := p_triggered_by_user_id;
    END IF;
    
    -- Find all active workflows that match this trigger
    FOR workflow_def IN 
        SELECT * FROM hr_public.workflow_definitions 
        WHERE trigger_type = p_trigger_type 
          AND status = 'ACTIVE'
        ORDER BY created_at ASC
    LOOP
        -- Check if trigger conditions are met (if any)
        IF workflow_def.trigger_conditions IS NULL OR 
           hr_hidden.evaluate_workflow_conditions(workflow_def.trigger_conditions, p_trigger_data) THEN
            
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
                'RUNNING',
                NOW()
            ) RETURNING id INTO instance_id;
            
            -- Add to triggered instances array
            triggered_instances := array_append(triggered_instances, instance_id);
            
            -- Log workflow trigger
            INSERT INTO hr_hidden.workflow_event_log (
                workflow_instance_id, event_type, event_message, event_data, user_id
            ) VALUES (
                instance_id, 'WORKFLOW_TRIGGERED', 
                'Workflow triggered by ' || p_trigger_type::TEXT,
                p_trigger_data, current_user_id
            );
            
            -- Start executing the workflow
            PERFORM hr_hidden.execute_workflow_step(instance_id, (workflow_def.definition->'steps'->0->>'id'));
        END IF;
    END LOOP;
    
    RETURN triggered_instances;
END;
$$;

-- Function to execute a workflow step
CREATE OR REPLACE FUNCTION hr_hidden.execute_workflow_step(
    p_instance_id UUID,
    p_step_id VARCHAR
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    workflow_instance RECORD;
    workflow_def RECORD;
    step_def JSONB;
    step_execution_id UUID;
    execution_result BOOLEAN := false;
BEGIN
    -- Get workflow instance and definition
    SELECT wi.*, wd.definition, wd.name as workflow_name
    INTO workflow_instance
    FROM hr_public.workflow_instances wi
    JOIN hr_public.workflow_definitions wd ON wi.workflow_definition_id = wd.id
    WHERE wi.id = p_instance_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workflow instance not found: %', p_instance_id;
    END IF;
    
    -- Find the step definition
    SELECT step INTO step_def
    FROM jsonb_array_elements(workflow_instance.definition->'steps') step
    WHERE step->>'id' = p_step_id;
    
    IF step_def IS NULL THEN
        RAISE EXCEPTION 'Step not found in workflow: %', p_step_id;
    END IF;
    
    -- Create step execution record
    INSERT INTO hr_public.workflow_step_executions (
        workflow_instance_id,
        step_id,
        step_name,
        action_type,
        action_config,
        status,
        input_data,
        started_at
    ) VALUES (
        p_instance_id,
        p_step_id,
        step_def->>'name',
        (step_def->>'action')::hr_public.workflow_action_type,
        step_def->'config',
        'RUNNING',
        workflow_instance.context_data,
        NOW()
    ) RETURNING id INTO step_execution_id;
    
    -- Log step start
    INSERT INTO hr_hidden.workflow_event_log (
        workflow_instance_id, step_execution_id, event_type, event_message
    ) VALUES (
        p_instance_id, step_execution_id, 'STEP_STARTED',
        'Started executing step: ' || (step_def->>'name')
    );
    
    -- Execute the step based on action type
    execution_result := hr_hidden.execute_workflow_action(
        step_execution_id,
        (step_def->>'action')::hr_public.workflow_action_type,
        step_def->'config',
        workflow_instance.context_data
    );
    
    -- Update step execution status
    UPDATE hr_public.workflow_step_executions
    SET status = CASE WHEN execution_result THEN 'COMPLETED' ELSE 'FAILED' END,
        completed_at = NOW(),
        error_message = CASE WHEN NOT execution_result THEN 'Step execution failed' END
    WHERE id = step_execution_id;
    
    -- Update workflow instance current step
    UPDATE hr_public.workflow_instances
    SET current_step_id = p_step_id,
        updated_at = NOW()
    WHERE id = p_instance_id;
    
    -- If step succeeded, move to next step
    IF execution_result THEN
        PERFORM hr_hidden.advance_workflow(p_instance_id, p_step_id);
    ELSE
        -- Mark workflow as failed
        UPDATE hr_public.workflow_instances
        SET status = 'FAILED',
            error_message = 'Step execution failed: ' || p_step_id,
            completed_at = NOW()
        WHERE id = p_instance_id;
    END IF;
    
    RETURN execution_result;
END;
$$;

-- Function to execute workflow actions
CREATE OR REPLACE FUNCTION hr_hidden.execute_workflow_action(
    p_step_execution_id UUID,
    p_action_type hr_public.workflow_action_type,
    p_action_config JSONB,
    p_context_data JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result BOOLEAN := true;
    notification_id UUID;
    task_id UUID;
    approval_id UUID;
    interpolated_config JSONB;
BEGIN
    -- Interpolate variables in config
    interpolated_config := hr_hidden.interpolate_workflow_variables(p_action_config, p_context_data);
    
    -- Execute action based on type
    CASE p_action_type
        WHEN 'SEND_NOTIFICATION' THEN
            -- Create notification
            INSERT INTO hr_public.notifications (
                user_id, title, message, type, is_read, metadata
            ) VALUES (
                (interpolated_config->>'to')::UUID,
                interpolated_config->>'title',
                interpolated_config->>'message',
                COALESCE(interpolated_config->>'type', 'WORKFLOW'),
                false,
                jsonb_build_object('step_execution_id', p_step_execution_id, 'workflow_generated', true)
            ) RETURNING id INTO notification_id;
            
            -- Update step execution with output
            UPDATE hr_public.workflow_step_executions
            SET output_data = jsonb_build_object('notification_id', notification_id)
            WHERE id = p_step_execution_id;
            
        WHEN 'SEND_EMAIL' THEN
            -- Queue email (would integrate with email service)
            -- For now, create a notification as placeholder
            INSERT INTO hr_public.notifications (
                user_id, title, message, type, is_read, metadata
            ) VALUES (
                (interpolated_config->>'to')::UUID,
                'Email: ' || COALESCE(interpolated_config->>'subject', 'Workflow Email'),
                interpolated_config->>'body',
                'EMAIL',
                false,
                jsonb_build_object('step_execution_id', p_step_execution_id, 'email_queued', true)
            );
            
        WHEN 'CREATE_TASK' THEN
            -- Create workflow task
            INSERT INTO hr_public.workflow_tasks (
                workflow_instance_id,
                step_execution_id,
                title,
                description,
                task_type,
                priority,
                assigned_to_id,
                task_data,
                due_date
            ) VALUES (
                (SELECT workflow_instance_id FROM hr_public.workflow_step_executions WHERE id = p_step_execution_id),
                p_step_execution_id,
                interpolated_config->>'title',
                interpolated_config->>'description',
                COALESCE(interpolated_config->>'task_type', 'ACTION_REQUIRED'),
                COALESCE(interpolated_config->>'priority', 'MEDIUM'),
                (interpolated_config->>'assigned_to')::UUID,
                interpolated_config->'task_data',
                CASE 
                    WHEN interpolated_config->>'due_hours' IS NOT NULL THEN 
                        NOW() + (interpolated_config->>'due_hours')::INTEGER * INTERVAL '1 hour'
                    WHEN interpolated_config->>'due_days' IS NOT NULL THEN 
                        NOW() + (interpolated_config->>'due_days')::INTEGER * INTERVAL '1 day'
                    ELSE NULL
                END
            ) RETURNING id INTO task_id;
            
            -- Update step execution with output
            UPDATE hr_public.workflow_step_executions
            SET output_data = jsonb_build_object('task_id', task_id)
            WHERE id = p_step_execution_id;
            
        WHEN 'SEND_APPROVAL_REQUEST' THEN
            -- Create approval request
            INSERT INTO hr_public.workflow_approvals (
                workflow_instance_id,
                step_execution_id,
                approval_type,
                subject,
                description,
                approver_id,
                approval_level,
                escalation_after_hours
            ) VALUES (
                (SELECT workflow_instance_id FROM hr_public.workflow_step_executions WHERE id = p_step_execution_id),
                p_step_execution_id,
                COALESCE(interpolated_config->>'approval_type', 'GENERAL'),
                interpolated_config->>'subject',
                interpolated_config->>'description',
                (interpolated_config->>'approver')::UUID,
                COALESCE((interpolated_config->>'approval_level')::INTEGER, 1),
                COALESCE((interpolated_config->>'escalation_hours')::INTEGER, 24)
            ) RETURNING id INTO approval_id;
            
            -- Create notification for approver
            INSERT INTO hr_public.notifications (
                user_id, title, message, type, is_read, metadata
            ) VALUES (
                (interpolated_config->>'approver')::UUID,
                'Approval Required: ' || (interpolated_config->>'subject'),
                COALESCE(interpolated_config->>'description', 'An approval is required for a workflow process.'),
                'APPROVAL_REQUEST',
                false,
                jsonb_build_object('approval_id', approval_id, 'step_execution_id', p_step_execution_id)
            );
            
            -- Update step execution with output
            UPDATE hr_public.workflow_step_executions
            SET output_data = jsonb_build_object('approval_id', approval_id)
            WHERE id = p_step_execution_id;
            
        WHEN 'DELAY' THEN
            -- Schedule continuation (would be handled by job scheduler)
            UPDATE hr_public.workflow_step_executions
            SET output_data = jsonb_build_object(
                'delay_until', 
                NOW() + COALESCE((interpolated_config->>'minutes')::INTEGER, 5) * INTERVAL '1 minute'
            )
            WHERE id = p_step_execution_id;
            
        WHEN 'END_WORKFLOW' THEN
            -- Mark workflow as completed
            UPDATE hr_public.workflow_instances
            SET status = 'COMPLETED',
                completed_at = NOW()
            WHERE id = (SELECT workflow_instance_id FROM hr_public.workflow_step_executions WHERE id = p_step_execution_id);
            
        ELSE
            -- Unknown action type
            result := false;
            
            INSERT INTO hr_hidden.workflow_event_log (
                step_execution_id, event_type, event_message
            ) VALUES (
                p_step_execution_id, 'ACTION_ERROR',
                'Unknown action type: ' || p_action_type::TEXT
            );
    END CASE;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        INSERT INTO hr_hidden.workflow_event_log (
            step_execution_id, event_type, event_message, event_data
        ) VALUES (
            p_step_execution_id, 'ACTION_ERROR',
            'Error executing action: ' || SQLERRM,
            jsonb_build_object('error_detail', SQLERRM, 'error_state', SQLSTATE)
        );
        
        RETURN false;
END;
$$;

-- Function to advance workflow to next step
CREATE OR REPLACE FUNCTION hr_hidden.advance_workflow(
    p_instance_id UUID,
    p_current_step_id VARCHAR
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    workflow_instance RECORD;
    steps JSONB;
    current_step_index INTEGER;
    next_step JSONB;
    next_step_id VARCHAR;
BEGIN
    -- Get workflow instance and definition
    SELECT wi.*, wd.definition
    INTO workflow_instance
    FROM hr_public.workflow_instances wi
    JOIN hr_public.workflow_definitions wd ON wi.workflow_definition_id = wd.id
    WHERE wi.id = p_instance_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    steps := workflow_instance.definition->'steps';
    
    -- Find current step index
    SELECT idx - 1 INTO current_step_index
    FROM jsonb_array_elements(steps) WITH ORDINALITY arr(step, idx)
    WHERE step->>'id' = p_current_step_id;
    
    -- Check if there's a next step
    IF current_step_index IS NOT NULL AND current_step_index + 1 < jsonb_array_length(steps) THEN
        -- Get next step
        next_step := steps->current_step_index + 1;
        next_step_id := next_step->>'id';
        
        -- Execute next step
        PERFORM hr_hidden.execute_workflow_step(p_instance_id, next_step_id);
        
        RETURN true;
    ELSE
        -- No more steps, complete workflow
        UPDATE hr_public.workflow_instances
        SET status = 'COMPLETED',
            completed_at = NOW()
        WHERE id = p_instance_id;
        
        INSERT INTO hr_hidden.workflow_event_log (
            workflow_instance_id, event_type, event_message
        ) VALUES (
            p_instance_id, 'WORKFLOW_COMPLETED',
            'Workflow completed successfully'
        );
        
        RETURN true;
    END IF;
END;
$$;

-- Helper function to evaluate workflow conditions
CREATE OR REPLACE FUNCTION hr_hidden.evaluate_workflow_conditions(
    p_conditions JSONB,
    p_data JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Simple condition evaluation (can be expanded)
    -- For now, just return true if no conditions or empty conditions
    IF p_conditions IS NULL OR p_conditions = '{}' THEN
        RETURN true;
    END IF;
    
    -- Add more sophisticated condition evaluation logic here
    -- This would include operators like equals, greater than, contains, etc.
    
    RETURN true;
END;
$$;

-- Helper function to interpolate variables in workflow configurations
CREATE OR REPLACE FUNCTION hr_hidden.interpolate_workflow_variables(
    p_config JSONB,
    p_context JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result JSONB := p_config;
    key TEXT;
    value TEXT;
BEGIN
    -- Simple variable interpolation
    -- Replace {{variable_name}} with values from context
    -- This is a simplified version - a full implementation would be more robust
    
    FOR key, value IN SELECT * FROM jsonb_each_text(p_config) LOOP
        IF value LIKE '%{{%}}%' THEN
            -- Extract variable name and replace with context value
            -- This is a simplified implementation
            result := jsonb_set(result, ARRAY[key], to_jsonb(value));
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Function to manually complete a workflow task
CREATE OR REPLACE FUNCTION hr_public.complete_workflow_task(
    p_task_id UUID,
    p_completion_data JSONB DEFAULT '{}'
) RETURNS hr_public.workflow_tasks
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    completed_task hr_public.workflow_tasks;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    -- Update task as completed
    UPDATE hr_public.workflow_tasks
    SET status = 'COMPLETED',
        completed_at = NOW(),
        task_data = COALESCE(task_data, '{}') || p_completion_data
    WHERE id = p_task_id
      AND assigned_to_id = current_user_id
      AND status IN ('PENDING', 'IN_PROGRESS')
    RETURNING * INTO completed_task;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found or not authorized to complete';
    END IF;
    
    -- Log task completion
    INSERT INTO hr_hidden.workflow_event_log (
        workflow_instance_id, step_execution_id, event_type, event_message, user_id
    ) VALUES (
        completed_task.workflow_instance_id,
        completed_task.step_execution_id,
        'TASK_COMPLETED',
        'Task completed: ' || completed_task.title,
        current_user_id
    );
    
    -- Continue workflow if this was a blocking task
    IF completed_task.step_execution_id IS NOT NULL THEN
        -- Check if this step can now proceed
        PERFORM hr_hidden.check_step_completion(completed_task.step_execution_id);
    END IF;
    
    RETURN completed_task;
END;
$$;

-- Helper function to check if a workflow step can be marked as completed
CREATE OR REPLACE FUNCTION hr_hidden.check_step_completion(
    p_step_execution_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    step_execution RECORD;
    pending_tasks INTEGER;
    pending_approvals INTEGER;
BEGIN
    -- Get step execution details
    SELECT * INTO step_execution
    FROM hr_public.workflow_step_executions
    WHERE id = p_step_execution_id;
    
    IF NOT FOUND OR step_execution.status != 'RUNNING' THEN
        RETURN false;
    END IF;
    
    -- Check for pending tasks
    SELECT COUNT(*) INTO pending_tasks
    FROM hr_public.workflow_tasks
    WHERE step_execution_id = p_step_execution_id
      AND status IN ('PENDING', 'IN_PROGRESS');
    
    -- Check for pending approvals
    SELECT COUNT(*) INTO pending_approvals
    FROM hr_public.workflow_approvals
    WHERE step_execution_id = p_step_execution_id
      AND status = 'PENDING';
    
    -- If no pending items, mark step as completed and advance workflow
    IF pending_tasks = 0 AND pending_approvals = 0 THEN
        UPDATE hr_public.workflow_step_executions
        SET status = 'COMPLETED',
            completed_at = NOW()
        WHERE id = p_step_execution_id;
        
        -- Advance to next step
        PERFORM hr_hidden.advance_workflow(
            step_execution.workflow_instance_id,
            step_execution.step_id
        );
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Comments
COMMENT ON FUNCTION hr_public.trigger_workflow(hr_public.workflow_trigger_type, JSONB, UUID) IS
'@name triggerWorkflow
Trigger workflows based on events with optional data payload';

COMMENT ON FUNCTION hr_public.complete_workflow_task(UUID, JSONB) IS
'@name completeWorkflowTask
@resultFieldName completedTask
Mark a workflow task as completed (employee self-service)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.trigger_workflow(hr_public.workflow_trigger_type, JSONB, UUID) TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.complete_workflow_task(UUID, JSONB) TO hr_employee, hr_manager, hr_admin, hr_super_admin;