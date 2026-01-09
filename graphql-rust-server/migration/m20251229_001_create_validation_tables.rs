use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create validation_rules table
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
                    .col(
                        ColumnDef::new(ValidationRules::CreatedBy)
                            .uuid()
                            .null(),
                    )
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

        // Create index on entity_type and enabled
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

        // Create validation_failures table
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
                    .col(
                        ColumnDef::new(ValidationFailures::RuleId)
                            .uuid()
                            .not_null(),
                    )
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
                    .col(ColumnDef::new(ValidationFailures::ErrorMessage).text().not_null())
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

        // Create indexes on validation_failures
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
        manager
            .drop_table(Table::drop().table(ValidationFailures::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ValidationRules::Table).to_owned())
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
