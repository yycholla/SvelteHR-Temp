--
-- PostgreSQL database dump
--

\restrict nVdwgbbJOChqVdSJ46aSvaH7jHPkL029UAFAk13O64VzBYCJcZHZLI5HBLtznY2

-- Dumped from database version 15.14
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS postgraphile_watch_drop;
DROP EVENT TRIGGER IF EXISTS postgraphile_watch_ddl;
DROP POLICY IF EXISTS tasks_update_policy ON hr_public.tasks;
DROP POLICY IF EXISTS tasks_select_policy ON hr_public.tasks;
DROP POLICY IF EXISTS tasks_insert_policy ON hr_public.tasks;
DROP POLICY IF EXISTS task_assignees_policy ON hr_public.task_assignees;
DROP POLICY IF EXISTS super_admin_update_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS super_admin_all_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS preferences_own_policy ON hr_public.notification_preferences;
DROP POLICY IF EXISTS notifications_own_policy ON hr_public.event_notifications;
DROP POLICY IF EXISTS manager_view_department_time_off_balances ON hr_public.time_off_balances;
DROP POLICY IF EXISTS manager_view_department_performance_reviews ON hr_public.performance_reviews;
DROP POLICY IF EXISTS manager_view_department_leave_requests ON hr_public.leave_requests;
DROP POLICY IF EXISTS manager_view_department_goals ON hr_public.employee_goals;
DROP POLICY IF EXISTS manager_update_department_performance_reviews ON hr_public.performance_reviews;
DROP POLICY IF EXISTS manager_update_department_leave_requests ON hr_public.leave_requests;
DROP POLICY IF EXISTS manager_update_department_goals ON hr_public.employee_goals;
DROP POLICY IF EXISTS manager_delete_department_performance_reviews ON hr_public.performance_reviews;
DROP POLICY IF EXISTS manager_delete_department_goals ON hr_public.employee_goals;
DROP POLICY IF EXISTS manager_create_department_performance_reviews ON hr_public.performance_reviews;
DROP POLICY IF EXISTS manager_create_department_goals ON hr_public.employee_goals;
DROP POLICY IF EXISTS events_update_policy ON hr_public.events;
DROP POLICY IF EXISTS events_select_policy ON hr_public.events;
DROP POLICY IF EXISTS events_insert_policy ON hr_public.events;
DROP POLICY IF EXISTS events_delete_policy ON hr_public.events;
DROP POLICY IF EXISTS employee_view_own_time_off_balances ON hr_public.time_off_balances;
DROP POLICY IF EXISTS employee_view_own_performance_reviews ON hr_public.performance_reviews;
DROP POLICY IF EXISTS employee_view_own_leave_requests ON hr_public.leave_requests;
DROP POLICY IF EXISTS employee_view_own_goals ON hr_public.employee_goals;
DROP POLICY IF EXISTS employee_vehicles_view_own ON hr_public.employee_vehicles;
DROP POLICY IF EXISTS employee_vehicles_manage_own ON hr_public.employee_vehicles;
DROP POLICY IF EXISTS employee_update_own_goal_progress ON hr_public.employee_goals;
DROP POLICY IF EXISTS employee_create_own_leave_requests ON hr_public.leave_requests;
DROP POLICY IF EXISTS emergency_contacts_view_own ON hr_public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_manage_own ON hr_public.emergency_contacts;
DROP POLICY IF EXISTS documents_select_policy ON hr_public.documents;
DROP POLICY IF EXISTS documents_insert_policy ON hr_public.documents;
DROP POLICY IF EXISTS bulk_rollback_select_policy ON hr_public.bulk_rollback_batches;
DROP POLICY IF EXISTS attendees_select_policy ON hr_public.event_attendees;
DROP POLICY IF EXISTS assignments_select_policy ON hr_public.document_assignments;
DROP POLICY IF EXISTS admin_own_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS admin_full_access_time_off_balances ON hr_public.time_off_balances;
DROP POLICY IF EXISTS admin_full_access_performance_reviews ON hr_public.performance_reviews;
DROP POLICY IF EXISTS admin_full_access_leave_requests ON hr_public.leave_requests;
DROP POLICY IF EXISTS admin_full_access_goals ON hr_public.employee_goals;
DROP POLICY IF EXISTS admin_create_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS access_logs_select_policy ON hr_public.document_access_logs;
DROP POLICY IF EXISTS compensation_records_hr_full_access ON hr_private.compensation_records;
DROP POLICY IF EXISTS compensation_records_employee_view_own ON hr_private.compensation_records;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_rolled_back_log_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_rolled_back_by_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.users DROP CONSTRAINT IF EXISTS users_department_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_role_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.time_off_balances DROP CONSTRAINT IF EXISTS time_off_balances_policy_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.time_off_balances DROP CONSTRAINT IF EXISTS time_off_balances_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS tasks_department_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_depends_on_task_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_audit_entries DROP CONSTRAINT IF EXISTS task_audit_entries_task_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_audit_entries DROP CONSTRAINT IF EXISTS task_audit_entries_changed_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_task_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.rollback_requests DROP CONSTRAINT IF EXISTS rollback_requests_reviewed_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.rollback_requests DROP CONSTRAINT IF EXISTS rollback_requests_requested_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.rollback_requests DROP CONSTRAINT IF EXISTS rollback_requests_activity_log_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.review_templates DROP CONSTRAINT IF EXISTS review_templates_created_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.review_goals DROP CONSTRAINT IF EXISTS review_goals_review_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.review_goals DROP CONSTRAINT IF EXISTS review_goals_goal_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_reviewer_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.payroll_records DROP CONSTRAINT IF EXISTS payroll_records_processed_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.payroll_records DROP CONSTRAINT IF EXISTS payroll_records_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.payroll_records DROP CONSTRAINT IF EXISTS payroll_records_created_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.linked_resources DROP CONSTRAINT IF EXISTS linked_resources_task_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.linked_resources DROP CONSTRAINT IF EXISTS linked_resources_created_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_manager_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.hr_reports DROP CONSTRAINT IF EXISTS hr_reports_department_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.hr_reports DROP CONSTRAINT IF EXISTS hr_reports_creator_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.users DROP CONSTRAINT IF EXISTS fk_users_manager;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_parent;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_assignee;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_archived_by;
ALTER TABLE IF EXISTS ONLY hr_public.departments DROP CONSTRAINT IF EXISTS fk_departments_parent;
ALTER TABLE IF EXISTS ONLY hr_public.events DROP CONSTRAINT IF EXISTS events_recurrence_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_waitlist DROP CONSTRAINT IF EXISTS event_waitlist_event_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_waitlist DROP CONSTRAINT IF EXISTS event_waitlist_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_notifications DROP CONSTRAINT IF EXISTS event_notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_notifications DROP CONSTRAINT IF EXISTS event_notifications_event_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_history DROP CONSTRAINT IF EXISTS event_history_event_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_history DROP CONSTRAINT IF EXISTS event_history_changed_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_comments DROP CONSTRAINT IF EXISTS event_comments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_comments DROP CONSTRAINT IF EXISTS event_comments_event_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_attendees DROP CONSTRAINT IF EXISTS event_attendees_event_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_attendees DROP CONSTRAINT IF EXISTS event_attendees_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.encrypted_file_storage DROP CONSTRAINT IF EXISTS encrypted_file_storage_encryption_key_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.encrypted_file_storage DROP CONSTRAINT IF EXISTS encrypted_file_storage_document_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.employee_vehicles DROP CONSTRAINT IF EXISTS employee_vehicles_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.employee_goals DROP CONSTRAINT IF EXISTS employee_goals_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.employee_goals DROP CONSTRAINT IF EXISTS employee_goals_created_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.emergency_contacts DROP CONSTRAINT IF EXISTS emergency_contacts_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.documents DROP CONSTRAINT IF EXISTS documents_category_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_versions DROP CONSTRAINT IF EXISTS document_versions_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_versions DROP CONSTRAINT IF EXISTS document_versions_document_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_categories DROP CONSTRAINT IF EXISTS document_categories_parent_category_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_assignments DROP CONSTRAINT IF EXISTS document_assignments_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_assignments DROP CONSTRAINT IF EXISTS document_assignments_document_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_assignments DROP CONSTRAINT IF EXISTS document_assignments_department_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_assignments DROP CONSTRAINT IF EXISTS document_assignments_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_access_logs DROP CONSTRAINT IF EXISTS document_access_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_access_logs DROP CONSTRAINT IF EXISTS document_access_logs_document_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.departments DROP CONSTRAINT IF EXISTS departments_manager_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.compensation_bands DROP CONSTRAINT IF EXISTS compensation_bands_created_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.bulk_rollback_items DROP CONSTRAINT IF EXISTS bulk_rollback_items_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.bulk_rollback_items DROP CONSTRAINT IF EXISTS bulk_rollback_items_activity_log_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.bulk_rollback_batches DROP CONSTRAINT IF EXISTS bulk_rollback_batches_reviewed_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.bulk_rollback_batches DROP CONSTRAINT IF EXISTS bulk_rollback_batches_requested_by_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_private.compensation_records DROP CONSTRAINT IF EXISTS compensation_records_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY hr_private.compensation_records DROP CONSTRAINT IF EXISTS compensation_records_created_by_fkey;
DROP TRIGGER IF EXISTS waitlist_promotion_trigger ON hr_public.event_attendees;
DROP TRIGGER IF EXISTS update_employee_vehicles_updated_at ON hr_public.employee_vehicles;
DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON hr_public.emergency_contacts;
DROP TRIGGER IF EXISTS task_update_timestamp_trigger ON hr_public.tasks;
DROP TRIGGER IF EXISTS task_audit_trigger ON hr_public.tasks;
DROP TRIGGER IF EXISTS sync_task_assignee_trigger ON hr_public.tasks;
DROP TRIGGER IF EXISTS document_update_timestamp_trigger ON hr_public.documents;
DROP TRIGGER IF EXISTS assignment_expiry_trigger ON hr_public.document_assignments;
DROP TRIGGER IF EXISTS update_compensation_records_updated_at ON hr_private.compensation_records;
CREATE OR REPLACE VIEW hr_public.employees_with_contacts AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(255) AS email,
    NULL::character varying(255) AS first_name,
    NULL::character varying(255) AS last_name,
    NULL::character varying(255) AS display_name,
    NULL::character varying(50) AS role,
    NULL::uuid AS department_id,
    NULL::character varying(20) AS phone_number,
    NULL::character varying(20) AS mobile_number,
    NULL::character varying(255) AS address_line1,
    NULL::character varying(255) AS address_line2,
    NULL::character varying(100) AS city,
    NULL::character varying(100) AS state_province,
    NULL::character varying(20) AS postal_code,
    NULL::character varying(100) AS country,
    NULL::date AS hire_date,
    NULL::boolean AS is_active,
    NULL::bigint AS emergency_contact_count,
    NULL::bigint AS vehicle_count;
DROP INDEX IF EXISTS public.idx_activity_logs_rolled_back_log_id;
DROP INDEX IF EXISTS public.idx_activity_logs_is_rollback;
DROP INDEX IF EXISTS public.idx_activity_logs_entity;
DROP INDEX IF EXISTS public.idx_activity_logs_employee;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;
DROP INDEX IF EXISTS public.idx_activity_logs_action;
DROP INDEX IF EXISTS hr_public.users_search_idx;
DROP INDEX IF EXISTS hr_public.users_department_role_idx;
DROP INDEX IF EXISTS hr_public.user_role_assignments_user_idx;
DROP INDEX IF EXISTS hr_public.time_off_balances_employee_idx;
DROP INDEX IF EXISTS hr_public.performance_reviews_period_idx;
DROP INDEX IF EXISTS hr_public.performance_reviews_in_progress_idx;
DROP INDEX IF EXISTS hr_public.performance_reviews_department_idx;
DROP INDEX IF EXISTS hr_public.payroll_records_employee_period_idx;
DROP INDEX IF EXISTS hr_public.notifications_unread_recipient_idx;
DROP INDEX IF EXISTS hr_public.notifications_type_idx;
DROP INDEX IF EXISTS hr_public.notifications_recipient_id_idx;
DROP INDEX IF EXISTS hr_public.notifications_read_status_idx;
DROP INDEX IF EXISTS hr_public.notifications_created_at_idx;
DROP INDEX IF EXISTS hr_public.notifications_category_idx;
DROP INDEX IF EXISTS hr_public.leave_requests_pending_idx;
DROP INDEX IF EXISTS hr_public.leave_requests_department_id_idx;
DROP INDEX IF EXISTS hr_public.leave_requests_date_range_idx;
DROP INDEX IF EXISTS hr_public.idx_waitlist_event;
DROP INDEX IF EXISTS hr_public.idx_waitlist_employee;
DROP INDEX IF EXISTS hr_public.idx_users_status;
DROP INDEX IF EXISTS hr_public.idx_users_role;
DROP INDEX IF EXISTS hr_public.idx_users_manager_id;
DROP INDEX IF EXISTS hr_public.idx_users_job_title;
DROP INDEX IF EXISTS hr_public.idx_users_email;
DROP INDEX IF EXISTS hr_public.idx_users_department_id;
DROP INDEX IF EXISTS hr_public.idx_users_active;
DROP INDEX IF EXISTS hr_public.idx_user_role_assignments_user_id;
DROP INDEX IF EXISTS hr_public.idx_user_role_assignments_role_name;
DROP INDEX IF EXISTS hr_public.idx_user_role_assignments_role_id;
DROP INDEX IF EXISTS hr_public.idx_user_role_assignments_deleted_at;
DROP INDEX IF EXISTS hr_public.idx_user_role_assignments_assigned_by;
DROP INDEX IF EXISTS hr_public.idx_time_off_balances_policy_id;
DROP INDEX IF EXISTS hr_public.idx_time_off_balances_employee_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_type;
DROP INDEX IF EXISTS hr_public.idx_tasks_title_fulltext;
DROP INDEX IF EXISTS hr_public.idx_tasks_tags;
DROP INDEX IF EXISTS hr_public.idx_tasks_status;
DROP INDEX IF EXISTS hr_public.idx_tasks_priority;
DROP INDEX IF EXISTS hr_public.idx_tasks_parent_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_metadata;
DROP INDEX IF EXISTS hr_public.idx_tasks_due_date;
DROP INDEX IF EXISTS hr_public.idx_tasks_description_fulltext;
DROP INDEX IF EXISTS hr_public.idx_tasks_department;
DROP INDEX IF EXISTS hr_public.idx_tasks_deleted_at;
DROP INDEX IF EXISTS hr_public.idx_tasks_created_by;
DROP INDEX IF EXISTS hr_public.idx_tasks_assignee_id;
DROP INDEX IF EXISTS hr_public.idx_tasks_archived_by;
DROP INDEX IF EXISTS hr_public.idx_tasks_archived;
DROP INDEX IF EXISTS hr_public.idx_task_deps_task;
DROP INDEX IF EXISTS hr_public.idx_task_deps_depends_on;
DROP INDEX IF EXISTS hr_public.idx_task_audit_task;
DROP INDEX IF EXISTS hr_public.idx_task_audit_changed_by;
DROP INDEX IF EXISTS hr_public.idx_task_audit_change_type;
DROP INDEX IF EXISTS hr_public.idx_task_assignees_user;
DROP INDEX IF EXISTS hr_public.idx_task_assignees_assigned_by;
DROP INDEX IF EXISTS hr_public.idx_rollback_requests_status;
DROP INDEX IF EXISTS hr_public.idx_rollback_requests_requester;
DROP INDEX IF EXISTS hr_public.idx_rollback_requests_requested_at;
DROP INDEX IF EXISTS hr_public.idx_rollback_requests_log;
DROP INDEX IF EXISTS hr_public.idx_roles_deleted_at;
DROP INDEX IF EXISTS hr_public.idx_role_permissions_role_id;
DROP INDEX IF EXISTS hr_public.idx_role_permissions_permission_id;
DROP INDEX IF EXISTS hr_public.idx_role_permissions_deleted_at;
DROP INDEX IF EXISTS hr_public.idx_reviews_type;
DROP INDEX IF EXISTS hr_public.idx_reviews_period_start;
DROP INDEX IF EXISTS hr_public.idx_reviews_period_end;
DROP INDEX IF EXISTS hr_public.idx_review_templates_created_by;
DROP INDEX IF EXISTS hr_public.idx_review_templates_active;
DROP INDEX IF EXISTS hr_public.idx_review_goals_review;
DROP INDEX IF EXISTS hr_public.idx_review_goals_goal;
DROP INDEX IF EXISTS hr_public.idx_permissions_deleted_at;
DROP INDEX IF EXISTS hr_public.idx_performance_reviews_status;
DROP INDEX IF EXISTS hr_public.idx_performance_reviews_reviewer_id;
DROP INDEX IF EXISTS hr_public.idx_performance_reviews_period;
DROP INDEX IF EXISTS hr_public.idx_performance_reviews_employee_id;
DROP INDEX IF EXISTS hr_public.idx_payroll_records_processed_by;
DROP INDEX IF EXISTS hr_public.idx_payroll_records_pay_period;
DROP INDEX IF EXISTS hr_public.idx_payroll_records_employee_id;
DROP INDEX IF EXISTS hr_public.idx_payroll_records_created_by;
DROP INDEX IF EXISTS hr_public.idx_notifications_user;
DROP INDEX IF EXISTS hr_public.idx_notifications_unread;
DROP INDEX IF EXISTS hr_public.idx_notifications_type;
DROP INDEX IF EXISTS hr_public.idx_notifications_event;
DROP INDEX IF EXISTS hr_public.idx_linked_resources_type;
DROP INDEX IF EXISTS hr_public.idx_linked_resources_task;
DROP INDEX IF EXISTS hr_public.idx_leave_requests_status;
DROP INDEX IF EXISTS hr_public.idx_leave_requests_manager_id;
DROP INDEX IF EXISTS hr_public.idx_leave_requests_employee_id;
DROP INDEX IF EXISTS hr_public.idx_leave_requests_dates;
DROP INDEX IF EXISTS hr_public.idx_history_event;
DROP INDEX IF EXISTS hr_public.idx_history_changed_by;
DROP INDEX IF EXISTS hr_public.idx_history_change_type;
DROP INDEX IF EXISTS hr_public.idx_events_type;
DROP INDEX IF EXISTS hr_public.idx_events_title_fulltext;
DROP INDEX IF EXISTS hr_public.idx_events_time_range;
DROP INDEX IF EXISTS hr_public.idx_events_status;
DROP INDEX IF EXISTS hr_public.idx_events_start_time;
DROP INDEX IF EXISTS hr_public.idx_events_recurrence_end_date;
DROP INDEX IF EXISTS hr_public.idx_events_recurrence;
DROP INDEX IF EXISTS hr_public.idx_events_organizer_id;
DROP INDEX IF EXISTS hr_public.idx_events_organizer;
DROP INDEX IF EXISTS hr_public.idx_events_is_public_start;
DROP INDEX IF EXISTS hr_public.idx_events_is_public;
DROP INDEX IF EXISTS hr_public.idx_events_end_time;
DROP INDEX IF EXISTS hr_public.idx_events_description_fulltext;
DROP INDEX IF EXISTS hr_public.idx_events_deleted_at;
DROP INDEX IF EXISTS hr_public.idx_event_attendees_response_status;
DROP INDEX IF EXISTS hr_public.idx_event_attendees_reminder;
DROP INDEX IF EXISTS hr_public.idx_event_attendees_organizer;
DROP INDEX IF EXISTS hr_public.idx_event_attendees_event_id;
DROP INDEX IF EXISTS hr_public.idx_event_attendees_employee_id;
DROP INDEX IF EXISTS hr_public.idx_encryption_keys_active;
DROP INDEX IF EXISTS hr_public.idx_encrypted_storage_document;
DROP INDEX IF EXISTS hr_public.idx_employee_vehicles_employee_id;
DROP INDEX IF EXISTS hr_public.idx_employee_goals_employee_id;
DROP INDEX IF EXISTS hr_public.idx_employee_goals_created_by;
DROP INDEX IF EXISTS hr_public.idx_emergency_contacts_employee_id;
DROP INDEX IF EXISTS hr_public.idx_documents_uploaded_by;
DROP INDEX IF EXISTS hr_public.idx_documents_title_fulltext;
DROP INDEX IF EXISTS hr_public.idx_documents_tags;
DROP INDEX IF EXISTS hr_public.idx_documents_expiry;
DROP INDEX IF EXISTS hr_public.idx_documents_description_fulltext;
DROP INDEX IF EXISTS hr_public.idx_documents_created_at;
DROP INDEX IF EXISTS hr_public.idx_documents_category;
DROP INDEX IF EXISTS hr_public.idx_document_versions_uploaded_by;
DROP INDEX IF EXISTS hr_public.idx_document_versions_document;
DROP INDEX IF EXISTS hr_public.idx_document_assignments_status;
DROP INDEX IF EXISTS hr_public.idx_document_assignments_employee;
DROP INDEX IF EXISTS hr_public.idx_document_assignments_due_date;
DROP INDEX IF EXISTS hr_public.idx_document_assignments_document;
DROP INDEX IF EXISTS hr_public.idx_document_assignments_department;
DROP INDEX IF EXISTS hr_public.idx_document_access_user;
DROP INDEX IF EXISTS hr_public.idx_document_access_document;
DROP INDEX IF EXISTS hr_public.idx_document_access_action;
DROP INDEX IF EXISTS hr_public.idx_departments_parent_id;
DROP INDEX IF EXISTS hr_public.idx_departments_manager_id;
DROP INDEX IF EXISTS hr_public.idx_compensation_bands_created_by;
DROP INDEX IF EXISTS hr_public.idx_comments_user;
DROP INDEX IF EXISTS hr_public.idx_comments_fulltext;
DROP INDEX IF EXISTS hr_public.idx_comments_event;
DROP INDEX IF EXISTS hr_public.idx_comments_created_at;
DROP INDEX IF EXISTS hr_public.idx_bulk_rollback_status;
DROP INDEX IF EXISTS hr_public.idx_bulk_rollback_requested_by;
DROP INDEX IF EXISTS hr_public.idx_bulk_rollback_items_log;
DROP INDEX IF EXISTS hr_public.idx_bulk_rollback_items_batch;
DROP INDEX IF EXISTS hr_public.idx_bulk_rollback_created_at;
DROP INDEX IF EXISTS hr_public.idx_attendees_status;
DROP INDEX IF EXISTS hr_public.idx_attendees_composite;
DROP INDEX IF EXISTS hr_public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS hr_public.idx_activity_logs_resource_type;
DROP INDEX IF EXISTS hr_public.idx_activity_logs_employee_id;
DROP INDEX IF EXISTS hr_public.idx_activity_logs_created_at;
DROP INDEX IF EXISTS hr_public.idx_activity_logs_action;
DROP INDEX IF EXISTS hr_public.hr_reports_status_idx;
DROP INDEX IF EXISTS hr_public.hr_reports_scheduled_at_idx;
DROP INDEX IF EXISTS hr_public.hr_reports_report_type_idx;
DROP INDEX IF EXISTS hr_public.hr_reports_generated_at_idx;
DROP INDEX IF EXISTS hr_public.hr_reports_department_id_idx;
DROP INDEX IF EXISTS hr_public.hr_reports_creator_id_idx;
DROP INDEX IF EXISTS hr_public.hr_reports_category_idx;
DROP INDEX IF EXISTS hr_public.employee_goals_target_date_idx;
DROP INDEX IF EXISTS hr_public.employee_goals_department_idx;
DROP INDEX IF EXISTS hr_public.employee_goals_active_idx;
DROP INDEX IF EXISTS hr_public.departments_search_idx;
DROP INDEX IF EXISTS hr_public.departments_manager_id_idx;
DROP INDEX IF EXISTS hr_private.idx_compensation_records_employee_current;
ALTER TABLE IF EXISTS ONLY public.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_filename_key;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY hr_public.user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_user_role_unique;
ALTER TABLE IF EXISTS ONLY hr_public.user_role_assignments DROP CONSTRAINT IF EXISTS user_role_assignments_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.time_off_policies DROP CONSTRAINT IF EXISTS time_off_policies_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.time_off_policies DROP CONSTRAINT IF EXISTS time_off_policies_name_key;
ALTER TABLE IF EXISTS ONLY hr_public.time_off_balances DROP CONSTRAINT IF EXISTS time_off_balances_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.time_off_balances DROP CONSTRAINT IF EXISTS time_off_balances_employee_policy_year_unique;
ALTER TABLE IF EXISTS ONLY hr_public.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_types DROP CONSTRAINT IF EXISTS task_types_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_types DROP CONSTRAINT IF EXISTS task_types_name_key;
ALTER TABLE IF EXISTS ONLY hr_public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_depends_on_task_id_key;
ALTER TABLE IF EXISTS ONLY hr_public.task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_audit_entries DROP CONSTRAINT IF EXISTS task_audit_entries_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.rollback_requests DROP CONSTRAINT IF EXISTS rollback_requests_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE IF EXISTS ONLY hr_public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_permission_unique;
ALTER TABLE IF EXISTS ONLY hr_public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.review_templates DROP CONSTRAINT IF EXISTS review_templates_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.review_goals DROP CONSTRAINT IF EXISTS review_goals_review_id_goal_id_key;
ALTER TABLE IF EXISTS ONLY hr_public.review_goals DROP CONSTRAINT IF EXISTS review_goals_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.permissions DROP CONSTRAINT IF EXISTS permissions_resource_action_unique;
ALTER TABLE IF EXISTS ONLY hr_public.permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.payroll_records DROP CONSTRAINT IF EXISTS payroll_records_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.linked_resources DROP CONSTRAINT IF EXISTS linked_resources_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.hr_reports DROP CONSTRAINT IF EXISTS hr_reports_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_waitlist DROP CONSTRAINT IF EXISTS event_waitlist_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_waitlist DROP CONSTRAINT IF EXISTS event_waitlist_event_id_position_key;
ALTER TABLE IF EXISTS ONLY hr_public.event_waitlist DROP CONSTRAINT IF EXISTS event_waitlist_event_id_employee_id_key;
ALTER TABLE IF EXISTS ONLY hr_public.event_notifications DROP CONSTRAINT IF EXISTS event_notifications_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_history DROP CONSTRAINT IF EXISTS event_history_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_comments DROP CONSTRAINT IF EXISTS event_comments_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.event_attendees DROP CONSTRAINT IF EXISTS event_attendees_unique;
ALTER TABLE IF EXISTS ONLY hr_public.event_attendees DROP CONSTRAINT IF EXISTS event_attendees_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.encryption_keys DROP CONSTRAINT IF EXISTS encryption_keys_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.encryption_keys DROP CONSTRAINT IF EXISTS encryption_keys_key_name_key;
ALTER TABLE IF EXISTS ONLY hr_public.encrypted_file_storage DROP CONSTRAINT IF EXISTS encrypted_file_storage_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.employee_vehicles DROP CONSTRAINT IF EXISTS employee_vehicles_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.employee_vehicles DROP CONSTRAINT IF EXISTS employee_vehicles_license_plate_unique;
ALTER TABLE IF EXISTS ONLY hr_public.employee_goals DROP CONSTRAINT IF EXISTS employee_goals_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.emergency_contacts DROP CONSTRAINT IF EXISTS emergency_contacts_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_versions DROP CONSTRAINT IF EXISTS document_versions_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_versions DROP CONSTRAINT IF EXISTS document_versions_document_id_version_number_key;
ALTER TABLE IF EXISTS ONLY hr_public.document_categories DROP CONSTRAINT IF EXISTS document_categories_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_categories DROP CONSTRAINT IF EXISTS document_categories_name_key;
ALTER TABLE IF EXISTS ONLY hr_public.document_assignments DROP CONSTRAINT IF EXISTS document_assignments_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.document_access_logs DROP CONSTRAINT IF EXISTS document_access_logs_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE IF EXISTS ONLY hr_public.compensation_bands DROP CONSTRAINT IF EXISTS compensation_bands_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.bulk_rollback_items DROP CONSTRAINT IF EXISTS bulk_rollback_items_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.bulk_rollback_batches DROP CONSTRAINT IF EXISTS bulk_rollback_batches_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_unique_user_date;
ALTER TABLE IF EXISTS ONLY hr_public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_pkey;
ALTER TABLE IF EXISTS ONLY hr_public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_pkey;
ALTER TABLE IF EXISTS ONLY hr_private.compensation_records DROP CONSTRAINT IF EXISTS compensation_records_pkey;
ALTER TABLE IF EXISTS public.schema_migrations ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.schema_migrations_id_seq;
DROP TABLE IF EXISTS public.schema_migrations;
DROP TABLE IF EXISTS public.activity_logs;
DROP TABLE IF EXISTS hr_public.user_role_assignments;
DROP TABLE IF EXISTS hr_public.time_off_policies;
DROP TABLE IF EXISTS hr_public.time_off_balances;
DROP TABLE IF EXISTS hr_public.tasks;
DROP TABLE IF EXISTS hr_public.task_types;
DROP TABLE IF EXISTS hr_public.task_dependencies;
DROP TABLE IF EXISTS hr_public.task_audit_entries;
DROP TABLE IF EXISTS hr_public.task_assignees;
DROP TABLE IF EXISTS hr_public.rollback_requests;
DROP TABLE IF EXISTS hr_public.roles;
DROP TABLE IF EXISTS hr_public.role_permissions;
DROP TABLE IF EXISTS hr_public.review_templates;
DROP TABLE IF EXISTS hr_public.review_goals;
DROP TABLE IF EXISTS hr_public.permissions;
DROP TABLE IF EXISTS hr_public.performance_reviews;
DROP TABLE IF EXISTS hr_public.payroll_records;
DROP TABLE IF EXISTS hr_public.notifications;
DROP TABLE IF EXISTS hr_public.notification_preferences;
DROP TABLE IF EXISTS hr_public.linked_resources;
DROP TABLE IF EXISTS hr_public.leave_requests;
DROP TABLE IF EXISTS hr_public.hr_reports;
DROP TABLE IF EXISTS hr_public.events;
DROP TABLE IF EXISTS hr_public.event_waitlist;
DROP TABLE IF EXISTS hr_public.event_notifications;
DROP TABLE IF EXISTS hr_public.event_history;
DROP TABLE IF EXISTS hr_public.event_comments;
DROP TABLE IF EXISTS hr_public.event_attendees;
DROP TABLE IF EXISTS hr_public.encryption_keys;
DROP TABLE IF EXISTS hr_public.encrypted_file_storage;
DROP VIEW IF EXISTS hr_public.employees_with_contacts;
DROP TABLE IF EXISTS hr_public.employee_vehicles;
DROP TABLE IF EXISTS hr_public.employee_goals;
DROP TABLE IF EXISTS hr_public.emergency_contacts;
DROP TABLE IF EXISTS hr_public.documents;
DROP TABLE IF EXISTS hr_public.document_versions;
DROP TABLE IF EXISTS hr_public.document_categories;
DROP TABLE IF EXISTS hr_public.document_assignments;
DROP TABLE IF EXISTS hr_public.document_access_logs;
DROP TABLE IF EXISTS hr_public.departments;
DROP TABLE IF EXISTS hr_public.compensation_bands;
DROP TABLE IF EXISTS hr_public.bulk_rollback_items;
DROP TABLE IF EXISTS hr_public.bulk_rollback_batches;
DROP TABLE IF EXISTS hr_public.attendance_records;
DROP TABLE IF EXISTS hr_public.activity_logs;
DROP TABLE IF EXISTS hr_private.compensation_records;
DROP FUNCTION IF EXISTS public.update_task_timestamp();
DROP FUNCTION IF EXISTS public.update_document_timestamp();
DROP FUNCTION IF EXISTS public.sync_task_assignee();
DROP FUNCTION IF EXISTS public.promote_from_waitlist();
DROP FUNCTION IF EXISTS public.execute_rollback(log_id uuid, executor_id uuid);
DROP FUNCTION IF EXISTS public.check_assignment_expiry();
DROP FUNCTION IF EXISTS public.audit_task_changes();
DROP FUNCTION IF EXISTS postgraphile_watch.notify_watchers_drop();
DROP FUNCTION IF EXISTS postgraphile_watch.notify_watchers_ddl();
DROP FUNCTION IF EXISTS hr_public.get_current_compensation(emp_id uuid);
DROP FUNCTION IF EXISTS hr_public."current_user"();
DROP TABLE IF EXISTS hr_public.users;
DROP FUNCTION IF EXISTS hr_hidden.update_updated_at_column();
DROP FUNCTION IF EXISTS hr_hidden.is_user_manager();
DROP FUNCTION IF EXISTS hr_hidden.is_user_admin();
DROP FUNCTION IF EXISTS hr_hidden.current_user_department_id();
DROP FUNCTION IF EXISTS hr_hidden.calculate_business_days(start_date date, end_date date);
DROP TYPE IF EXISTS hr_public.rsvp_status;
DROP TYPE IF EXISTS hr_public.review_status;
DROP TYPE IF EXISTS hr_public.resource_type;
DROP TYPE IF EXISTS hr_public.report_status;
DROP TYPE IF EXISTS hr_public.notification_type;
DROP TYPE IF EXISTS hr_public.notification_category;
DROP TYPE IF EXISTS hr_public.leave_type;
DROP TYPE IF EXISTS hr_public.leave_status;
DROP TYPE IF EXISTS hr_public.event_visibility;
DROP TYPE IF EXISTS hr_public.event_type;
DROP TYPE IF EXISTS hr_public.event_status;
DROP TYPE IF EXISTS hr_public.employee_status;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
DROP SCHEMA IF EXISTS postgraphile_watch;
DROP SCHEMA IF EXISTS hr_public;
DROP SCHEMA IF EXISTS hr_private;
DROP SCHEMA IF EXISTS hr_hidden;
--
-- Name: hr_hidden; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr_hidden;


--
-- Name: SCHEMA hr_hidden; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hr_hidden IS 'Hidden HR schema for internal functions and utilities';


--
-- Name: hr_private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr_private;


--
-- Name: SCHEMA hr_private; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hr_private IS 'Private HR schema for sensitive data (compensation, authentication)';


--
-- Name: hr_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr_public;


--
-- Name: SCHEMA hr_public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hr_public IS 'Public HR schema exposed through PostGraphile GraphQL API';


--
-- Name: postgraphile_watch; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA postgraphile_watch;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: employee_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.employee_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'TERMINATED',
    'ON_LEAVE'
);


--
-- Name: event_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.event_status AS ENUM (
    'draft',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: event_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.event_type AS ENUM (
    'meeting',
    'training',
    'social',
    'company_event',
    'holiday',
    'interview',
    'review',
    'team_building',
    'other'
);


--
-- Name: event_visibility; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.event_visibility AS ENUM (
    'public',
    'private',
    'department',
    'team'
);


--
-- Name: leave_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.leave_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);


--
-- Name: leave_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.leave_type AS ENUM (
    'annual',
    'sick',
    'personal',
    'maternity',
    'paternity'
);


--
-- Name: notification_category; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.notification_category AS ENUM (
    'system',
    'task',
    'leave',
    'performance',
    'event',
    'hr',
    'department'
);


--
-- Name: notification_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.notification_type AS ENUM (
    'info',
    'warning',
    'success',
    'error',
    'task_assigned',
    'task_completed',
    'leave_request',
    'performance_review',
    'event_reminder',
    'system_announcement'
);


--
-- Name: report_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.report_status AS ENUM (
    'draft',
    'active',
    'scheduled',
    'completed',
    'failed'
);


--
-- Name: resource_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.resource_type AS ENUM (
    'task',
    'leave_request',
    'performance_review',
    'event',
    'user',
    'department',
    'goal',
    'report'
);


--
-- Name: review_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.review_status AS ENUM (
    'not_started',
    'in_progress',
    'completed'
);


--
-- Name: rsvp_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.rsvp_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'tentative'
);


--
-- Name: calculate_business_days(date, date); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.calculate_business_days(start_date date, end_date date) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM generate_series(start_date, end_date, '1 day'::interval) AS day
        WHERE EXTRACT(DOW FROM day) NOT IN (0, 6) -- Exclude weekends
    );
END;
$$;


--
-- Name: current_user_department_id(); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.current_user_department_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT department_id
        FROM hr_public.users
        WHERE id = current_setting('jwt.claims.user_id', true)::uuid
    );
END;
$$;


--
-- Name: FUNCTION current_user_department_id(); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.current_user_department_id() IS 'Returns the department_id of the current authenticated user from JWT claims';


--
-- Name: is_user_admin(); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.is_user_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN current_setting('jwt.claims.role', true)::text = 'admin'
        OR current_setting('jwt.claims.role', true)::text = 'super_admin';
END;
$$;


--
-- Name: FUNCTION is_user_admin(); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.is_user_admin() IS 'Returns true if the current user has admin or super_admin role';


--
-- Name: is_user_manager(); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.is_user_manager() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM hr_public.departments
        WHERE manager_id = current_setting('jwt.claims.user_id', true)::uuid
    );
END;
$$;


--
-- Name: FUNCTION is_user_manager(); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.is_user_manager() IS 'Returns true if the current user is a manager of any department';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    display_name character varying(255) GENERATED ALWAYS AS ((((first_name)::text || ' '::text) || (last_name)::text)) STORED,
    role character varying(50) DEFAULT 'hr_employee'::character varying NOT NULL,
    department_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login timestamp with time zone,
    hire_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    phone_number character varying(20),
    mobile_number character varying(20),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state_province character varying(100),
    postal_code character varying(20),
    country character varying(100) DEFAULT 'United States'::character varying,
    manager_id uuid,
    alternate_phone character varying(20),
    job_title character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    full_name character varying(255) GENERATED ALWAYS AS ((((first_name)::text || ' '::text) || (last_name)::text)) STORED,
    CONSTRAINT check_valid_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT users_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT users_names_not_empty CHECK (((length(TRIM(BOTH FROM first_name)) > 0) AND (length(TRIM(BOTH FROM last_name)) > 0)))
);


--
-- Name: COLUMN users.phone_number; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.phone_number IS 'Primary phone number';


--
-- Name: COLUMN users.mobile_number; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.mobile_number IS 'Mobile/cell phone number';


--
-- Name: COLUMN users.address_line1; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.address_line1 IS 'Street address line 1';


--
-- Name: COLUMN users.address_line2; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.address_line2 IS 'Street address line 2 (apartment, suite, etc.)';


--
-- Name: COLUMN users.city; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.city IS 'City';


--
-- Name: COLUMN users.state_province; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.state_province IS 'State or province';


--
-- Name: COLUMN users.postal_code; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.postal_code IS 'Postal or ZIP code';


--
-- Name: COLUMN users.country; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.users.country IS 'Country';


--
-- Name: current_user(); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public."current_user"() RETURNS hr_public.users
    LANGUAGE sql STABLE
    AS $$
  SELECT *
  FROM hr_public.users
  WHERE id = current_setting('jwt.claims.user_id', true)::uuid;
$$;


--
-- Name: FUNCTION "current_user"(); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public."current_user"() IS 'Returns the currently authenticated user from JWT claims';


--
-- Name: get_current_compensation(uuid); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.get_current_compensation(emp_id uuid) RETURNS TABLE(salary_amount numeric, salary_currency character varying, pay_frequency character varying, pay_type character varying, effective_date date)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Only HR managers and admins can access compensation data
    IF NOT (
        current_setting('jwt.claims.role', true) IN ('super_admin', 'admin', 'hr_manager')
        OR current_setting('jwt.claims.user_id', true)::uuid = emp_id
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to view compensation data';
    END IF;

    RETURN QUERY
    SELECT
        cr.salary_amount,
        cr.salary_currency,
        cr.pay_frequency,
        cr.pay_type,
        cr.effective_date
    FROM hr_private.compensation_records cr
    WHERE cr.employee_id = emp_id
        AND (cr.end_date IS NULL OR cr.end_date >= CURRENT_DATE)
    ORDER BY cr.effective_date DESC
    LIMIT 1;
END;
$$;


--
-- Name: FUNCTION get_current_compensation(emp_id uuid); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.get_current_compensation(emp_id uuid) IS 'Get current compensation for an employee (restricted by RBAC)';


--
-- Name: notify_watchers_ddl(); Type: FUNCTION; Schema: postgraphile_watch; Owner: -
--

CREATE FUNCTION postgraphile_watch.notify_watchers_ddl() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform pg_notify(
    'postgraphile_watch',
    json_build_object(
      'type',
      'ddl',
      'payload',
      (select json_agg(json_build_object('schema', schema_name, 'command', command_tag)) from pg_event_trigger_ddl_commands() as x)
    )::text
  );
end;
$$;


--
-- Name: notify_watchers_drop(); Type: FUNCTION; Schema: postgraphile_watch; Owner: -
--

CREATE FUNCTION postgraphile_watch.notify_watchers_drop() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform pg_notify(
    'postgraphile_watch',
    json_build_object(
      'type',
      'drop',
      'payload',
      (select json_agg(distinct x.schema_name) from pg_event_trigger_dropped_objects() as x)
    )::text
  );
end;
$$;


--
-- Name: audit_task_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_task_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO hr_public.task_audit_entries (task_id, changed_by, change_type, new_value)
    VALUES (NEW.id, NEW.created_by, 'created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      INSERT INTO hr_public.task_audit_entries (task_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'updated', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO hr_public.task_audit_entries (task_id, changed_by, change_type, old_value)
    VALUES (OLD.id, OLD.created_by, 'deleted', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: check_assignment_expiry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_assignment_expiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.due_date < NOW() AND NEW.assignment_status = 'active' THEN
    NEW.assignment_status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: execute_rollback(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_rollback(log_id uuid, executor_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  log_record RECORD;
  rollback_log_id UUID;
  result JSONB;
BEGIN
  -- Get the activity log to rollback
  SELECT * INTO log_record
  FROM public.activity_logs
  WHERE id = log_id AND rolled_back_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Activity log not found or already rolled back'
    );
  END IF;

  -- Create a rollback log entry
  INSERT INTO public.activity_logs (
    employee_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    is_rollback,
    rolled_back_log_id
  ) VALUES (
    executor_id,
    'rollback_' || log_record.action,
    log_record.entity_type,
    log_record.entity_id,
    log_record.new_data,
    log_record.old_data,
    true,
    log_id
  ) RETURNING id INTO rollback_log_id;

  -- Mark original log as rolled back
  UPDATE public.activity_logs
  SET rolled_back_at = NOW(),
      rolled_back_by = executor_id,
      rolled_back_log_id = rollback_log_id
  WHERE id = log_id;

  RETURN jsonb_build_object(
    'success', true,
    'rollback_log_id', rollback_log_id,
    'original_log_id', log_id
  );
END;
$$;


--
-- Name: FUNCTION execute_rollback(log_id uuid, executor_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.execute_rollback(log_id uuid, executor_id uuid) IS 'Execute a rollback of a specific activity log entry';


--
-- Name: promote_from_waitlist(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.promote_from_waitlist() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_waitlist RECORD;
  event_waitlist_enabled BOOLEAN;
BEGIN
  IF OLD.response_status = 'accepted' AND NEW.response_status = 'declined' THEN
    SELECT waitlist_enabled INTO event_waitlist_enabled
    FROM hr_public.events
    WHERE id = NEW.event_id;

    IF event_waitlist_enabled THEN
      SELECT id, employee_id, event_id, position
      INTO next_waitlist
      FROM hr_public.event_waitlist
      WHERE event_id = NEW.event_id
      ORDER BY position
      LIMIT 1;

      IF FOUND THEN
        INSERT INTO hr_public.event_attendees (event_id, employee_id, response_status)
        VALUES (next_waitlist.event_id, next_waitlist.employee_id, 'pending')
        ON CONFLICT (event_id, employee_id) DO UPDATE SET response_status = 'pending';

        DELETE FROM hr_public.event_waitlist WHERE id = next_waitlist.id;

        INSERT INTO hr_public.event_notifications (user_id, event_id, type, message)
        VALUES (
          next_waitlist.employee_id,
          next_waitlist.event_id,
          'waitlist',
          'A spot opened up for this event! You have been moved from the waitlist.'
        );

        UPDATE hr_public.event_waitlist
        SET position = position - 1
        WHERE event_id = NEW.event_id AND position > next_waitlist.position;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_task_assignee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_task_assignee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If assignee_id is set and not null
  IF NEW.assignee_id IS NOT NULL THEN
    -- Ensure this user is in task_assignees (upsert)
    INSERT INTO hr_public.task_assignees (task_id, user_id, assigned_at, assigned_by)
    VALUES (NEW.id, NEW.assignee_id, NOW(), NEW.created_by)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_document_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_document_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_task_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: compensation_records; Type: TABLE; Schema: hr_private; Owner: -
--

CREATE TABLE hr_private.compensation_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    salary_amount numeric(12,2) NOT NULL,
    salary_currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    pay_frequency character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    pay_type character varying(20) DEFAULT 'salary'::character varying NOT NULL,
    hourly_rate numeric(8,2),
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    bank_name character varying(255),
    bank_account_type character varying(20),
    bank_account_number_last4 character varying(4),
    bank_routing_number character varying(20),
    payment_method character varying(20) DEFAULT 'direct_deposit'::character varying NOT NULL,
    tax_id_last4 character varying(4),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT compensation_records_dates_valid CHECK (((end_date IS NULL) OR (end_date >= effective_date))),
    CONSTRAINT compensation_records_pay_frequency_valid CHECK (((pay_frequency)::text = ANY ((ARRAY['weekly'::character varying, 'bi-weekly'::character varying, 'semi-monthly'::character varying, 'monthly'::character varying, 'annually'::character varying])::text[]))),
    CONSTRAINT compensation_records_pay_type_valid CHECK (((pay_type)::text = ANY ((ARRAY['salary'::character varying, 'hourly'::character varying, 'contract'::character varying])::text[]))),
    CONSTRAINT compensation_records_payment_method_valid CHECK (((payment_method)::text = ANY ((ARRAY['direct_deposit'::character varying, 'check'::character varying, 'wire'::character varying])::text[]))),
    CONSTRAINT compensation_records_salary_positive CHECK ((salary_amount > (0)::numeric))
);


--
-- Name: TABLE compensation_records; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON TABLE hr_private.compensation_records IS 'Sensitive compensation and payment information (private schema)';


--
-- Name: COLUMN compensation_records.bank_account_number_last4; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.compensation_records.bank_account_number_last4 IS 'Last 4 digits of bank account for verification';


--
-- Name: COLUMN compensation_records.tax_id_last4; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.compensation_records.tax_id_last4 IS 'Last 4 digits of SSN/tax ID for verification';


--
-- Name: activity_logs; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.activity_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    employee_id uuid,
    action character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE activity_logs; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.activity_logs IS 'Audit log for user and employee activities';


--
-- Name: attendance_records; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.attendance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    hours_worked numeric(5,2),
    status character varying(50) DEFAULT 'present'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT attendance_records_hours_valid CHECK (((hours_worked >= (0)::numeric) AND (hours_worked <= (24)::numeric)))
);


--
-- Name: bulk_rollback_batches; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.bulk_rollback_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    executed_at timestamp with time zone,
    total_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    error_log jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bulk_rollback_batches_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE bulk_rollback_batches; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.bulk_rollback_batches IS 'Bulk rollback operations for multiple activity logs';


--
-- Name: COLUMN bulk_rollback_batches.status; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.bulk_rollback_batches.status IS 'Batch status: pending, approved, rejected, processing, completed, failed';


--
-- Name: bulk_rollback_items; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.bulk_rollback_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    activity_log_id uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bulk_rollback_items_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE bulk_rollback_items; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.bulk_rollback_items IS 'Individual activity logs in a bulk rollback batch';


--
-- Name: compensation_bands; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.compensation_bands (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    min_salary numeric(12,2) NOT NULL,
    max_salary numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT compensation_bands_salary_range CHECK ((max_salary > min_salary))
);


--
-- Name: departments; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    parent_department_id uuid
);


--
-- Name: document_access_logs; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.document_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    ip_address inet,
    user_agent text,
    accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT document_access_logs_action_check CHECK (((action)::text = ANY ((ARRAY['view'::character varying, 'download'::character varying, 'print'::character varying, 'share'::character varying])::text[])))
);


--
-- Name: TABLE document_access_logs; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.document_access_logs IS '@omit create,update,delete
Immutable access audit trail for documents';


--
-- Name: document_assignments; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.document_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    employee_id uuid,
    department_id uuid,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    due_date timestamp with time zone,
    viewed_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    signed_at timestamp with time zone,
    signature_data text,
    assignment_status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    CONSTRAINT document_assignments_assignment_status_check CHECK (((assignment_status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'expired'::character varying, 'revoked'::character varying])::text[]))),
    CONSTRAINT document_assignments_check CHECK (((employee_id IS NOT NULL) OR (department_id IS NOT NULL)))
);


--
-- Name: TABLE document_assignments; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.document_assignments IS 'Document assignments to employees or departments';


--
-- Name: COLUMN document_assignments.assignment_status; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.document_assignments.assignment_status IS 'active, completed, expired, revoked';


--
-- Name: document_categories; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.document_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_category_id uuid,
    icon character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE document_categories; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.document_categories IS 'Hierarchical categorization of documents';


--
-- Name: document_versions; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint,
    uploaded_by uuid NOT NULL,
    change_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE document_versions; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.document_versions IS 'Version history of documents';


--
-- Name: documents; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id uuid,
    file_path character varying(500) NOT NULL,
    file_size bigint,
    mime_type character varying(100),
    version_number integer DEFAULT 1,
    is_encrypted boolean DEFAULT false,
    encryption_key_id uuid,
    uploaded_by uuid NOT NULL,
    requires_signature boolean DEFAULT false,
    requires_acknowledgment boolean DEFAULT false,
    expiry_date timestamp with time zone,
    tags text[],
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE documents; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.documents IS 'Central document repository with versioning and encryption';


--
-- Name: COLUMN documents.is_encrypted; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.documents.is_encrypted IS 'Whether document content is encrypted at rest';


--
-- Name: COLUMN documents.requires_signature; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.documents.requires_signature IS 'Requires digital signature from assignees';


--
-- Name: COLUMN documents.requires_acknowledgment; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.documents.requires_acknowledgment IS 'Requires acknowledgment of receipt';


--
-- Name: emergency_contacts; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.emergency_contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    relationship character varying(100) NOT NULL,
    phone_number character varying(20) NOT NULL,
    alternate_phone character varying(20),
    email character varying(255),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state_province character varying(100),
    postal_code character varying(20),
    country character varying(100),
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT emergency_contacts_name_not_empty CHECK ((length(TRIM(BOTH FROM full_name)) > 0)),
    CONSTRAINT emergency_contacts_phone_not_empty CHECK ((length(TRIM(BOTH FROM phone_number)) > 0))
);


--
-- Name: TABLE emergency_contacts; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.emergency_contacts IS 'Emergency contact information for employees - updated 2025-10-02';


--
-- Name: COLUMN emergency_contacts.is_primary; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.emergency_contacts.is_primary IS 'Indicates primary emergency contact';


--
-- Name: employee_goals; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.employee_goals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    goal_title character varying(255) NOT NULL,
    goal_description text,
    target_date date,
    status character varying(50) DEFAULT 'in_progress'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_goals_progress_range CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);


--
-- Name: employee_vehicles; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.employee_vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    year integer,
    color character varying(50),
    license_plate character varying(20) NOT NULL,
    state_province character varying(100),
    parking_spot character varying(20),
    insurance_company character varying(255),
    insurance_policy_number character varying(100),
    insurance_expiry date,
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_vehicles_year_valid CHECK (((year >= 1900) AND ((year)::numeric <= (EXTRACT(year FROM CURRENT_DATE) + (2)::numeric))))
);


--
-- Name: TABLE employee_vehicles; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.employee_vehicles IS 'Vehicle information for employee parking - updated 2025-10-02';


--
-- Name: COLUMN employee_vehicles.parking_spot; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.employee_vehicles.parking_spot IS 'Assigned parking spot number/identifier';


--
-- Name: employees_with_contacts; Type: VIEW; Schema: hr_public; Owner: -
--

CREATE VIEW hr_public.employees_with_contacts AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(255) AS email,
    NULL::character varying(255) AS first_name,
    NULL::character varying(255) AS last_name,
    NULL::character varying(255) AS display_name,
    NULL::character varying(50) AS role,
    NULL::uuid AS department_id,
    NULL::character varying(20) AS phone_number,
    NULL::character varying(20) AS mobile_number,
    NULL::character varying(255) AS address_line1,
    NULL::character varying(255) AS address_line2,
    NULL::character varying(100) AS city,
    NULL::character varying(100) AS state_province,
    NULL::character varying(20) AS postal_code,
    NULL::character varying(100) AS country,
    NULL::date AS hire_date,
    NULL::boolean AS is_active,
    NULL::bigint AS emergency_contact_count,
    NULL::bigint AS vehicle_count;


--
-- Name: VIEW employees_with_contacts; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON VIEW hr_public.employees_with_contacts IS 'Employee information with contact counts';


--
-- Name: encrypted_file_storage; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.encrypted_file_storage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    encryption_key_id uuid NOT NULL,
    encrypted_data bytea NOT NULL,
    iv bytea NOT NULL,
    auth_tag bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE encrypted_file_storage; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.encrypted_file_storage IS 'Encrypted document storage with key references';


--
-- Name: COLUMN encrypted_file_storage.iv; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.encrypted_file_storage.iv IS 'Initialization vector for encryption';


--
-- Name: COLUMN encrypted_file_storage.auth_tag; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.encrypted_file_storage.auth_tag IS 'Authentication tag for AEAD ciphers';


--
-- Name: encryption_keys; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.encryption_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_name character varying(100) NOT NULL,
    algorithm character varying(50) NOT NULL,
    key_version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    rotated_at timestamp with time zone,
    expires_at timestamp with time zone
);


--
-- Name: TABLE encryption_keys; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.encryption_keys IS 'Encryption key metadata (actual keys stored in vault)';


--
-- Name: COLUMN encryption_keys.algorithm; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.encryption_keys.algorithm IS 'Encryption algorithm (e.g., AES-256-GCM)';


--
-- Name: event_attendees; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.event_attendees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    response_status hr_public.rsvp_status DEFAULT 'pending'::hr_public.rsvp_status NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reminder_time integer,
    scope character varying(20) DEFAULT 'this_event'::character varying,
    is_organizer boolean DEFAULT false
);


--
-- Name: TABLE event_attendees; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.event_attendees IS 'Event RSVP and attendance tracking';


--
-- Name: event_comments; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.event_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    mentions uuid[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT event_comments_content_check CHECK (((length(TRIM(BOTH FROM content)) > 0) AND (length(content) <= 5000)))
);


--
-- Name: TABLE event_comments; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.event_comments IS 'User comments and discussions on events';


--
-- Name: COLUMN event_comments.content; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.event_comments.content IS 'Comment text (1-5000 characters after trimming)';


--
-- Name: COLUMN event_comments.mentions; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.event_comments.mentions IS 'Array of employee IDs mentioned in comment with @ syntax';


--
-- Name: event_history; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.event_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    change_type text NOT NULL,
    field_name character varying(100),
    old_value jsonb,
    new_value jsonb,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_history_change_type_check CHECK ((change_type = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text, 'ownership_transfer'::text, 'attendee_added'::text, 'attendee_removed'::text])))
);


--
-- Name: TABLE event_history; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.event_history IS '@omit create,update,delete
Immutable audit trail of event changes';


--
-- Name: COLUMN event_history.change_type; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.event_history.change_type IS 'Type of change: created, updated, deleted, ownership_transfer, attendee_added, attendee_removed';


--
-- Name: event_notifications; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.event_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_id uuid NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_notifications_message_check CHECK (((length(message) >= 1) AND (length(message) <= 500))),
    CONSTRAINT event_notifications_type_check CHECK ((type = ANY (ARRAY['invite'::text, 'change'::text, 'cancel'::text, 'remove'::text, 'comment'::text, 'mention'::text, 'waitlist'::text, 'reminder'::text])))
);


--
-- Name: TABLE event_notifications; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.event_notifications IS 'Notifications for event-related activities';


--
-- Name: COLUMN event_notifications.type; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.event_notifications.type IS 'Notification type: invite, change, cancel, remove, comment, mention, waitlist, reminder';


--
-- Name: event_waitlist; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.event_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_waitlist_position_check CHECK (("position" > 0))
);


--
-- Name: TABLE event_waitlist; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.event_waitlist IS 'Waitlist entries for events at capacity';


--
-- Name: COLUMN event_waitlist."position"; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.event_waitlist."position" IS 'Position in waitlist queue (FIFO ordering)';


--
-- Name: events; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type hr_public.event_type DEFAULT 'other'::hr_public.event_type NOT NULL,
    status hr_public.event_status DEFAULT 'draft'::hr_public.event_status NOT NULL,
    visibility_type hr_public.event_visibility DEFAULT 'public'::hr_public.event_visibility NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    all_day boolean DEFAULT false NOT NULL,
    location character varying(255),
    is_public boolean DEFAULT true NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    organizer_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rrule text,
    recurrence_id uuid,
    max_capacity integer,
    waitlist_enabled boolean DEFAULT false,
    image_url character varying(500),
    deleted_at timestamp with time zone,
    recurrence_end_date timestamp with time zone,
    image_aspect_ratio character varying(10),
    CONSTRAINT events_image_aspect_ratio_check CHECK (((image_aspect_ratio)::text = ANY ((ARRAY['16:9'::character varying, '9:16'::character varying])::text[]))),
    CONSTRAINT events_image_aspect_ratio_required CHECK (((image_url IS NULL) OR ((image_url IS NOT NULL) AND (image_aspect_ratio IS NOT NULL)))),
    CONSTRAINT events_max_capacity_check CHECK ((max_capacity > 0)),
    CONSTRAINT events_recurrence_end_date_check CHECK (((recurrence_end_date IS NULL) OR (recurrence_end_date <= (start_time + '5 years'::interval)))),
    CONSTRAINT events_time_logic CHECK ((end_time > start_time)),
    CONSTRAINT events_title_not_empty CHECK ((length(TRIM(BOTH FROM title)) > 0))
);


--
-- Name: TABLE events; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.events IS 'Company and department events with RSVP tracking';


--
-- Name: COLUMN events.rrule; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.rrule IS 'RFC 5545 RRULE string for recurring events';


--
-- Name: COLUMN events.recurrence_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.recurrence_id IS 'Parent event ID if this is a recurring event exception';


--
-- Name: COLUMN events.max_capacity; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.max_capacity IS 'Maximum number of attendees (null = unlimited)';


--
-- Name: COLUMN events.waitlist_enabled; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.waitlist_enabled IS 'Whether waitlist is enabled when capacity is reached';


--
-- Name: COLUMN events.image_url; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.image_url IS 'URL path to event image (max 10 MB, optimized by Sharp)';


--
-- Name: COLUMN events.deleted_at; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.deleted_at IS 'Soft delete timestamp. NULL means the event is active, non-NULL means it has been deleted.';


--
-- Name: COLUMN events.recurrence_end_date; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.recurrence_end_date IS 'End date for recurring events. Maximum 5 years from start date (enforced in application layer).';


--
-- Name: COLUMN events.image_aspect_ratio; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.events.image_aspect_ratio IS 'Event image aspect ratio constraint: 16:9 (landscape) or 9:16 (portrait). Required when image_url is set.';


--
-- Name: CONSTRAINT events_image_aspect_ratio_required ON events; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON CONSTRAINT events_image_aspect_ratio_required ON hr_public.events IS 'Ensures aspect ratio is specified when event image is uploaded';


--
-- Name: hr_reports; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.hr_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    creator_id uuid NOT NULL,
    department_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    report_type character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    data jsonb DEFAULT '{}'::jsonb,
    status hr_public.report_status DEFAULT 'draft'::hr_public.report_status NOT NULL,
    scheduled_at timestamp with time zone,
    generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT hr_reports_category_not_empty CHECK ((length(TRIM(BOTH FROM category)) > 0)),
    CONSTRAINT hr_reports_generated_at_logic CHECK ((((status = 'completed'::hr_public.report_status) AND (generated_at IS NOT NULL)) OR ((status <> 'completed'::hr_public.report_status) AND ((generated_at IS NULL) OR (generated_at IS NOT NULL))))),
    CONSTRAINT hr_reports_report_type_not_empty CHECK ((length(TRIM(BOTH FROM report_type)) > 0)),
    CONSTRAINT hr_reports_title_not_empty CHECK ((length(TRIM(BOTH FROM title)) > 0))
);


--
-- Name: TABLE hr_reports; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.hr_reports IS 'HR reports created and managed by managers for their departments';


--
-- Name: COLUMN hr_reports.creator_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.hr_reports.creator_id IS 'User who created the report';


--
-- Name: COLUMN hr_reports.department_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.hr_reports.department_id IS 'Department context for RBAC filtering';


--
-- Name: COLUMN hr_reports.filters; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.hr_reports.filters IS 'JSON object containing report filter criteria';


--
-- Name: COLUMN hr_reports.data; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.hr_reports.data IS 'JSON object containing report data and results';


--
-- Name: COLUMN hr_reports.generated_at; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.hr_reports.generated_at IS 'Timestamp when report was last generated';


--
-- Name: leave_requests; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.leave_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    manager_id uuid,
    leave_type hr_public.leave_type NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_requested integer NOT NULL,
    status hr_public.leave_status DEFAULT 'pending'::hr_public.leave_status NOT NULL,
    reason text,
    manager_comments text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT leave_requests_dates_valid CHECK ((end_date >= start_date)),
    CONSTRAINT leave_requests_days_positive CHECK ((days_requested > 0)),
    CONSTRAINT leave_requests_no_self_approval CHECK ((employee_id <> manager_id))
);


--
-- Name: linked_resources; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.linked_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id character varying(500) NOT NULL,
    title character varying(255),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT linked_resources_resource_type_check CHECK (((resource_type)::text = ANY ((ARRAY['document'::character varying, 'url'::character varying, 'file'::character varying, 'pr'::character varying, 'issue'::character varying])::text[])))
);


--
-- Name: TABLE linked_resources; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.linked_resources IS 'External resources linked to tasks (docs, files, URLs, PRs, etc.)';


--
-- Name: COLUMN linked_resources.resource_type; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.linked_resources.resource_type IS 'Type of resource: document, url, file, pr, issue';


--
-- Name: notification_preferences; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.notification_preferences (
    user_id uuid NOT NULL,
    event_invites boolean DEFAULT true NOT NULL,
    event_changes boolean DEFAULT true NOT NULL,
    event_reminders boolean DEFAULT true NOT NULL,
    comment_mentions boolean DEFAULT true NOT NULL,
    waitlist_updates boolean DEFAULT true NOT NULL,
    reminder_times integer[] DEFAULT ARRAY[60, 1440] NOT NULL
);


--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.notification_preferences IS 'User-configurable notification settings';


--
-- Name: COLUMN notification_preferences.reminder_times; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notification_preferences.reminder_times IS 'Array of minutes before event to send reminders (e.g., [60, 1440] = 1 hour and 1 day)';


--
-- Name: notifications; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    recipient_id uuid NOT NULL,
    type hr_public.notification_type NOT NULL,
    category hr_public.notification_category NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    related_resource_type hr_public.resource_type,
    related_resource_id uuid,
    read_status boolean DEFAULT false NOT NULL,
    delivered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notifications_message_not_empty CHECK ((length(TRIM(BOTH FROM message)) > 0)),
    CONSTRAINT notifications_read_at_logic CHECK ((((read_status = true) AND (read_at IS NOT NULL)) OR ((read_status = false) AND (read_at IS NULL)))),
    CONSTRAINT notifications_title_not_empty CHECK ((length(TRIM(BOTH FROM title)) > 0))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.notifications IS 'User notifications for in-app and email delivery with read tracking';


--
-- Name: COLUMN notifications.recipient_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.recipient_id IS 'User who receives the notification';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.type IS 'Type of notification (info, warning, success, error, etc.)';


--
-- Name: COLUMN notifications.category; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.category IS 'Category for filtering and organization';


--
-- Name: COLUMN notifications.related_resource_type; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.related_resource_type IS 'Type of related resource (task, event, etc.)';


--
-- Name: COLUMN notifications.related_resource_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.related_resource_id IS 'ID of related resource for navigation';


--
-- Name: COLUMN notifications.read_status; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.read_status IS 'Whether notification has been read by recipient';


--
-- Name: COLUMN notifications.delivered_at; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.delivered_at IS 'When notification was delivered';


--
-- Name: COLUMN notifications.read_at; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.notifications.read_at IS 'When notification was marked as read';


--
-- Name: payroll_records; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.payroll_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    gross_pay numeric(12,2) NOT NULL,
    net_pay numeric(12,2) NOT NULL,
    processed_by uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payroll_records_pay_period_valid CHECK ((pay_period_end >= pay_period_start)),
    CONSTRAINT payroll_records_pay_positive CHECK (((gross_pay > (0)::numeric) AND (net_pay > (0)::numeric)))
);


--
-- Name: performance_reviews; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.performance_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    review_period character varying(50) NOT NULL,
    status hr_public.review_status DEFAULT 'not_started'::hr_public.review_status NOT NULL,
    overall_rating numeric(2,1),
    goals text,
    achievements text,
    areas_for_improvement text,
    manager_feedback text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    review_period_start date,
    review_period_end date,
    review_type character varying(50) DEFAULT 'annual'::character varying,
    notes text,
    CONSTRAINT performance_reviews_no_self_review CHECK ((employee_id <> reviewer_id)),
    CONSTRAINT performance_reviews_rating_range CHECK (((overall_rating >= 1.0) AND (overall_rating <= 5.0)))
);


--
-- Name: permissions; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    resource character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: TABLE permissions; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.permissions IS 'Granular permissions for resources and actions';


--
-- Name: review_goals; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.review_goals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    goal_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE review_goals; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.review_goals IS 'Links performance reviews to employee goals being evaluated';


--
-- Name: review_templates; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.review_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    template_data jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.role_permissions IS 'Junction table linking roles to permissions';


--
-- Name: roles; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    level integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT roles_level_positive CHECK ((level > 0))
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.roles IS 'RBAC roles with hierarchical levels';


--
-- Name: rollback_requests; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.rollback_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_log_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rollback_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE rollback_requests; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.rollback_requests IS 'Workflow for admins to request rollbacks from super admins';


--
-- Name: COLUMN rollback_requests.status; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.rollback_requests.status IS 'Request state: pending, approved, or rejected';


--
-- Name: task_assignees; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.task_assignees (
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid
);


--
-- Name: TABLE task_assignees; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.task_assignees IS 'Many-to-many relationship between tasks and assigned users';


--
-- Name: task_audit_entries; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.task_audit_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    change_type character varying(50) NOT NULL,
    field_name character varying(100),
    old_value jsonb,
    new_value jsonb,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE task_audit_entries; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.task_audit_entries IS 'Immutable audit trail of all task changes';


--
-- Name: task_dependencies; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.task_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    depends_on_task_id uuid NOT NULL,
    dependency_type character varying(50) DEFAULT 'blocks'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_dependencies_check CHECK ((task_id <> depends_on_task_id)),
    CONSTRAINT task_dependencies_dependency_type_check CHECK (((dependency_type)::text = ANY ((ARRAY['blocks'::character varying, 'relates_to'::character varying, 'duplicates'::character varying])::text[])))
);


--
-- Name: TABLE task_dependencies; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.task_dependencies IS 'Task dependencies and relationships';


--
-- Name: COLUMN task_dependencies.dependency_type; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.task_dependencies.dependency_type IS 'blocks: must complete first, relates_to: related work, duplicates: duplicate task';


--
-- Name: task_types; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.task_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(7),
    icon character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE task_types; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.task_types IS 'Categorization of tasks (Bug, Feature, Chore, etc.)';


--
-- Name: tasks; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    task_type_id uuid,
    status character varying(50) DEFAULT 'todo'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    due_date timestamp with time zone,
    estimated_hours numeric(5,2),
    actual_hours numeric(5,2),
    created_by uuid NOT NULL,
    department_id uuid,
    tags text[],
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    assignee_id uuid,
    parent_task_id uuid,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    deleted_at timestamp with time zone,
    requires_manual_reassignment boolean DEFAULT false NOT NULL,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['todo'::character varying, 'in_progress'::character varying, 'blocked'::character varying, 'review'::character varying, 'done'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: TABLE tasks; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.tasks IS 'Task management system with assignments and dependencies';


--
-- Name: COLUMN tasks.status; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.status IS 'Current task status: todo, in_progress, blocked, review, done, archived';


--
-- Name: COLUMN tasks.priority; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.priority IS 'Task priority level: low, medium, high, urgent';


--
-- Name: COLUMN tasks.tags; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.tags IS 'Flexible tagging system for categorization';


--
-- Name: COLUMN tasks.metadata; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.metadata IS 'Additional flexible metadata in JSON format';


--
-- Name: COLUMN tasks.assignee_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.assignee_id IS 'Primary assignee for task (for backward compatibility with frontend single-assignee model)';


--
-- Name: COLUMN tasks.deleted_at; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.deleted_at IS 'Soft delete timestamp - NULL means not deleted';


--
-- Name: COLUMN tasks.requires_manual_reassignment; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.tasks.requires_manual_reassignment IS 'If true, task requires manual intervention when assignee changes';


--
-- Name: time_off_balances; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.time_off_balances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    policy_id uuid NOT NULL,
    balance_days numeric(5,2) DEFAULT 0.0 NOT NULL,
    used_days numeric(5,2) DEFAULT 0.0 NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: time_off_policies; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.time_off_policies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    days_per_year integer NOT NULL,
    requires_approval boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT time_off_policies_days_positive CHECK ((days_per_year > 0))
);


--
-- Name: user_role_assignments; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.user_role_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_name character varying(50) NOT NULL,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    role_id uuid,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN user_role_assignments.deleted_at; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.user_role_assignments.deleted_at IS 'Soft delete timestamp';


--
-- Name: COLUMN user_role_assignments.role_id; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON COLUMN hr_public.user_role_assignments.role_id IS 'Foreign key to roles table (migrated from role_name)';


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    rolled_back_at timestamp with time zone,
    rolled_back_by uuid,
    rolled_back_log_id uuid,
    is_rollback boolean DEFAULT false
);


--
-- Name: TABLE activity_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activity_logs IS 'Comprehensive audit trail of all system actions';


--
-- Name: COLUMN activity_logs.is_rollback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.is_rollback IS 'TRUE if this log entry represents a rollback action';


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    checksum character varying(64),
    execution_time_ms integer
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: compensation_records compensation_records_pkey; Type: CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.compensation_records
    ADD CONSTRAINT compensation_records_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_unique_user_date; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.attendance_records
    ADD CONSTRAINT attendance_records_unique_user_date UNIQUE (user_id, date);


--
-- Name: bulk_rollback_batches bulk_rollback_batches_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.bulk_rollback_batches
    ADD CONSTRAINT bulk_rollback_batches_pkey PRIMARY KEY (id);


--
-- Name: bulk_rollback_items bulk_rollback_items_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.bulk_rollback_items
    ADD CONSTRAINT bulk_rollback_items_pkey PRIMARY KEY (id);


--
-- Name: compensation_bands compensation_bands_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.compensation_bands
    ADD CONSTRAINT compensation_bands_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: document_access_logs document_access_logs_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_access_logs
    ADD CONSTRAINT document_access_logs_pkey PRIMARY KEY (id);


--
-- Name: document_assignments document_assignments_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_assignments
    ADD CONSTRAINT document_assignments_pkey PRIMARY KEY (id);


--
-- Name: document_categories document_categories_name_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_categories
    ADD CONSTRAINT document_categories_name_key UNIQUE (name);


--
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_categories
    ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_document_id_version_number_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_versions
    ADD CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: emergency_contacts emergency_contacts_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id);


--
-- Name: employee_goals employee_goals_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_pkey PRIMARY KEY (id);


--
-- Name: employee_vehicles employee_vehicles_license_plate_unique; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_vehicles
    ADD CONSTRAINT employee_vehicles_license_plate_unique UNIQUE (license_plate);


--
-- Name: employee_vehicles employee_vehicles_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_vehicles
    ADD CONSTRAINT employee_vehicles_pkey PRIMARY KEY (id);


--
-- Name: encrypted_file_storage encrypted_file_storage_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.encrypted_file_storage
    ADD CONSTRAINT encrypted_file_storage_pkey PRIMARY KEY (id);


--
-- Name: encryption_keys encryption_keys_key_name_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.encryption_keys
    ADD CONSTRAINT encryption_keys_key_name_key UNIQUE (key_name);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_attendees
    ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (id);


--
-- Name: event_attendees event_attendees_unique; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_attendees
    ADD CONSTRAINT event_attendees_unique UNIQUE (event_id, employee_id);


--
-- Name: event_comments event_comments_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_comments
    ADD CONSTRAINT event_comments_pkey PRIMARY KEY (id);


--
-- Name: event_history event_history_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_history
    ADD CONSTRAINT event_history_pkey PRIMARY KEY (id);


--
-- Name: event_notifications event_notifications_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_notifications
    ADD CONSTRAINT event_notifications_pkey PRIMARY KEY (id);


--
-- Name: event_waitlist event_waitlist_event_id_employee_id_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_waitlist
    ADD CONSTRAINT event_waitlist_event_id_employee_id_key UNIQUE (event_id, employee_id);


--
-- Name: event_waitlist event_waitlist_event_id_position_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_waitlist
    ADD CONSTRAINT event_waitlist_event_id_position_key UNIQUE (event_id, "position");


--
-- Name: event_waitlist event_waitlist_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_waitlist
    ADD CONSTRAINT event_waitlist_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: hr_reports hr_reports_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.hr_reports
    ADD CONSTRAINT hr_reports_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: linked_resources linked_resources_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.linked_resources
    ADD CONSTRAINT linked_resources_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews
    ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_resource_action_unique; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.permissions
    ADD CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action);


--
-- Name: review_goals review_goals_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_goals
    ADD CONSTRAINT review_goals_pkey PRIMARY KEY (id);


--
-- Name: review_goals review_goals_review_id_goal_id_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_goals
    ADD CONSTRAINT review_goals_review_id_goal_id_key UNIQUE (review_id, goal_id);


--
-- Name: review_templates review_templates_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_templates
    ADD CONSTRAINT review_templates_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_permission_unique; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.role_permissions
    ADD CONSTRAINT role_permissions_role_permission_unique UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rollback_requests rollback_requests_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.rollback_requests
    ADD CONSTRAINT rollback_requests_pkey PRIMARY KEY (id);


--
-- Name: task_assignees task_assignees_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_assignees
    ADD CONSTRAINT task_assignees_pkey PRIMARY KEY (task_id, user_id);


--
-- Name: task_audit_entries task_audit_entries_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_audit_entries
    ADD CONSTRAINT task_audit_entries_pkey PRIMARY KEY (id);


--
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (id);


--
-- Name: task_dependencies task_dependencies_task_id_depends_on_task_id_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_depends_on_task_id_key UNIQUE (task_id, depends_on_task_id);


--
-- Name: task_types task_types_name_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_types
    ADD CONSTRAINT task_types_name_key UNIQUE (name);


--
-- Name: task_types task_types_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_types
    ADD CONSTRAINT task_types_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: time_off_balances time_off_balances_employee_policy_year_unique; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_employee_policy_year_unique UNIQUE (employee_id, policy_id, year);


--
-- Name: time_off_balances time_off_balances_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_pkey PRIMARY KEY (id);


--
-- Name: time_off_policies time_off_policies_name_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_policies
    ADD CONSTRAINT time_off_policies_name_key UNIQUE (name);


--
-- Name: time_off_policies time_off_policies_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_policies
    ADD CONSTRAINT time_off_policies_pkey PRIMARY KEY (id);


--
-- Name: user_role_assignments user_role_assignments_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_role_assignments user_role_assignments_user_role_unique; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_user_role_unique UNIQUE (user_id, role_name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: idx_compensation_records_employee_current; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_compensation_records_employee_current ON hr_private.compensation_records USING btree (employee_id, effective_date DESC) WHERE (end_date IS NULL);


--
-- Name: departments_manager_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX departments_manager_id_idx ON hr_public.departments USING btree (manager_id) WHERE (manager_id IS NOT NULL);


--
-- Name: departments_search_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX departments_search_idx ON hr_public.departments USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: employee_goals_active_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX employee_goals_active_idx ON hr_public.employee_goals USING btree (employee_id, target_date) WHERE ((status)::text = 'in_progress'::text);


--
-- Name: employee_goals_department_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX employee_goals_department_idx ON hr_public.employee_goals USING btree (employee_id) INCLUDE (status, target_date, progress_percentage);


--
-- Name: employee_goals_target_date_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX employee_goals_target_date_idx ON hr_public.employee_goals USING btree (target_date) WHERE ((target_date IS NOT NULL) AND ((status)::text <> 'cancelled'::text));


--
-- Name: hr_reports_category_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_category_idx ON hr_public.hr_reports USING btree (category);


--
-- Name: hr_reports_creator_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_creator_id_idx ON hr_public.hr_reports USING btree (creator_id);


--
-- Name: hr_reports_department_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_department_id_idx ON hr_public.hr_reports USING btree (department_id);


--
-- Name: hr_reports_generated_at_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_generated_at_idx ON hr_public.hr_reports USING btree (generated_at) WHERE (generated_at IS NOT NULL);


--
-- Name: hr_reports_report_type_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_report_type_idx ON hr_public.hr_reports USING btree (report_type);


--
-- Name: hr_reports_scheduled_at_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_scheduled_at_idx ON hr_public.hr_reports USING btree (scheduled_at) WHERE (scheduled_at IS NOT NULL);


--
-- Name: hr_reports_status_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX hr_reports_status_idx ON hr_public.hr_reports USING btree (status);


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON hr_public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON hr_public.activity_logs USING btree (created_at);


--
-- Name: idx_activity_logs_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_activity_logs_employee_id ON hr_public.activity_logs USING btree (employee_id);


--
-- Name: idx_activity_logs_resource_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_activity_logs_resource_type ON hr_public.activity_logs USING btree (resource_type);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON hr_public.activity_logs USING btree (user_id);


--
-- Name: idx_attendees_composite; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_attendees_composite ON hr_public.event_attendees USING btree (employee_id, event_id, response_status);


--
-- Name: idx_attendees_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_attendees_status ON hr_public.event_attendees USING btree (response_status);


--
-- Name: idx_bulk_rollback_created_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_bulk_rollback_created_at ON hr_public.bulk_rollback_batches USING btree (created_at DESC);


--
-- Name: idx_bulk_rollback_items_batch; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_bulk_rollback_items_batch ON hr_public.bulk_rollback_items USING btree (batch_id);


--
-- Name: idx_bulk_rollback_items_log; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_bulk_rollback_items_log ON hr_public.bulk_rollback_items USING btree (activity_log_id);


--
-- Name: idx_bulk_rollback_requested_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_bulk_rollback_requested_by ON hr_public.bulk_rollback_batches USING btree (requested_by);


--
-- Name: idx_bulk_rollback_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_bulk_rollback_status ON hr_public.bulk_rollback_batches USING btree (status);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_comments_created_at ON hr_public.event_comments USING btree (created_at DESC);


--
-- Name: idx_comments_event; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_comments_event ON hr_public.event_comments USING btree (event_id);


--
-- Name: idx_comments_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_comments_fulltext ON hr_public.event_comments USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx_comments_user; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_comments_user ON hr_public.event_comments USING btree (user_id);


--
-- Name: idx_compensation_bands_created_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_compensation_bands_created_by ON hr_public.compensation_bands USING btree (created_by);


--
-- Name: idx_departments_manager_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_departments_manager_id ON hr_public.departments USING btree (manager_id);


--
-- Name: idx_departments_parent_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_departments_parent_id ON hr_public.departments USING btree (parent_department_id);


--
-- Name: idx_document_access_action; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_access_action ON hr_public.document_access_logs USING btree (action);


--
-- Name: idx_document_access_document; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_access_document ON hr_public.document_access_logs USING btree (document_id, accessed_at DESC);


--
-- Name: idx_document_access_user; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_access_user ON hr_public.document_access_logs USING btree (user_id);


--
-- Name: idx_document_assignments_department; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_assignments_department ON hr_public.document_assignments USING btree (department_id);


--
-- Name: idx_document_assignments_document; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_assignments_document ON hr_public.document_assignments USING btree (document_id);


--
-- Name: idx_document_assignments_due_date; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_assignments_due_date ON hr_public.document_assignments USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- Name: idx_document_assignments_employee; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_assignments_employee ON hr_public.document_assignments USING btree (employee_id);


--
-- Name: idx_document_assignments_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_assignments_status ON hr_public.document_assignments USING btree (assignment_status);


--
-- Name: idx_document_versions_document; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_versions_document ON hr_public.document_versions USING btree (document_id, version_number DESC);


--
-- Name: idx_document_versions_uploaded_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_document_versions_uploaded_by ON hr_public.document_versions USING btree (uploaded_by);


--
-- Name: idx_documents_category; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_category ON hr_public.documents USING btree (category_id);


--
-- Name: idx_documents_created_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_created_at ON hr_public.documents USING btree (created_at DESC);


--
-- Name: idx_documents_description_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_description_fulltext ON hr_public.documents USING gin (to_tsvector('english'::regconfig, COALESCE(description, ''::text)));


--
-- Name: idx_documents_expiry; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_expiry ON hr_public.documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_documents_tags; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_tags ON hr_public.documents USING gin (tags);


--
-- Name: idx_documents_title_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_title_fulltext ON hr_public.documents USING gin (to_tsvector('english'::regconfig, (title)::text));


--
-- Name: idx_documents_uploaded_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_documents_uploaded_by ON hr_public.documents USING btree (uploaded_by);


--
-- Name: idx_emergency_contacts_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_emergency_contacts_employee_id ON hr_public.emergency_contacts USING btree (employee_id);


--
-- Name: idx_employee_goals_created_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_goals_created_by ON hr_public.employee_goals USING btree (created_by);


--
-- Name: idx_employee_goals_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_goals_employee_id ON hr_public.employee_goals USING btree (employee_id);


--
-- Name: idx_employee_vehicles_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_vehicles_employee_id ON hr_public.employee_vehicles USING btree (employee_id);


--
-- Name: idx_encrypted_storage_document; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_encrypted_storage_document ON hr_public.encrypted_file_storage USING btree (document_id);


--
-- Name: idx_encryption_keys_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_encryption_keys_active ON hr_public.encryption_keys USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_event_attendees_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_event_attendees_employee_id ON hr_public.event_attendees USING btree (employee_id);


--
-- Name: idx_event_attendees_event_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_event_attendees_event_id ON hr_public.event_attendees USING btree (event_id);


--
-- Name: idx_event_attendees_organizer; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_event_attendees_organizer ON hr_public.event_attendees USING btree (is_organizer) WHERE (is_organizer = true);


--
-- Name: idx_event_attendees_reminder; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_event_attendees_reminder ON hr_public.event_attendees USING btree (reminder_time) WHERE (reminder_time IS NOT NULL);


--
-- Name: idx_event_attendees_response_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_event_attendees_response_status ON hr_public.event_attendees USING btree (response_status);


--
-- Name: idx_events_deleted_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_deleted_at ON hr_public.events USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_events_description_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_description_fulltext ON hr_public.events USING gin (to_tsvector('english'::regconfig, COALESCE(description, ''::text)));


--
-- Name: idx_events_end_time; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_end_time ON hr_public.events USING btree (end_time);


--
-- Name: idx_events_is_public; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_is_public ON hr_public.events USING btree (is_public);


--
-- Name: idx_events_is_public_start; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_is_public_start ON hr_public.events USING btree (is_public, start_time DESC);


--
-- Name: idx_events_organizer; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_organizer ON hr_public.events USING btree (organizer_id);


--
-- Name: idx_events_organizer_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_organizer_id ON hr_public.events USING btree (organizer_id);


--
-- Name: idx_events_recurrence; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_recurrence ON hr_public.events USING btree (recurrence_id) WHERE (recurrence_id IS NOT NULL);


--
-- Name: idx_events_recurrence_end_date; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_recurrence_end_date ON hr_public.events USING btree (recurrence_end_date) WHERE (recurrence_end_date IS NOT NULL);


--
-- Name: INDEX idx_events_recurrence_end_date; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON INDEX hr_public.idx_events_recurrence_end_date IS 'Index for finding recurring events by end date';


--
-- Name: idx_events_start_time; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_start_time ON hr_public.events USING btree (start_time);


--
-- Name: idx_events_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_status ON hr_public.events USING btree (status);


--
-- Name: idx_events_time_range; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_time_range ON hr_public.events USING gist (tstzrange(start_time, end_time));


--
-- Name: idx_events_title_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_title_fulltext ON hr_public.events USING gin (to_tsvector('english'::regconfig, (title)::text));


--
-- Name: idx_events_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_events_type ON hr_public.events USING btree (event_type);


--
-- Name: idx_history_change_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_history_change_type ON hr_public.event_history USING btree (change_type);


--
-- Name: idx_history_changed_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_history_changed_by ON hr_public.event_history USING btree (changed_by);


--
-- Name: idx_history_event; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_history_event ON hr_public.event_history USING btree (event_id, changed_at DESC);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_leave_requests_dates ON hr_public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_requests_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_leave_requests_employee_id ON hr_public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_requests_manager_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_leave_requests_manager_id ON hr_public.leave_requests USING btree (manager_id);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON hr_public.leave_requests USING btree (status);


--
-- Name: idx_linked_resources_task; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_linked_resources_task ON hr_public.linked_resources USING btree (task_id);


--
-- Name: idx_linked_resources_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_linked_resources_type ON hr_public.linked_resources USING btree (resource_type);


--
-- Name: idx_notifications_event; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_notifications_event ON hr_public.event_notifications USING btree (event_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_notifications_type ON hr_public.event_notifications USING btree (type);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_notifications_unread ON hr_public.event_notifications USING btree (user_id, created_at DESC) WHERE (read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_notifications_user ON hr_public.event_notifications USING btree (user_id, read, created_at DESC);


--
-- Name: idx_payroll_records_created_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_created_by ON hr_public.payroll_records USING btree (created_by);


--
-- Name: idx_payroll_records_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_employee_id ON hr_public.payroll_records USING btree (employee_id);


--
-- Name: idx_payroll_records_pay_period; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_pay_period ON hr_public.payroll_records USING btree (pay_period_start, pay_period_end);


--
-- Name: idx_payroll_records_processed_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_processed_by ON hr_public.payroll_records USING btree (processed_by);


--
-- Name: idx_performance_reviews_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_employee_id ON hr_public.performance_reviews USING btree (employee_id);


--
-- Name: idx_performance_reviews_period; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_period ON hr_public.performance_reviews USING btree (review_period);


--
-- Name: idx_performance_reviews_reviewer_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_reviewer_id ON hr_public.performance_reviews USING btree (reviewer_id);


--
-- Name: idx_performance_reviews_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_status ON hr_public.performance_reviews USING btree (status);


--
-- Name: idx_permissions_deleted_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_permissions_deleted_at ON hr_public.permissions USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_review_goals_goal; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_review_goals_goal ON hr_public.review_goals USING btree (goal_id);


--
-- Name: idx_review_goals_review; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_review_goals_review ON hr_public.review_goals USING btree (review_id);


--
-- Name: idx_review_templates_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_review_templates_active ON hr_public.review_templates USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_review_templates_created_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_review_templates_created_by ON hr_public.review_templates USING btree (created_by);


--
-- Name: idx_reviews_period_end; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_reviews_period_end ON hr_public.performance_reviews USING btree (review_period_end);


--
-- Name: idx_reviews_period_start; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_reviews_period_start ON hr_public.performance_reviews USING btree (review_period_start);


--
-- Name: idx_reviews_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_reviews_type ON hr_public.performance_reviews USING btree (review_type);


--
-- Name: idx_role_permissions_deleted_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_role_permissions_deleted_at ON hr_public.role_permissions USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON hr_public.role_permissions USING btree (permission_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON hr_public.role_permissions USING btree (role_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_roles_deleted_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_roles_deleted_at ON hr_public.roles USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_rollback_requests_log; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_rollback_requests_log ON hr_public.rollback_requests USING btree (activity_log_id);


--
-- Name: idx_rollback_requests_requested_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_rollback_requests_requested_at ON hr_public.rollback_requests USING btree (requested_at DESC);


--
-- Name: idx_rollback_requests_requester; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_rollback_requests_requester ON hr_public.rollback_requests USING btree (requested_by);


--
-- Name: idx_rollback_requests_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_rollback_requests_status ON hr_public.rollback_requests USING btree (status, requested_at DESC);


--
-- Name: idx_task_assignees_assigned_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_assignees_assigned_by ON hr_public.task_assignees USING btree (assigned_by);


--
-- Name: idx_task_assignees_user; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_assignees_user ON hr_public.task_assignees USING btree (user_id);


--
-- Name: idx_task_audit_change_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_audit_change_type ON hr_public.task_audit_entries USING btree (change_type);


--
-- Name: idx_task_audit_changed_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_audit_changed_by ON hr_public.task_audit_entries USING btree (changed_by);


--
-- Name: idx_task_audit_task; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_audit_task ON hr_public.task_audit_entries USING btree (task_id, changed_at DESC);


--
-- Name: idx_task_deps_depends_on; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_deps_depends_on ON hr_public.task_dependencies USING btree (depends_on_task_id);


--
-- Name: idx_task_deps_task; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_task_deps_task ON hr_public.task_dependencies USING btree (task_id);


--
-- Name: idx_tasks_archived; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_archived ON hr_public.tasks USING btree (archived) WHERE (archived = true);


--
-- Name: idx_tasks_archived_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_archived_by ON hr_public.tasks USING btree (archived_by);


--
-- Name: idx_tasks_assignee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_assignee_id ON hr_public.tasks USING btree (assignee_id);


--
-- Name: idx_tasks_created_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_created_by ON hr_public.tasks USING btree (created_by);


--
-- Name: idx_tasks_deleted_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_deleted_at ON hr_public.tasks USING btree (deleted_at);


--
-- Name: idx_tasks_department; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_department ON hr_public.tasks USING btree (department_id);


--
-- Name: idx_tasks_description_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_description_fulltext ON hr_public.tasks USING gin (to_tsvector('english'::regconfig, COALESCE(description, ''::text)));


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON hr_public.tasks USING btree (due_date);


--
-- Name: idx_tasks_metadata; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_metadata ON hr_public.tasks USING gin (metadata);


--
-- Name: idx_tasks_parent_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_parent_id ON hr_public.tasks USING btree (parent_task_id);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_priority ON hr_public.tasks USING btree (priority);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_status ON hr_public.tasks USING btree (status);


--
-- Name: idx_tasks_tags; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_tags ON hr_public.tasks USING gin (tags);


--
-- Name: idx_tasks_title_fulltext; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_title_fulltext ON hr_public.tasks USING gin (to_tsvector('english'::regconfig, (title)::text));


--
-- Name: idx_tasks_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_tasks_type ON hr_public.tasks USING btree (task_type_id);


--
-- Name: idx_time_off_balances_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_balances_employee_id ON hr_public.time_off_balances USING btree (employee_id);


--
-- Name: idx_time_off_balances_policy_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_balances_policy_id ON hr_public.time_off_balances USING btree (policy_id);


--
-- Name: idx_user_role_assignments_assigned_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_role_assignments_assigned_by ON hr_public.user_role_assignments USING btree (assigned_by);


--
-- Name: idx_user_role_assignments_deleted_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_role_assignments_deleted_at ON hr_public.user_role_assignments USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_role_assignments_role_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_role_assignments_role_id ON hr_public.user_role_assignments USING btree (role_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_role_assignments_role_name; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_role_assignments_role_name ON hr_public.user_role_assignments USING btree (role_name);


--
-- Name: idx_user_role_assignments_user_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_role_assignments_user_id ON hr_public.user_role_assignments USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_active ON hr_public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_department_id ON hr_public.users USING btree (department_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_email ON hr_public.users USING btree (email);


--
-- Name: idx_users_job_title; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_job_title ON hr_public.users USING btree (job_title);


--
-- Name: idx_users_manager_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_manager_id ON hr_public.users USING btree (manager_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_role ON hr_public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_status ON hr_public.users USING btree (status);


--
-- Name: idx_waitlist_employee; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_waitlist_employee ON hr_public.event_waitlist USING btree (employee_id);


--
-- Name: idx_waitlist_event; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_waitlist_event ON hr_public.event_waitlist USING btree (event_id, "position");


--
-- Name: leave_requests_date_range_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX leave_requests_date_range_idx ON hr_public.leave_requests USING btree (start_date, end_date) INCLUDE (status, leave_type);


--
-- Name: leave_requests_department_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX leave_requests_department_id_idx ON hr_public.leave_requests USING btree (employee_id) INCLUDE (status, start_date, end_date);


--
-- Name: leave_requests_pending_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX leave_requests_pending_idx ON hr_public.leave_requests USING btree (employee_id, created_at DESC) WHERE (status = 'pending'::hr_public.leave_status);


--
-- Name: INDEX leave_requests_pending_idx; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON INDEX hr_public.leave_requests_pending_idx IS 'Optimizes manager dashboard pending leave requests query';


--
-- Name: notifications_category_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX notifications_category_idx ON hr_public.notifications USING btree (category);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX notifications_created_at_idx ON hr_public.notifications USING btree (created_at DESC);


--
-- Name: notifications_read_status_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX notifications_read_status_idx ON hr_public.notifications USING btree (read_status);


--
-- Name: notifications_recipient_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX notifications_recipient_id_idx ON hr_public.notifications USING btree (recipient_id);


--
-- Name: notifications_type_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX notifications_type_idx ON hr_public.notifications USING btree (type);


--
-- Name: notifications_unread_recipient_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX notifications_unread_recipient_idx ON hr_public.notifications USING btree (recipient_id, read_status) WHERE (read_status = false);


--
-- Name: payroll_records_employee_period_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX payroll_records_employee_period_idx ON hr_public.payroll_records USING btree (employee_id, pay_period_start DESC);


--
-- Name: performance_reviews_department_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX performance_reviews_department_idx ON hr_public.performance_reviews USING btree (employee_id) INCLUDE (status, review_period, overall_rating);


--
-- Name: performance_reviews_in_progress_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX performance_reviews_in_progress_idx ON hr_public.performance_reviews USING btree (employee_id, updated_at DESC) WHERE (status = 'in_progress'::hr_public.review_status);


--
-- Name: performance_reviews_period_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX performance_reviews_period_idx ON hr_public.performance_reviews USING btree (review_period, status) INCLUDE (overall_rating);


--
-- Name: time_off_balances_employee_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX time_off_balances_employee_idx ON hr_public.time_off_balances USING btree (employee_id, policy_id) INCLUDE (balance_days, used_days, year);


--
-- Name: user_role_assignments_user_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX user_role_assignments_user_idx ON hr_public.user_role_assignments USING btree (user_id, role_name);


--
-- Name: users_department_role_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX users_department_role_idx ON hr_public.users USING btree (department_id, role) WHERE (is_active = true);


--
-- Name: INDEX users_department_role_idx; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON INDEX hr_public.users_department_role_idx IS 'Optimizes RBAC queries for manager identification';


--
-- Name: users_search_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX users_search_idx ON hr_public.users USING gin (to_tsvector('english'::regconfig, (((((first_name)::text || ' '::text) || (last_name)::text) || ' '::text) || (email)::text)));


--
-- Name: INDEX users_search_idx; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON INDEX hr_public.users_search_idx IS 'Enables full-text search for admin user management';


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_employee ON public.activity_logs USING btree (employee_id);


--
-- Name: idx_activity_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);


--
-- Name: idx_activity_logs_is_rollback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_is_rollback ON public.activity_logs USING btree (is_rollback);


--
-- Name: idx_activity_logs_rolled_back_log_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_rolled_back_log_id ON public.activity_logs USING btree (rolled_back_log_id);


--
-- Name: employees_with_contacts _RETURN; Type: RULE; Schema: hr_public; Owner: -
--

CREATE OR REPLACE VIEW hr_public.employees_with_contacts AS
 SELECT u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    u.role,
    u.department_id,
    u.phone_number,
    u.mobile_number,
    u.address_line1,
    u.address_line2,
    u.city,
    u.state_province,
    u.postal_code,
    u.country,
    u.hire_date,
    u.is_active,
    count(DISTINCT ec.id) AS emergency_contact_count,
    count(DISTINCT ev.id) AS vehicle_count
   FROM ((hr_public.users u
     LEFT JOIN hr_public.emergency_contacts ec ON ((u.id = ec.employee_id)))
     LEFT JOIN hr_public.employee_vehicles ev ON ((u.id = ev.employee_id)))
  GROUP BY u.id;


--
-- Name: compensation_records update_compensation_records_updated_at; Type: TRIGGER; Schema: hr_private; Owner: -
--

CREATE TRIGGER update_compensation_records_updated_at BEFORE UPDATE ON hr_private.compensation_records FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at_column();


--
-- Name: document_assignments assignment_expiry_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER assignment_expiry_trigger BEFORE INSERT OR UPDATE ON hr_public.document_assignments FOR EACH ROW EXECUTE FUNCTION public.check_assignment_expiry();


--
-- Name: documents document_update_timestamp_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER document_update_timestamp_trigger BEFORE UPDATE ON hr_public.documents FOR EACH ROW EXECUTE FUNCTION public.update_document_timestamp();


--
-- Name: tasks sync_task_assignee_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER sync_task_assignee_trigger AFTER INSERT OR UPDATE OF assignee_id ON hr_public.tasks FOR EACH ROW WHEN ((new.assignee_id IS NOT NULL)) EXECUTE FUNCTION public.sync_task_assignee();


--
-- Name: tasks task_audit_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER task_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON hr_public.tasks FOR EACH ROW EXECUTE FUNCTION public.audit_task_changes();


--
-- Name: tasks task_update_timestamp_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER task_update_timestamp_trigger BEFORE UPDATE ON hr_public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_task_timestamp();


--
-- Name: emergency_contacts update_emergency_contacts_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON hr_public.emergency_contacts FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at_column();


--
-- Name: employee_vehicles update_employee_vehicles_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER update_employee_vehicles_updated_at BEFORE UPDATE ON hr_public.employee_vehicles FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at_column();


--
-- Name: event_attendees waitlist_promotion_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER waitlist_promotion_trigger AFTER UPDATE ON hr_public.event_attendees FOR EACH ROW EXECUTE FUNCTION public.promote_from_waitlist();


--
-- Name: compensation_records compensation_records_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.compensation_records
    ADD CONSTRAINT compensation_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id);


--
-- Name: compensation_records compensation_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.compensation_records
    ADD CONSTRAINT compensation_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.activity_logs
    ADD CONSTRAINT activity_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: bulk_rollback_batches bulk_rollback_batches_requested_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.bulk_rollback_batches
    ADD CONSTRAINT bulk_rollback_batches_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES hr_public.users(id);


--
-- Name: bulk_rollback_batches bulk_rollback_batches_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.bulk_rollback_batches
    ADD CONSTRAINT bulk_rollback_batches_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES hr_public.users(id);


--
-- Name: bulk_rollback_items bulk_rollback_items_activity_log_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.bulk_rollback_items
    ADD CONSTRAINT bulk_rollback_items_activity_log_id_fkey FOREIGN KEY (activity_log_id) REFERENCES public.activity_logs(id) ON DELETE CASCADE;


--
-- Name: bulk_rollback_items bulk_rollback_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.bulk_rollback_items
    ADD CONSTRAINT bulk_rollback_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES hr_public.bulk_rollback_batches(id) ON DELETE CASCADE;


--
-- Name: compensation_bands compensation_bands_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.compensation_bands
    ADD CONSTRAINT compensation_bands_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: departments departments_manager_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: document_access_logs document_access_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_access_logs
    ADD CONSTRAINT document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES hr_public.documents(id) ON DELETE CASCADE;


--
-- Name: document_access_logs document_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_access_logs
    ADD CONSTRAINT document_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id);


--
-- Name: document_assignments document_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_assignments
    ADD CONSTRAINT document_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES hr_public.users(id);


--
-- Name: document_assignments document_assignments_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_assignments
    ADD CONSTRAINT document_assignments_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id);


--
-- Name: document_assignments document_assignments_document_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_assignments
    ADD CONSTRAINT document_assignments_document_id_fkey FOREIGN KEY (document_id) REFERENCES hr_public.documents(id) ON DELETE CASCADE;


--
-- Name: document_assignments document_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_assignments
    ADD CONSTRAINT document_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id);


--
-- Name: document_categories document_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_categories
    ADD CONSTRAINT document_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES hr_public.document_categories(id);


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES hr_public.documents(id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.document_versions
    ADD CONSTRAINT document_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES hr_public.users(id);


--
-- Name: documents documents_category_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.documents
    ADD CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES hr_public.document_categories(id);


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES hr_public.users(id);


--
-- Name: emergency_contacts emergency_contacts_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: employee_goals employee_goals_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: employee_goals employee_goals_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: employee_vehicles employee_vehicles_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_vehicles
    ADD CONSTRAINT employee_vehicles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: encrypted_file_storage encrypted_file_storage_document_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.encrypted_file_storage
    ADD CONSTRAINT encrypted_file_storage_document_id_fkey FOREIGN KEY (document_id) REFERENCES hr_public.documents(id) ON DELETE CASCADE;


--
-- Name: encrypted_file_storage encrypted_file_storage_encryption_key_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.encrypted_file_storage
    ADD CONSTRAINT encrypted_file_storage_encryption_key_id_fkey FOREIGN KEY (encryption_key_id) REFERENCES hr_public.encryption_keys(id);


--
-- Name: event_attendees event_attendees_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_attendees
    ADD CONSTRAINT event_attendees_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE;


--
-- Name: event_comments event_comments_event_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_comments
    ADD CONSTRAINT event_comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE;


--
-- Name: event_comments event_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_comments
    ADD CONSTRAINT event_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id);


--
-- Name: event_history event_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_history
    ADD CONSTRAINT event_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES hr_public.users(id);


--
-- Name: event_history event_history_event_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_history
    ADD CONSTRAINT event_history_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE;


--
-- Name: event_notifications event_notifications_event_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_notifications
    ADD CONSTRAINT event_notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE;


--
-- Name: event_notifications event_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_notifications
    ADD CONSTRAINT event_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id);


--
-- Name: event_waitlist event_waitlist_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_waitlist
    ADD CONSTRAINT event_waitlist_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id);


--
-- Name: event_waitlist event_waitlist_event_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.event_waitlist
    ADD CONSTRAINT event_waitlist_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE;


--
-- Name: events events_organizer_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.events
    ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: events events_recurrence_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.events
    ADD CONSTRAINT events_recurrence_id_fkey FOREIGN KEY (recurrence_id) REFERENCES hr_public.events(id);


--
-- Name: departments fk_departments_parent; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT fk_departments_parent FOREIGN KEY (parent_department_id) REFERENCES hr_public.departments(id) ON DELETE SET NULL;


--
-- Name: tasks fk_tasks_archived_by; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT fk_tasks_archived_by FOREIGN KEY (archived_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: tasks fk_tasks_assignee; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: tasks fk_tasks_parent; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;


--
-- Name: users fk_users_manager; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: hr_reports hr_reports_creator_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.hr_reports
    ADD CONSTRAINT hr_reports_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: hr_reports hr_reports_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.hr_reports
    ADD CONSTRAINT hr_reports_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_manager_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.leave_requests
    ADD CONSTRAINT leave_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: linked_resources linked_resources_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.linked_resources
    ADD CONSTRAINT linked_resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id);


--
-- Name: linked_resources linked_resources_task_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.linked_resources
    ADD CONSTRAINT linked_resources_task_id_fkey FOREIGN KEY (task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id);


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: payroll_records payroll_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_processed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: performance_reviews performance_reviews_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews
    ADD CONSTRAINT performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews
    ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: review_goals review_goals_goal_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_goals
    ADD CONSTRAINT review_goals_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES hr_public.employee_goals(id) ON DELETE RESTRICT;


--
-- Name: review_goals review_goals_review_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_goals
    ADD CONSTRAINT review_goals_review_id_fkey FOREIGN KEY (review_id) REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE;


--
-- Name: review_templates review_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_templates
    ADD CONSTRAINT review_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES hr_public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES hr_public.roles(id) ON DELETE CASCADE;


--
-- Name: rollback_requests rollback_requests_activity_log_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.rollback_requests
    ADD CONSTRAINT rollback_requests_activity_log_id_fkey FOREIGN KEY (activity_log_id) REFERENCES public.activity_logs(id) ON DELETE CASCADE;


--
-- Name: rollback_requests rollback_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.rollback_requests
    ADD CONSTRAINT rollback_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: rollback_requests rollback_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.rollback_requests
    ADD CONSTRAINT rollback_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: task_assignees task_assignees_assigned_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_assignees
    ADD CONSTRAINT task_assignees_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES hr_public.users(id);


--
-- Name: task_assignees task_assignees_task_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_assignees
    ADD CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_assignees task_assignees_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_assignees
    ADD CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: task_audit_entries task_audit_entries_changed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_audit_entries
    ADD CONSTRAINT task_audit_entries_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES hr_public.users(id);


--
-- Name: task_audit_entries task_audit_entries_task_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_audit_entries
    ADD CONSTRAINT task_audit_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_depends_on_task_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES hr_public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id);


--
-- Name: tasks tasks_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id);


--
-- Name: tasks tasks_task_type_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.tasks
    ADD CONSTRAINT tasks_task_type_id_fkey FOREIGN KEY (task_type_id) REFERENCES hr_public.task_types(id);


--
-- Name: time_off_balances time_off_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: time_off_balances time_off_balances_policy_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES hr_public.time_off_policies(id) ON DELETE CASCADE;


--
-- Name: user_role_assignments user_role_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;


--
-- Name: user_role_assignments user_role_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES hr_public.roles(id) ON DELETE CASCADE;


--
-- Name: user_role_assignments user_role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_rolled_back_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_rolled_back_by_fkey FOREIGN KEY (rolled_back_by) REFERENCES hr_public.users(id);


--
-- Name: activity_logs activity_logs_rolled_back_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_rolled_back_log_id_fkey FOREIGN KEY (rolled_back_log_id) REFERENCES public.activity_logs(id);


--
-- Name: compensation_records; Type: ROW SECURITY; Schema: hr_private; Owner: -
--

ALTER TABLE hr_private.compensation_records ENABLE ROW LEVEL SECURITY;

--
-- Name: compensation_records compensation_records_employee_view_own; Type: POLICY; Schema: hr_private; Owner: -
--

CREATE POLICY compensation_records_employee_view_own ON hr_private.compensation_records FOR SELECT USING ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: compensation_records compensation_records_hr_full_access; Type: POLICY; Schema: hr_private; Owner: -
--

CREATE POLICY compensation_records_hr_full_access ON hr_private.compensation_records USING ((current_setting('jwt.claims.role'::text, true) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text])));


--
-- Name: document_access_logs access_logs_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY access_logs_select_policy ON hr_public.document_access_logs FOR SELECT USING (((user_id = (current_setting('app.current_user_id'::text, true))::uuid) OR (current_setting('app.current_role'::text, true) = ANY (ARRAY['super_admin'::text, 'admin'::text]))));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: rollback_requests admin_create_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY admin_create_requests ON hr_public.rollback_requests FOR INSERT WITH CHECK (((requested_by = (current_setting('app.current_user_id'::text, true))::uuid) AND (current_setting('app.current_role'::text, true) = 'admin'::text)));


--
-- Name: employee_goals admin_full_access_goals; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY admin_full_access_goals ON hr_public.employee_goals USING (hr_hidden.is_user_admin()) WITH CHECK (hr_hidden.is_user_admin());


--
-- Name: leave_requests admin_full_access_leave_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY admin_full_access_leave_requests ON hr_public.leave_requests USING (hr_hidden.is_user_admin()) WITH CHECK (hr_hidden.is_user_admin());


--
-- Name: POLICY admin_full_access_leave_requests ON leave_requests; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON POLICY admin_full_access_leave_requests ON hr_public.leave_requests IS 'Admins have unrestricted access to all leave requests across all departments';


--
-- Name: performance_reviews admin_full_access_performance_reviews; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY admin_full_access_performance_reviews ON hr_public.performance_reviews USING (hr_hidden.is_user_admin()) WITH CHECK (hr_hidden.is_user_admin());


--
-- Name: time_off_balances admin_full_access_time_off_balances; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY admin_full_access_time_off_balances ON hr_public.time_off_balances USING (hr_hidden.is_user_admin()) WITH CHECK (hr_hidden.is_user_admin());


--
-- Name: rollback_requests admin_own_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY admin_own_requests ON hr_public.rollback_requests FOR SELECT USING ((requested_by = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: document_assignments assignments_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY assignments_select_policy ON hr_public.document_assignments FOR SELECT USING (((employee_id = (current_setting('app.current_user_id'::text, true))::uuid) OR (assigned_by = (current_setting('app.current_user_id'::text, true))::uuid) OR (current_setting('app.current_role'::text, true) = ANY (ARRAY['super_admin'::text, 'admin'::text]))));


--
-- Name: attendance_records; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.attendance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: event_attendees attendees_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY attendees_select_policy ON hr_public.event_attendees FOR SELECT USING (((event_id IN ( SELECT events.id
   FROM hr_public.events
  WHERE (events.is_public = true))) OR (employee_id = (current_setting('app.current_user_id'::text, true))::uuid) OR (event_id IN ( SELECT events.id
   FROM hr_public.events
  WHERE (events.organizer_id = (current_setting('app.current_user_id'::text, true))::uuid)))));


--
-- Name: bulk_rollback_batches; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.bulk_rollback_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: bulk_rollback_items; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.bulk_rollback_items ENABLE ROW LEVEL SECURITY;

--
-- Name: bulk_rollback_batches bulk_rollback_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY bulk_rollback_select_policy ON hr_public.bulk_rollback_batches FOR SELECT USING (((requested_by = (current_setting('app.current_user_id'::text, true))::uuid) OR (current_setting('app.current_role'::text, true) = ANY (ARRAY['super_admin'::text, 'admin'::text]))));


--
-- Name: compensation_bands; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.compensation_bands ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: document_access_logs; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.document_access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: document_assignments; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.document_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_insert_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY documents_insert_policy ON hr_public.documents FOR INSERT WITH CHECK (((uploaded_by = (current_setting('app.current_user_id'::text, true))::uuid) AND (current_setting('app.current_role'::text, true) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'manager'::text]))));


--
-- Name: documents documents_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY documents_select_policy ON hr_public.documents FOR SELECT USING (((uploaded_by = (current_setting('app.current_user_id'::text, true))::uuid) OR (current_setting('app.current_role'::text, true) = ANY (ARRAY['super_admin'::text, 'admin'::text])) OR (id IN ( SELECT document_assignments.document_id
   FROM hr_public.document_assignments
  WHERE ((document_assignments.employee_id = (current_setting('app.current_user_id'::text, true))::uuid) AND ((document_assignments.assignment_status)::text = 'active'::text))))));


--
-- Name: emergency_contacts; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.emergency_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_contacts emergency_contacts_manage_own; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY emergency_contacts_manage_own ON hr_public.emergency_contacts USING (((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid) OR (current_setting('jwt.claims.role'::text, true) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))));


--
-- Name: emergency_contacts emergency_contacts_view_own; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY emergency_contacts_view_own ON hr_public.emergency_contacts FOR SELECT USING (((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid) OR (current_setting('jwt.claims.role'::text, true) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))));


--
-- Name: leave_requests employee_create_own_leave_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_create_own_leave_requests ON hr_public.leave_requests FOR INSERT WITH CHECK ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: employee_goals; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.employee_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_goals employee_update_own_goal_progress; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_update_own_goal_progress ON hr_public.employee_goals FOR UPDATE USING ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid)) WITH CHECK ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: employee_vehicles; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.employee_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_vehicles employee_vehicles_manage_own; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_vehicles_manage_own ON hr_public.employee_vehicles USING (((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid) OR (current_setting('jwt.claims.role'::text, true) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))));


--
-- Name: employee_vehicles employee_vehicles_view_own; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_vehicles_view_own ON hr_public.employee_vehicles FOR SELECT USING (((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid) OR (current_setting('jwt.claims.role'::text, true) = ANY (ARRAY['hr_manager'::text, 'admin'::text, 'super_admin'::text]))));


--
-- Name: employee_goals employee_view_own_goals; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_view_own_goals ON hr_public.employee_goals FOR SELECT USING ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: leave_requests employee_view_own_leave_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_view_own_leave_requests ON hr_public.leave_requests FOR SELECT USING ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: performance_reviews employee_view_own_performance_reviews; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_view_own_performance_reviews ON hr_public.performance_reviews FOR SELECT USING ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: time_off_balances employee_view_own_time_off_balances; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY employee_view_own_time_off_balances ON hr_public.time_off_balances FOR SELECT USING ((employee_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));


--
-- Name: event_attendees; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.event_attendees ENABLE ROW LEVEL SECURITY;

--
-- Name: event_comments; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.event_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: event_notifications; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.event_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: event_waitlist; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.event_waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_delete_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY events_delete_policy ON hr_public.events FOR UPDATE USING ((organizer_id = (current_setting('rls.user_id'::text, true))::uuid)) WITH CHECK ((deleted_at IS NOT NULL));


--
-- Name: events events_insert_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY events_insert_policy ON hr_public.events FOR INSERT WITH CHECK ((((current_setting('rls.user_id'::text, true))::uuid IS NOT NULL) AND (organizer_id = (current_setting('rls.user_id'::text, true))::uuid)));


--
-- Name: events events_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY events_select_policy ON hr_public.events FOR SELECT USING (((deleted_at IS NULL) AND ((is_public = true) OR (organizer_id = (current_setting('rls.user_id'::text, true))::uuid) OR (EXISTS ( SELECT 1
   FROM hr_public.event_attendees ea
  WHERE ((ea.event_id = events.id) AND (ea.employee_id = (current_setting('rls.user_id'::text, true))::uuid)))))));


--
-- Name: events events_update_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY events_update_policy ON hr_public.events FOR UPDATE USING (((deleted_at IS NULL) AND (organizer_id = (current_setting('rls.user_id'::text, true))::uuid))) WITH CHECK ((organizer_id = (current_setting('rls.user_id'::text, true))::uuid));


--
-- Name: leave_requests; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: linked_resources; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.linked_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_goals manager_create_department_goals; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_create_department_goals ON hr_public.employee_goals FOR INSERT WITH CHECK ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: performance_reviews manager_create_department_performance_reviews; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_create_department_performance_reviews ON hr_public.performance_reviews FOR INSERT WITH CHECK ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: employee_goals manager_delete_department_goals; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_delete_department_goals ON hr_public.employee_goals FOR DELETE USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: performance_reviews manager_delete_department_performance_reviews; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_delete_department_performance_reviews ON hr_public.performance_reviews FOR DELETE USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: employee_goals manager_update_department_goals; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_update_department_goals ON hr_public.employee_goals FOR UPDATE USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id()))))) WITH CHECK ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: leave_requests manager_update_department_leave_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_update_department_leave_requests ON hr_public.leave_requests FOR UPDATE USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id()))))) WITH CHECK ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: performance_reviews manager_update_department_performance_reviews; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_update_department_performance_reviews ON hr_public.performance_reviews FOR UPDATE USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id()))))) WITH CHECK ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: employee_goals manager_view_department_goals; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_view_department_goals ON hr_public.employee_goals FOR SELECT USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: leave_requests manager_view_department_leave_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_view_department_leave_requests ON hr_public.leave_requests FOR SELECT USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: POLICY manager_view_department_leave_requests ON leave_requests; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON POLICY manager_view_department_leave_requests ON hr_public.leave_requests IS 'Managers can view leave requests from employees in their department only';


--
-- Name: performance_reviews manager_view_department_performance_reviews; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_view_department_performance_reviews ON hr_public.performance_reviews FOR SELECT USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: time_off_balances manager_view_department_time_off_balances; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY manager_view_department_time_off_balances ON hr_public.time_off_balances FOR SELECT USING ((hr_hidden.is_user_manager() AND (employee_id IN ( SELECT users.id
   FROM hr_public.users
  WHERE (users.department_id = hr_hidden.current_user_department_id())))));


--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: event_notifications notifications_own_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY notifications_own_policy ON hr_public.event_notifications USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: payroll_records; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.payroll_records ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_reviews; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.performance_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences preferences_own_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY preferences_own_policy ON hr_public.notification_preferences USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: review_templates; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.review_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: rollback_requests; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.rollback_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: rollback_requests super_admin_all_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY super_admin_all_requests ON hr_public.rollback_requests FOR SELECT USING ((current_setting('app.current_role'::text, true) = 'super_admin'::text));


--
-- Name: rollback_requests super_admin_update_requests; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY super_admin_update_requests ON hr_public.rollback_requests FOR UPDATE USING ((current_setting('app.current_role'::text, true) = 'super_admin'::text));


--
-- Name: task_assignees; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.task_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: task_assignees task_assignees_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY task_assignees_policy ON hr_public.task_assignees USING (((task_id IN ( SELECT tasks.id
   FROM hr_public.tasks
  WHERE (tasks.created_by = (current_setting('app.current_user_id'::text, true))::uuid))) OR (user_id = (current_setting('app.current_user_id'::text, true))::uuid)));


--
-- Name: task_audit_entries; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.task_audit_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: task_dependencies; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.task_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_insert_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY tasks_insert_policy ON hr_public.tasks FOR INSERT WITH CHECK ((created_by = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- Name: tasks tasks_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY tasks_select_policy ON hr_public.tasks FOR SELECT USING (((created_by = (current_setting('app.current_user_id'::text, true))::uuid) OR (assignee_id = (current_setting('app.current_user_id'::text, true))::uuid) OR (id IN ( SELECT task_assignees.task_id
   FROM hr_public.task_assignees
  WHERE (task_assignees.user_id = (current_setting('app.current_user_id'::text, true))::uuid))) OR (department_id IN ( SELECT users.department_id
   FROM hr_public.users
  WHERE (users.id = (current_setting('app.current_user_id'::text, true))::uuid)))));


--
-- Name: tasks tasks_update_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY tasks_update_policy ON hr_public.tasks FOR UPDATE USING (((created_by = (current_setting('app.current_user_id'::text, true))::uuid) OR (assignee_id = (current_setting('app.current_user_id'::text, true))::uuid) OR (id IN ( SELECT task_assignees.task_id
   FROM hr_public.task_assignees
  WHERE (task_assignees.user_id = (current_setting('app.current_user_id'::text, true))::uuid)))));


--
-- Name: time_off_balances; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.time_off_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: time_off_policies; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.time_off_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: user_role_assignments; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.user_role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: postgraphile_watch_ddl; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER postgraphile_watch_ddl ON ddl_command_end
         WHEN TAG IN ('ALTER AGGREGATE', 'ALTER DOMAIN', 'ALTER EXTENSION', 'ALTER FOREIGN TABLE', 'ALTER FUNCTION', 'ALTER POLICY', 'ALTER SCHEMA', 'ALTER TABLE', 'ALTER TYPE', 'ALTER VIEW', 'COMMENT', 'CREATE AGGREGATE', 'CREATE DOMAIN', 'CREATE EXTENSION', 'CREATE FOREIGN TABLE', 'CREATE FUNCTION', 'CREATE INDEX', 'CREATE POLICY', 'CREATE RULE', 'CREATE SCHEMA', 'CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'DROP AGGREGATE', 'DROP DOMAIN', 'DROP EXTENSION', 'DROP FOREIGN TABLE', 'DROP FUNCTION', 'DROP INDEX', 'DROP OWNED', 'DROP POLICY', 'DROP RULE', 'DROP SCHEMA', 'DROP TABLE', 'DROP TYPE', 'DROP VIEW', 'GRANT', 'REVOKE', 'SELECT INTO')
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_ddl();


--
-- Name: postgraphile_watch_drop; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER postgraphile_watch_drop ON sql_drop
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_drop();


--
-- PostgreSQL database dump complete
--

\unrestrict nVdwgbbJOChqVdSJ46aSvaH7jHPkL029UAFAk13O64VzBYCJcZHZLI5HBLtznY2

