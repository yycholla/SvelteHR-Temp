//! Migration: Create application_settings table for centralized system configuration
//!
//! This migration creates a singleton table for application-wide settings including:
//! - System configuration (name, timezone)
//! - Session management (timeout)
//! - Password policies (length, expiration)
//! - Security policies (HTTPS, CORS, CSP, HSTS)
//! - Logging configuration (frontend/backend log levels)
//!
//! ## SeaORM Builder Usage: 100% Converted (3/3 operations)
//!
//! All schema and data operations use SeaORM builders.
//!
//! ### Operations (SeaORM Builders - 3 operations):
//!
//! **Up Migration:**
//! 1. CREATE TABLE application_settings with 16 columns
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 16 columns: id (PK), system config, auth policies, security policies, logging, audit fields
//!    - PostgreSQL array type for cors_origins (TEXT[])
//!    - IF NOT EXISTS for idempotency
//!
//! 2. INSERT default row (singleton pattern)
//!    - Using: `manager.exec_stmt()` with Query::insert() builder
//!    - id = 1 (singleton constraint enforced in follow-up migration)
//!    - ON CONFLICT DO NOTHING for idempotency
//!
//! **Down Migration:**
//! 3. DROP TABLE application_settings
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!    - Removes entire settings table
//!
//! ### Migration Strategy
//!
//! This is a **schema creation migration** that:
//! - Establishes centralized configuration table (singleton pattern with id=1)
//! - Provides sensible defaults (UTC timezone, 60-min sessions, 12-char passwords)
//! - Enables progressive security hardening (all security features default to false/permissive)
//! - Seeds initial row for immediate use
//!
//! **Note:** CHECK constraint for singleton enforcement and foreign key to users table
//! will be added in a follow-up migration to maintain migration modularity.
//!
//! ## Migration Type: Pure Schema Creation (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for table creation
//! with default values, array types, and singleton pattern initialization.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, ApplicationSettings::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ApplicationSettings::Id)
                            .integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::SystemName)
                            .string_len(255)
                            .not_null()
                            .default("MoncuraHR"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::SystemTimezone)
                            .string_len(100)
                            .not_null()
                            .default("UTC"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::SessionTimeoutMinutes)
                            .integer()
                            .not_null()
                            .default(60),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::MinPasswordLength)
                            .integer()
                            .not_null()
                            .default(12),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::MaxLoginAttempts)
                            .integer()
                            .not_null()
                            .default(5),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::RequireMfa)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::PasswordExpirationEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::PasswordExpirationDays)
                            .integer()
                            .default(90),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::HttpsEnforced)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(ApplicationSettings::CspPolicy).text())
                    .col(
                        ColumnDef::new(ApplicationSettings::XFrameOptions)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::HstsEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(ApplicationSettings::CorsOrigins).array(ColumnType::Text))
                    .col(
                        ColumnDef::new(ApplicationSettings::LogLevelFrontend)
                            .string_len(20)
                            .not_null()
                            .default("INFO"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::LogLevelBackend)
                            .string_len(20)
                            .not_null()
                            .default("INFO"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ApplicationSettings::UpdatedBy).uuid())
                    .to_owned(),
            )
            .await?;

        // Note: CHECK constraint for singleton enforcement (id = 1) and
        // foreign key to users table will be added in a follow-up migration

        // Data seeding operation - Using SeaORM builder (Query::insert)
        // Insert default singleton row (id=1) with ON CONFLICT DO NOTHING for idempotency
        let insert = Query::insert()
            .into_table((Schema::HrPublic, ApplicationSettings::Table))
            .columns([ApplicationSettings::Id])
            .values_panic([1.into()])
            .on_conflict(
                OnConflict::column(ApplicationSettings::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .to_owned();

        manager.exec_stmt(insert).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, ApplicationSettings::Table))
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum ApplicationSettings {
    Table,
    Id,
    SystemName,
    SystemTimezone,
    SessionTimeoutMinutes,
    MinPasswordLength,
    MaxLoginAttempts,
    RequireMfa,
    PasswordExpirationEnabled,
    PasswordExpirationDays,
    HttpsEnforced,
    CspPolicy,
    XFrameOptions,
    HstsEnabled,
    CorsOrigins,
    LogLevelFrontend,
    LogLevelBackend,
    CreatedAt,
    UpdatedAt,
    UpdatedBy,
}
