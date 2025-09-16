-- Advanced Notifications System Functions
-- Created: 2025-09-15
-- Description: Functions for template-based notifications, delivery tracking, and user preferences

-- Function to send notification using template
CREATE OR REPLACE FUNCTION hr_public.send_templated_notification(
    p_template_key VARCHAR(100),
    p_user_id UUID,
    p_template_data JSONB DEFAULT '{}',
    p_priority hr_public.notification_priority DEFAULT NULL,
    p_channels hr_public.notification_channel[] DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_source_type VARCHAR(100) DEFAULT NULL,
    p_source_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    template_record RECORD;
    notification_id UUID;
    final_priority hr_public.notification_priority;
    final_channels hr_public.notification_channel[];
    interpolated_subject TEXT;
    interpolated_body TEXT;
    interpolated_url TEXT;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM hr_public.notification_templates 
    WHERE template_key = p_template_key AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_key;
    END IF;
    
    -- Determine final priority and channels
    final_priority := COALESCE(p_priority, template_record.default_priority);
    final_channels := COALESCE(p_channels, template_record.default_channels);
    
    -- Simple template interpolation (basic implementation)
    interpolated_subject := template_record.subject_template;
    interpolated_body := template_record.body_template;
    interpolated_url := template_record.action_url_template;
    
    -- Replace common template variables
    IF p_template_data ? 'workflow_name' THEN
        interpolated_subject := REPLACE(interpolated_subject, '{{workflow_name}}', p_template_data->>'workflow_name');
        interpolated_body := REPLACE(interpolated_body, '{{workflow_name}}', p_template_data->>'workflow_name');
    END IF;
    
    IF p_template_data ? 'user_name' THEN
        interpolated_subject := REPLACE(interpolated_subject, '{{user_name}}', p_template_data->>'user_name');
        interpolated_body := REPLACE(interpolated_body, '{{user_name}}', p_template_data->>'user_name');
    END IF;
    
    -- Create notification
    INSERT INTO hr_public.notifications (
        user_id, title, message, type, category, priority, 
        template_key, template_data, action_url, expires_at,
        source_type, source_id, metadata, is_read
    ) VALUES (
        p_user_id,
        interpolated_subject,
        interpolated_body,
        template_record.category::TEXT,
        template_record.category,
        final_priority,
        p_template_key,
        p_template_data,
        interpolated_url,
        p_expires_at,
        p_source_type,
        p_source_id,
        jsonb_build_object(
            'template_key', p_template_key,
            'channels', final_channels,
            'created_by_template', true
        ),
        false
    ) RETURNING id INTO notification_id;
    
    -- Create delivery records for each channel
    INSERT INTO hr_public.notification_deliveries (
        notification_id, user_id, channel, status
    )
    SELECT 
        notification_id, 
        p_user_id, 
        unnest(final_channels),
        'PENDING'::hr_public.delivery_status;
    
    RETURN notification_id;
END;
$$;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION hr_public.get_user_notification_preferences(
    p_user_id UUID,
    p_category hr_public.notification_category DEFAULT NULL
) RETURNS TABLE(
    category hr_public.notification_category,
    template_key VARCHAR(100),
    enabled_channels hr_public.notification_channel[],
    digest_frequency hr_public.digest_frequency,
    min_priority hr_public.notification_priority
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.category,
        np.template_key,
        np.enabled_channels,
        np.digest_frequency,
        np.min_priority
    FROM hr_public.notification_preferences np
    WHERE np.user_id = p_user_id
      AND (p_category IS NULL OR np.category = p_category);
END;
$$;

-- Function to update notification delivery status
CREATE OR REPLACE FUNCTION hr_public.update_delivery_status(
    p_delivery_id UUID,
    p_status hr_public.delivery_status,
    p_external_id TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    delivery_record RECORD;
BEGIN
    -- Get current delivery record
    SELECT * INTO delivery_record
    FROM hr_public.notification_deliveries
    WHERE id = p_delivery_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update delivery status with appropriate timestamps
    UPDATE hr_public.notification_deliveries 
    SET 
        status = p_status,
        external_id = COALESCE(p_external_id, external_id),
        error_message = p_error_message,
        sent_at = CASE WHEN p_status = 'SENT' THEN NOW() ELSE sent_at END,
        delivered_at = CASE WHEN p_status = 'DELIVERED' THEN NOW() ELSE delivered_at END,
        read_at = CASE WHEN p_status = 'READ' THEN NOW() ELSE read_at END,
        clicked_at = CASE WHEN p_status = 'CLICKED' THEN NOW() ELSE clicked_at END,
        failed_at = CASE WHEN p_status = 'FAILED' THEN NOW() ELSE failed_at END,
        retry_count = CASE 
            WHEN p_status = 'FAILED' THEN retry_count + 1 
            ELSE retry_count 
        END,
        next_retry_at = CASE 
            WHEN p_status = 'FAILED' AND retry_count < max_retries 
            THEN NOW() + INTERVAL '15 minutes' * POWER(2, retry_count) -- Exponential backoff
            ELSE NULL 
        END,
        updated_at = NOW()
    WHERE id = p_delivery_id;
    
    -- Update notification read status if delivery was read
    IF p_status = 'READ' THEN
        UPDATE hr_public.notifications 
        SET is_read = true, read_at = NOW()
        WHERE id = delivery_record.notification_id AND NOT is_read;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to subscribe to resource notifications
CREATE OR REPLACE FUNCTION hr_public.subscribe_to_notifications(
    p_user_id UUID,
    p_resource_type VARCHAR(100),
    p_resource_id UUID,
    p_categories hr_public.notification_category[] DEFAULT ARRAY['ALERT', 'WORKFLOW'],
    p_channels hr_public.notification_channel[] DEFAULT ARRAY['IN_APP']
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    subscription_id UUID;
BEGIN
    -- Insert or update subscription
    INSERT INTO hr_public.notification_subscriptions (
        user_id, resource_type, resource_id, categories, channels
    ) VALUES (
        p_user_id, p_resource_type, p_resource_id, p_categories, p_channels
    )
    ON CONFLICT (user_id, resource_type, resource_id) 
    DO UPDATE SET
        categories = p_categories,
        channels = p_channels,
        unsubscribed_at = NULL,
        created_at = NOW()
    RETURNING id INTO subscription_id;
    
    RETURN subscription_id;
END;
$$;

-- Function to unsubscribe from resource notifications
CREATE OR REPLACE FUNCTION hr_public.unsubscribe_from_notifications(
    p_user_id UUID,
    p_resource_type VARCHAR(100),
    p_resource_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE hr_public.notification_subscriptions
    SET unsubscribed_at = NOW()
    WHERE user_id = p_user_id 
      AND resource_type = p_resource_type 
      AND resource_id = p_resource_id
      AND unsubscribed_at IS NULL;
    
    RETURN FOUND;
END;
$$;

-- Function to get pending delivery queue
CREATE OR REPLACE FUNCTION hr_public.get_pending_deliveries(
    p_channel hr_public.notification_channel DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
) RETURNS TABLE(
    delivery_id UUID,
    notification_id UUID,
    user_id UUID,
    channel hr_public.notification_channel,
    channel_address TEXT,
    notification_title TEXT,
    notification_message TEXT,
    priority hr_public.notification_priority,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nd.id,
        nd.notification_id,
        nd.user_id,
        nd.channel,
        nd.channel_address,
        n.title,
        n.message,
        n.priority,
        nd.created_at
    FROM hr_public.notification_deliveries nd
    JOIN hr_public.notifications n ON nd.notification_id = n.id
    WHERE nd.status = 'PENDING'::hr_public.delivery_status
      AND (p_channel IS NULL OR nd.channel = p_channel)
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.priority DESC, nd.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION hr_public.mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user if not provided
    IF p_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            RETURN FALSE;
        END;
    ELSE
        current_user_id := p_user_id;
    END IF;
    
    -- Update notification
    UPDATE hr_public.notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id 
      AND user_id = current_user_id 
      AND NOT is_read;
    
    -- Update delivery records
    UPDATE hr_public.notification_deliveries
    SET status = 'READ', read_at = NOW()
    WHERE notification_id = p_notification_id 
      AND user_id = current_user_id
      AND status IN ('PENDING', 'SENT', 'DELIVERED');
    
    RETURN FOUND;
END;
$$;

-- Add PostGraphile comments
COMMENT ON FUNCTION hr_public.send_templated_notification(VARCHAR, UUID, JSONB, hr_public.notification_priority, hr_public.notification_channel[], TIMESTAMPTZ, VARCHAR, UUID) IS
'@name sendTemplatedNotification
@resultFieldName notificationId
Send notification using predefined template with variable interpolation';

COMMENT ON FUNCTION hr_public.get_user_notification_preferences(UUID, hr_public.notification_category) IS
'@name getUserNotificationPreferences
Get user notification preferences for categories and templates';

COMMENT ON FUNCTION hr_public.update_delivery_status(UUID, hr_public.delivery_status, TEXT, TEXT) IS
'@name updateDeliveryStatus
Update notification delivery status with tracking timestamps';

COMMENT ON FUNCTION hr_public.subscribe_to_notifications(UUID, VARCHAR, UUID, hr_public.notification_category[], hr_public.notification_channel[]) IS
'@name subscribeToNotifications
@resultFieldName subscriptionId
Subscribe to notifications for specific resources';

COMMENT ON FUNCTION hr_public.unsubscribe_from_notifications(UUID, VARCHAR, UUID) IS
'@name unsubscribeFromNotifications
Unsubscribe from notifications for specific resources';

COMMENT ON FUNCTION hr_public.get_pending_deliveries(hr_public.notification_channel, INTEGER) IS
'@name getPendingDeliveries
Get pending notifications for delivery processing';

COMMENT ON FUNCTION hr_public.mark_notification_read(UUID, UUID) IS
'@name markNotificationRead
Mark notification as read and update delivery status';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.send_templated_notification(VARCHAR, UUID, JSONB, hr_public.notification_priority, hr_public.notification_channel[], TIMESTAMPTZ, VARCHAR, UUID) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.get_user_notification_preferences(UUID, hr_public.notification_category) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.update_delivery_status(UUID, hr_public.delivery_status, TEXT, TEXT) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.subscribe_to_notifications(UUID, VARCHAR, UUID, hr_public.notification_category[], hr_public.notification_channel[]) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.unsubscribe_from_notifications(UUID, VARCHAR, UUID) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.get_pending_deliveries(hr_public.notification_channel, INTEGER) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.mark_notification_read(UUID, UUID) TO hr_employee, hr_manager, hr_admin, hr_super_admin;