//! SeaORM Migration Library
//!
//! Complete migration system for HR GraphQL server with comprehensive table creation.
// WARN!!!: Ensure to add migrations to main.rs as well.
pub use sea_orm_migration::prelude::*;

// Migration helper utilities for safe, idempotent migrations
pub mod migration_helpers;
pub mod migration_validator;

// Re-export commonly used items for convenience
pub use migration_helpers::MigrationHelpers;
pub use migration_validator::{
    IssueSeverity, MigrationValidator, ValidationIssue, ValidationReport, ValidationWarning,
};

// Migration modules - order determines execution sequence
mod m20251017_001_schemas;
mod m20251017_002_enums;
mod m20251017_003_auth;
mod m20251017_004_hr_core;
mod m20251017_005_tasks;
mod m20251017_006_events;
mod m20251017_007_documents;
mod m20251017_008_reviews;
mod m20251017_009_employee;
mod m20251017_010_time;
mod m20251017_011_system;
mod m20251017_012_seed;
mod m20251020_001_add_document_expiry_version;
mod m20251020_002_add_missing_permissions;
mod m20251020_003_add_teams_permissions;
pub mod m20251020_004_add_user_addresses;
pub mod m20251020_005_add_user_theme_preference;
pub mod m20251023_003_fix_encryption_keys;
mod m20251023_004_add_accessed_at_to_document_access_logs;
mod m20251024_001_fix_document_assignments_schema;
pub mod m20251024_002_add_employee_statistics;
pub mod m20251106_003_remove_sidebar_management;
pub mod m20251106_004_add_sidebar_view_permissions;
pub mod m20251106_005_assign_sidebar_permissions_to_roles;
pub mod m20251106_006_add_scoped_permissions;
pub mod m20251106_007_assign_scoped_permissions_to_roles;
pub mod m20251107_001_add_wildcard_permission;
pub mod m20251111_001_deprecate_users_role_column;
pub mod m20251111_002_create_system_settings;
pub mod m20251111_003_create_notification_channels;
pub mod m20251111_004_extend_users_for_auth_policies;
mod m20251118_001_add_force_password_change;
pub mod m20251118_002_fix_email_unique_constraint_for_soft_delete;
mod m20251125_001_employee_import_improvements;
mod m20251125_002_add_phone_fields;
mod m20251125_003_add_nickname_social;
mod m20251201_001_create_training_module;
mod m20251201_002_add_training_permissions;
mod m20251202_001_enhance_training_schema;
mod m20251202_003_add_training_recurrence;
mod m20251202_004_create_onboarding_module;
mod m20251202_005_seed_w4_form_template;
pub mod m20251202_006_integrate_onboarding_documents;
mod m20251202_007_create_onboarding_forms;
mod m20251203_001_migrate_content_blocks_to_forms;
pub mod m20251217_001_add_inline_form_elements;
pub mod m20251217_002_create_media_assets;
mod m20251222_create_intuit_integration;
mod m20251222_002_add_quickbooks_employee_fields;
mod m20251222_003_fix_display_name_add_preferred_name;
mod m20251223_001_add_intuit_department_id;
mod m20251226_001_add_sync_tracking;
mod m20251226_002_enhance_sync_log;
mod m20251226_002_enforce_email_rules;
mod m20251226_003_enforce_department_names;
mod m20251229_001_create_validation_tables;
mod m20251229_002_add_sync_permissions;
mod m20251229_003_seed_sync_role_permissions;
mod m20251229_004_incremental_sync;
mod m20251229_005_create_sync_health_monitoring;
mod m20251229_006_create_audit_trail;
mod m20251229_007_create_reconciliation;
mod m20251229_008_create_webhooks;
mod m20251229_009_create_batch_operations;
mod m20251229_010_create_rollback_system;
mod m20251229_011_create_error_recovery;
mod m20251229_012_enhance_audit_trail;
mod m20251229_013_create_compliance_reports;
mod m20251230_001_create_time_entries;
mod m20251230_002_payroll_integration;
mod m20251231_001_email_digests;
mod m20260101_001_create_sync_schedules;
mod m20260113_001_password_reset_tokens;
pub mod m20260205_001_add_department_ancestor_ids;
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20251017_001_schemas::Migration),
            Box::new(m20251017_002_enums::Migration),
            Box::new(m20251017_003_auth::Migration),
            Box::new(m20251017_004_hr_core::Migration),
            Box::new(m20251017_005_tasks::Migration),
            Box::new(m20251017_006_events::Migration),
            Box::new(m20251017_007_documents::Migration),
            Box::new(m20251017_008_reviews::Migration),
            Box::new(m20251017_009_employee::Migration),
            Box::new(m20251017_010_time::Migration),
            Box::new(m20251017_011_system::Migration),
            Box::new(m20251017_012_seed::Migration),
            Box::new(m20251020_001_add_document_expiry_version::Migration),
            Box::new(m20251020_002_add_missing_permissions::Migration),
            Box::new(m20251020_003_add_teams_permissions::Migration),
            Box::new(m20251020_004_add_user_addresses::Migration),
            Box::new(m20251020_005_add_user_theme_preference::Migration),
            Box::new(m20251023_003_fix_encryption_keys::Migration),
            Box::new(m20251023_004_add_accessed_at_to_document_access_logs::Migration),
            Box::new(m20251024_001_fix_document_assignments_schema::Migration),
            Box::new(m20251024_002_add_employee_statistics::Migration),
            Box::new(m20251106_003_remove_sidebar_management::Migration),
            Box::new(m20251106_004_add_sidebar_view_permissions::Migration),
            Box::new(m20251106_005_assign_sidebar_permissions_to_roles::Migration),
            Box::new(m20251106_006_add_scoped_permissions::Migration),
            Box::new(m20251106_007_assign_scoped_permissions_to_roles::Migration),
            Box::new(m20251107_001_add_wildcard_permission::Migration),
            Box::new(m20251111_001_deprecate_users_role_column::Migration),
            Box::new(m20251111_002_create_system_settings::Migration),
            Box::new(m20251111_003_create_notification_channels::Migration),
            Box::new(m20251111_004_extend_users_for_auth_policies::Migration),
            Box::new(m20251118_001_add_force_password_change::Migration),
            Box::new(m20251118_002_fix_email_unique_constraint_for_soft_delete::Migration),
            Box::new(m20251125_001_employee_import_improvements::Migration),
            Box::new(m20251125_002_add_phone_fields::Migration),
            Box::new(m20251125_003_add_nickname_social::Migration),
            Box::new(m20251201_001_create_training_module::Migration),
            Box::new(m20251201_002_add_training_permissions::Migration),
            Box::new(m20251202_001_enhance_training_schema::Migration),
            Box::new(m20251202_003_add_training_recurrence::Migration),
            Box::new(m20251202_004_create_onboarding_module::Migration),
            Box::new(m20251202_005_seed_w4_form_template::Migration),
            Box::new(m20251202_006_integrate_onboarding_documents::Migration),
            Box::new(m20251202_007_create_onboarding_forms::Migration),
            Box::new(m20251203_001_migrate_content_blocks_to_forms::Migration),
            Box::new(m20251217_001_add_inline_form_elements::Migration),
            Box::new(m20251217_002_create_media_assets::Migration),
            Box::new(m20251222_create_intuit_integration::Migration),
            Box::new(m20251222_002_add_quickbooks_employee_fields::Migration),
            Box::new(m20251222_003_fix_display_name_add_preferred_name::Migration),
            Box::new(m20251223_001_add_intuit_department_id::Migration),
            Box::new(m20251226_001_add_sync_tracking::Migration),
            Box::new(m20251226_002_enhance_sync_log::Migration),
            Box::new(m20251226_002_enforce_email_rules::Migration),
            Box::new(m20251226_003_enforce_department_names::Migration),
            Box::new(m20251229_001_create_validation_tables::Migration),
            Box::new(m20251229_002_add_sync_permissions::Migration),
            Box::new(m20251229_003_seed_sync_role_permissions::Migration),
            Box::new(m20251229_004_incremental_sync::Migration),
            Box::new(m20251229_005_create_sync_health_monitoring::Migration),
            Box::new(m20251229_006_create_audit_trail::Migration),
            Box::new(m20251229_007_create_reconciliation::Migration),
            Box::new(m20251229_008_create_webhooks::Migration),
            Box::new(m20251229_009_create_batch_operations::Migration),
            Box::new(m20251229_010_create_rollback_system::Migration),
            Box::new(m20251229_011_create_error_recovery::Migration),
            Box::new(m20251229_012_enhance_audit_trail::Migration),
            Box::new(m20251229_013_create_compliance_reports::Migration),
            Box::new(m20251230_001_create_time_entries::Migration),
            Box::new(m20251230_002_payroll_integration::Migration),
            Box::new(m20251231_001_email_digests::Migration),
            Box::new(m20260101_001_create_sync_schedules::Migration),
            Box::new(m20260113_001_password_reset_tokens::Migration),
            Box::new(m20260205_001_add_department_ancestor_ids::Migration),
        ]
    }
}
