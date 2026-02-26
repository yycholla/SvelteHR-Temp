//! Aligns sync_health_alerts table with SeaORM model expectations.
//!
//! Adds `entity_type` for per-entity alert scoping. Keeps existing `metadata`
//! column name in DB; model maps `metric_snapshot` -> `metadata`.

use sea_orm_migration::prelude::*;
use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.sync_health_alerts",
            "entity_type varchar(50) NULL",
        )
        .await?;

        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_sync_health_alerts_entity_type",
            "hr_public.sync_health_alerts",
            "entity_type",
        )
        .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        MigrationHelpers::drop_index_if_exists(manager, "idx_sync_health_alerts_entity_type")
            .await?;

        MigrationHelpers::drop_column_if_exists(
            manager,
            "hr_public.sync_health_alerts",
            "entity_type",
        )
        .await
    }
}
