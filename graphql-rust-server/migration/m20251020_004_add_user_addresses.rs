//! Add user_addresses table for normalized address management
//!
//! Creates a separate table for user addresses following industry best practices:
//! - Supports multiple addresses per user (home, work, mailing, billing)
//! - Primary address constraint (one primary per user)
//! - Full address fields with optional geolocation
//! - Soft delete support
//! - Proper indexing for performance

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create user_addresses table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserAddresses::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::AddressType)
                            .string_len(50)
                            .not_null()
                            .default("home"),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::IsPrimary)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::AddressLine1)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::AddressLine2)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::City)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::StateProvince)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::PostalCode)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::Country)
                            .string_len(100)
                            .not_null()
                            .default("USA"),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::Latitude)
                            .decimal_len(10, 8)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::Longitude)
                            .decimal_len(11, 8)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::DeletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_addresses_user_id")
                            .from((Schema::HrPublic, UserAddresses::Table), UserAddresses::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on user_id for efficient lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_user_addresses_user_id")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .col(UserAddresses::UserId)
                    .to_owned(),
            )
            .await?;

        // Create index on address_type for filtering
        manager
            .create_index(
                Index::create()
                    .name("idx_user_addresses_address_type")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .col(UserAddresses::AddressType)
                    .to_owned(),
            )
            .await?;

        // Create partial index for primary addresses
        manager
            .create_index(
                Index::create()
                    .name("idx_user_addresses_primary")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .col(UserAddresses::UserId)
                    .col(UserAddresses::IsPrimary)
                    .to_owned(),
            )
            .await?;

        // Add UNIQUE partial index to ensure only one primary address per user
        // This is more efficient than EXCLUDE constraint and doesn't require btree_gist extension
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE UNIQUE INDEX user_addresses_one_primary_per_user
                ON hr_public.user_addresses (user_id)
                WHERE (is_primary = true AND deleted_at IS NULL)
                "#,
            )
            .await?;

        // Create comment on table
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                COMMENT ON TABLE hr_public.user_addresses IS
                'User addresses with support for multiple address types and primary designation'
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_addresses_primary")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_addresses_address_type")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_addresses_user_id")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .to_owned(),
            )
            .await?;

        // Drop the unique partial index
        manager
            .drop_index(
                Index::drop()
                    .name("user_addresses_one_primary_per_user")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .to_owned(),
            )
            .await?;

        // Drop table
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

/// Schema identifier
#[derive(Iden)]
enum Schema {
    HrPublic,
}

/// UserAddresses table columns
#[derive(Iden)]
enum UserAddresses {
    Table,
    Id,
    UserId,
    AddressType,
    IsPrimary,
    AddressLine1,
    AddressLine2,
    City,
    StateProvince,
    PostalCode,
    Country,
    Latitude,
    Longitude,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

/// Users table reference
#[derive(Iden)]
enum Users {
    Table,
    Id,
}
