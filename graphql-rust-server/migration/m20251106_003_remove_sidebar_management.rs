//! Migration: Remove sidebar management tables
//!
//! Permanently removes sidebar_layouts, sidebar_sections, and sidebar_items tables
//! as the sidebar management system is being replaced.
//!
//! ## SeaORM Builder Usage: 100% Converted
//!
//! ### Operations Using SeaORM Builders (3 operations):
//!
//! **Up Migration:**
//! 1. DROP TABLE IF EXISTS sidebar_layouts CASCADE ✓
//! 2. DROP TABLE IF EXISTS sidebar_sections CASCADE ✓
//! 3. DROP TABLE IF EXISTS sidebar_items CASCADE ✓
//!
//! All operations successfully converted from raw SQL to type-safe builders:
//! - `Table::drop()` - Drop table operation
//! - `.if_exists()` - Safe idempotent drop
//! - `.cascade()` - Drop dependent objects
//!
//! **Down Migration:**
//! Intentionally non-reversible - sidebar management is being permanently removed.
//! To restore, use the original sidebar creation migrations.
//!
//! ## Migration Type: Schema Cleanup
//!
//! This is a cleanup migration removing deprecated tables in reverse dependency order.
//! The CASCADE option ensures any remaining foreign keys are also dropped.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop sidebar tables in reverse dependency order
        // Using SeaORM builders with IF EXISTS for idempotency and CASCADE for dependencies

        // Drop sidebar_layouts (references sidebar_sections and sidebar_items)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, SidebarLayouts::Table))
                    .if_exists()
                    .cascade()
                    .to_owned(),
            )
            .await?;

        // Drop sidebar_sections
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, SidebarSections::Table))
                    .if_exists()
                    .cascade()
                    .to_owned(),
            )
            .await?;

        // Drop sidebar_items
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, SidebarItems::Table))
                    .if_exists()
                    .cascade()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // This migration is not reversible - sidebar management is being removed permanently
        // If you need to restore it, use the original migrations
        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum SidebarLayouts {
    Table,
}

#[derive(Iden)]
enum SidebarSections {
    Table,
}

#[derive(Iden)]
enum SidebarItems {
    Table,
}
