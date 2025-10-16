-- Add developer settings category for system_admin debugging tools
-- Only accessible to system_admin role

INSERT INTO hr_public.system_settings (category, settings) VALUES
('developer', jsonb_build_object(
    'show_debug_info', false,
    'show_performance_metrics', false,
    'log_level', 'info'
))
ON CONFLICT (category) DO NOTHING;

-- Add comment
COMMENT ON TABLE hr_public.system_settings IS 'System-wide configuration settings (system_admin only) - includes developer debugging options';
