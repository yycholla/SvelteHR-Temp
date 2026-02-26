//! # Create Validation Rules and Failures Tracking System
//!
//! This migration creates a comprehensive validation framework with two tables:
//! - validation_rules: Defines entity validation rules with auto-fix strategies
//! - validation_failures: Tracks validation failures and their resolutions
//!
//! Enables configurable, trackable, and auditable data quality management across
//! all HR entities (employees, departments, documents, etc.).
//!
//! ## SeaORM Builder Usage
//! **Conversion: 100% SeaORM Builders (pure table creation)**
//! - Uses SeaORM Table::create() with if_not_exists() guards
//! - Uses SeaORM Index::create() with if_not_exists() guards
//! - Uses SeaORM ForeignKey::create() for referential integrity
//! - Uses SeaORM Table::drop() with if_exists() guards
//!
//! ## Operations Summary
//!
//! ### validation_rules Table (14 columns):
//! 1. **id** (UUID, PRIMARY KEY) - Unique rule identifier
//! 2. **name** (VARCHAR(255), NOT NULL) - Rule name (e.g., "email_format_check")
//! 3. **description** (TEXT, nullable) - Human-readable rule explanation
//! 4. **entity_type** (VARCHAR(50), NOT NULL) - Entity: "employee", "department", etc.
//! 5. **field_name** (VARCHAR(100), NOT NULL) - Field to validate (e.g., "email")
//! 6. **rule_type** (VARCHAR(50), NOT NULL) - Type: "format", "range", "required", etc.
//! 7. **condition** (TEXT, NOT NULL) - Validation expression (SQL, regex, JSON)
//! 8. **severity** (VARCHAR(20), NOT NULL, DEFAULT 'ERROR') - "ERROR", "WARNING", "INFO"
//! 9. **auto_fix_strategy** (VARCHAR(50), NOT NULL, DEFAULT 'None') - Fix strategy
//! 10. **enabled** (BOOLEAN, NOT NULL, DEFAULT true) - Rule active flag
//! 11. **created_by** (UUID, nullable) - User who created rule
//! 12. **created_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Creation timestamp
//! 13. **updated_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Last update timestamp
//!
//! ### validation_failures Table (11 columns):
//! 1. **id** (UUID, PRIMARY KEY) - Unique failure identifier
//! 2. **rule_id** (UUID, NOT NULL, FK) - Reference to validation_rules
//! 3. **entity_type** (VARCHAR(50), NOT NULL) - Entity type
//! 4. **entity_id** (VARCHAR(255), nullable) - Entity UUID as string
//! 5. **field_name** (VARCHAR(100), NOT NULL) - Field that failed validation
//! 6. **invalid_value** (TEXT, nullable) - The invalid value (for audit)
//! 7. **error_message** (TEXT, NOT NULL) - Human-readable error
//! 8. **severity** (VARCHAR(20), NOT NULL, DEFAULT 'ERROR') - Inherited from rule
//! 9. **detected_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Detection timestamp
//! 10. **resolved_at** (TIMESTAMPTZ, nullable) - Resolution timestamp
//! 11. **resolution** (VARCHAR(50), nullable) - How resolved: "fixed", "ignored", etc.
//!
//! ### Indexes (5 total):
//! 1. **idx_validation_rules_entity_enabled** - Find active rules for entity type
//! 2. **idx_validation_failures_entity** - Find failures by entity
//! 3. **idx_validation_failures_detected_at** - Time-based failure queries
//! 4. **idx_validation_failures_resolved** - Find unresolved failures
//!
//! ## Migration Strategy
//! - **Pure SeaORM**: 100% using SeaORM table/index builders
//! - **Idempotent**: All operations use IF NOT EXISTS/IF EXISTS guards
//! - **Foreign Keys**: CASCADE on delete (failures removed with rules)
//! - **Defaults**: Sensible defaults for severity, enabled, timestamps
//! - **Nullable Fields**: Optional metadata (description, entity_id, resolution)
//!
//! ## Validation Workflow Examples
//!
//! ### Define Email Format Rule:
//! ```sql
//! INSERT INTO validation_rules (id, name, entity_type, field_name, rule_type, condition, severity)
//! VALUES (
//!   gen_random_uuid(),
//!   'email_format_check',
//!   'employee',
//!   'email',
//!   'format',
//!   '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
//!   'ERROR'
//! );
//! ```
//!
//! ### Record Validation Failure:
//! ```sql
//! INSERT INTO validation_failures (id, rule_id, entity_type, entity_id, field_name, invalid_value, error_message)
//! VALUES (
//!   gen_random_uuid(),
//!   '<rule_id>',
//!   'employee',
//!   '<employee_id>',
//!   'email',
//!   'invalid-email',
//!   'Email format invalid: missing @ symbol'
//! );
//! ```
//!
//! ### Find Unresolved Failures:
//! ```sql
//! SELECT * FROM validation_failures
//! WHERE resolved_at IS NULL
//! ORDER BY detected_at DESC;
//! ```
//!
//! ### Resolve Failure:
//! ```sql
//! UPDATE validation_failures
//! SET resolved_at = NOW(),
//!     resolution = 'fixed'
//! WHERE id = '<failure_id>';
//! ```
//!
//! ## Rule Types
//! - **format**: Regex or pattern matching (emails, phone numbers)
//! - **range**: Numeric or date range validation
//! - **required**: NOT NULL enforcement
//! - **unique**: Uniqueness validation (with scope)
//! - **reference**: Foreign key / relationship validation
//! - **custom**: Custom SQL or application logic
//!
//! ## Severity Levels
//! - **ERROR**: Blocks operations, requires fix
//! - **WARNING**: Allows operations, suggests fix
//! - **INFO**: Informational, no action required
//!
//! ## Auto-Fix Strategies
//! - **None**: No automatic fix, manual intervention required
//! - **Trim**: Trim whitespace
//! - **Lowercase**: Convert to lowercase
//! - **RemoveInvalid**: Remove invalid characters
//! - **SetDefault**: Use default value
//! - **Custom**: Application-specific fix logic
//!
//! ## Resolution Types
//! - **fixed**: Data corrected, validation now passes
//! - **ignored**: Marked as false positive
//! - **waived**: Approved exception
//! - **auto_fixed**: Automatically corrected by system
//! - **migrated**: Issue no longer relevant (schema change)
//!
//! ## Use Cases
//! - **Data Quality**: Track and fix data quality issues
//! - **QuickBooks Sync**: Validate data before sync to prevent errors
//! - **Import Validation**: Validate CSV imports against rules
//! - **Migration Safety**: Validate data before/after migrations
//! - **Compliance**: Ensure data meets regulatory requirements
//! - **Audit Trail**: Track when/how validation issues were resolved
//!
//! ## Related Migrations
//! - m20251226_002_enforce_email_rules: Database-level email validation
//! - m20251226_003_enforce_department_names: Database-level name validation
//! - m20251229_004_incremental_sync: Uses validation before sync
//!
//! ## Performance Impact
//! - **5 New Indexes**: Fast lookups by entity, time, resolution status
//! - **Foreign Key**: Cascading deletes (minimal overhead)
//! - **JSONB-Ready**: condition field can store complex validation logic
//! - **Query Performance**: Composite indexes for common patterns

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema creation: validation_rules table
        // Stores configurable validation rules for all entity types
        manager
            .create_table(
                Table::create()
                    .table(ValidationRules::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ValidationRules::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ValidationRules::Name)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(ColumnDef::new(ValidationRules::Description).text())
                    .col(
                        ColumnDef::new(ValidationRules::EntityType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ValidationRules::FieldName)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ValidationRules::RuleType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(ColumnDef::new(ValidationRules::Condition).text().not_null())
                    .col(
                        ColumnDef::new(ValidationRules::Severity)
                            .string_len(20)
                            .not_null()
                            .default("ERROR"),
                    )
                    .col(
                        ColumnDef::new(ValidationRules::AutoFixStrategy)
                            .string_len(50)
                            .not_null()
                            .default("None"),
                    )
                    .col(
                        ColumnDef::new(ValidationRules::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(ValidationRules::CreatedBy).uuid().null())
                    .col(
                        ColumnDef::new(ValidationRules::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ValidationRules::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Performance index: Find active rules for specific entity type
        // Common query: SELECT * FROM validation_rules WHERE entity_type = ? AND enabled = true
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_validation_rules_entity_enabled")
                    .table(ValidationRules::Table)
                    .col(ValidationRules::EntityType)
                    .col(ValidationRules::Enabled)
                    .to_owned(),
            )
            .await?;

        // Schema creation: validation_failures table
        // Tracks validation failures with audit trail and resolution status
        manager
            .create_table(
                Table::create()
                    .table(ValidationFailures::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ValidationFailures::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ValidationFailures::RuleId).uuid().not_null())
                    .col(
                        ColumnDef::new(ValidationFailures::EntityType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ValidationFailures::EntityId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ValidationFailures::FieldName)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(ColumnDef::new(ValidationFailures::InvalidValue).text())
                    .col(
                        ColumnDef::new(ValidationFailures::ErrorMessage)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ValidationFailures::Severity)
                            .string_len(20)
                            .not_null()
                            .default("ERROR"),
                    )
                    .col(
                        ColumnDef::new(ValidationFailures::DetectedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ValidationFailures::ResolvedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ValidationFailures::Resolution)
                            .string_len(50)
                            .null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_validation_failures_rule_id")
                            .from(ValidationFailures::Table, ValidationFailures::RuleId)
                            .to(ValidationRules::Table, ValidationRules::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Performance index: Find failures by entity (composite key)
        // Common query: SELECT * FROM validation_failures WHERE entity_type = ? AND entity_id = ?
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_validation_failures_entity")
                    .table(ValidationFailures::Table)
                    .col(ValidationFailures::EntityType)
                    .col(ValidationFailures::EntityId)
                    .to_owned(),
            )
            .await?;

        // Performance index: Time-based failure queries (recent failures first)
        // Common query: SELECT * FROM validation_failures ORDER BY detected_at DESC
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_validation_failures_detected_at")
                    .table(ValidationFailures::Table)
                    .col(ValidationFailures::DetectedAt)
                    .to_owned(),
            )
            .await?;

        // Performance index: Find unresolved failures (WHERE resolved_at IS NULL)
        // Common query: SELECT * FROM validation_failures WHERE resolved_at IS NULL
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_validation_failures_resolved")
                    .table(ValidationFailures::Table)
                    .col(ValidationFailures::ResolvedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop validation_failures table first (has foreign key to validation_rules)
        // Uses if_exists guard for idempotent rollback
        manager
            .drop_table(
                Table::drop()
                    .table(ValidationFailures::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Cleanup: Drop validation_rules table
        // Uses if_exists guard for idempotent rollback
        manager
            .drop_table(
                Table::drop()
                    .table(ValidationRules::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum ValidationRules {
    Table,
    Id,
    Name,
    Description,
    EntityType,
    FieldName,
    RuleType,
    Condition,
    Severity,
    AutoFixStrategy,
    Enabled,
    CreatedBy,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ValidationFailures {
    Table,
    Id,
    RuleId,
    EntityType,
    EntityId,
    FieldName,
    InvalidValue,
    ErrorMessage,
    Severity,
    DetectedAt,
    ResolvedAt,
    Resolution,
}
