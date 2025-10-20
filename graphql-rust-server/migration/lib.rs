//! SeaORM Migration Library
//!
//! Complete migration system for HR GraphQL server with comprehensive table creation.

pub use sea_orm_migration::prelude::*;

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
mod m20251020_004_add_user_addresses;
mod m20251020_005_add_user_theme_preference;

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
        ]
    }
}
