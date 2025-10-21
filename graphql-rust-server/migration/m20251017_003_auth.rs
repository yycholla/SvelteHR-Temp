//! Migration: Authentication and RBAC tables
//!
//! Creates tables for:
//! - users (with FK to departments created in next migration - will be added later)
//! - roles
//! - permissions
//! - role_permissions (join table)
//! - user_role_assignments
//! - sessions
//! - user_sessions

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create users table (department_id FK will be added in m20251017_004_hr_core after departments table exists)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Users::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Users::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(Users::Email)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Users::PasswordHash).string().not_null())
                    .col(ColumnDef::new(Users::FirstName).string().not_null())
                    .col(ColumnDef::new(Users::LastName).string().not_null())
                    .col(
                        ColumnDef::new(Users::DisplayName)
                            .string()
                            .not_null()
                            .extra("GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED"),
                    )
                    .col(
                        ColumnDef::new(Users::FullName)
                            .string()
                            .not_null()
                            .extra("GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED"),
                    )
                    .col(
                        ColumnDef::new(Users::Role)
                            .string()
                            .not_null()
                            .default("employee"),
                    )
                    .col(ColumnDef::new(Users::PhoneNumber).string())
                    .col(ColumnDef::new(Users::AlternatePhone).string())
                    .col(ColumnDef::new(Users::JobTitle).string())
                    .col(ColumnDef::new(Users::Status).string())
                    .col(ColumnDef::new(Users::DepartmentId).uuid())
                    .col(ColumnDef::new(Users::ManagerId).uuid())
                    .col(ColumnDef::new(Users::HireDate).timestamp_with_time_zone())
                    .col(ColumnDef::new(Users::TerminationDate).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Users::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Users::FailedLoginAttempts)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(Users::LockedUntil).timestamp_with_time_zone())
                    .col(ColumnDef::new(Users::LastLogin).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Users::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Users::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Users::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Self-referential FK for manager_id
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_users_manager_id")
                    .from((Schema::HrPublic, Users::Table), Users::ManagerId)
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // Create indexes for users
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_email")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::Email)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_department_id")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::DepartmentId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_manager_id")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::ManagerId)
                    .to_owned(),
            )
            .await?;

        // Partial index for active users
        manager
            .get_connection()
            .execute_unprepared("CREATE INDEX idx_users_active ON hr_public.users(is_active) WHERE deleted_at IS NULL")
            .await?;

        // Create roles table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Roles::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Roles::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(Roles::Name)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Roles::Description).string())
                    .col(
                        ColumnDef::new(Roles::Level)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Roles::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Roles::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Roles::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Create permissions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Permissions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Permissions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Permissions::Resource).string().not_null())
                    .col(ColumnDef::new(Permissions::Action).string().not_null())
                    .col(ColumnDef::new(Permissions::Description).string())
                    .col(
                        ColumnDef::new(Permissions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Permissions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Permissions::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (resource, action)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_permissions_resource_action")
                    .table((Schema::HrPublic, Permissions::Table))
                    .col(Permissions::Resource)
                    .col(Permissions::Action)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create role_permissions join table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, RolePermissions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RolePermissions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(RolePermissions::RoleId).uuid().not_null())
                    .col(ColumnDef::new(RolePermissions::PermissionId).uuid().not_null())
                    .col(
                        ColumnDef::new(RolePermissions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(RolePermissions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(RolePermissions::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_role_permissions_role_id")
                            .from((Schema::HrPublic, RolePermissions::Table), RolePermissions::RoleId)
                            .to((Schema::HrPublic, Roles::Table), Roles::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_role_permissions_permission_id")
                            .from((Schema::HrPublic, RolePermissions::Table), RolePermissions::PermissionId)
                            .to((Schema::HrPublic, Permissions::Table), Permissions::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (role_id, permission_id)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_role_permissions_role_permission")
                    .table((Schema::HrPublic, RolePermissions::Table))
                    .col(RolePermissions::RoleId)
                    .col(RolePermissions::PermissionId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create user_role_assignments table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, UserRoleAssignments::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserRoleAssignments::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(UserRoleAssignments::UserId).uuid().not_null())
                    .col(ColumnDef::new(UserRoleAssignments::RoleId).uuid().not_null())
                    .col(
                        ColumnDef::new(UserRoleAssignments::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserRoleAssignments::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(UserRoleAssignments::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_role_assignments_user_id")
                            .from((Schema::HrPublic, UserRoleAssignments::Table), UserRoleAssignments::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_role_assignments_role_id")
                            .from((Schema::HrPublic, UserRoleAssignments::Table), UserRoleAssignments::RoleId)
                            .to((Schema::HrPublic, Roles::Table), Roles::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (user_id, role_id)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_user_role_assignments_user_role")
                    .table((Schema::HrPublic, UserRoleAssignments::Table))
                    .col(UserRoleAssignments::UserId)
                    .col(UserRoleAssignments::RoleId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create sessions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Sessions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Sessions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Sessions::SessionToken).string().not_null().unique_key())
                    .col(ColumnDef::new(Sessions::ExpiresAt).timestamp_with_time_zone().not_null())
                    .col(
                        ColumnDef::new(Sessions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create user_sessions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, UserSessions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserSessions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(UserSessions::UserId).uuid().not_null())
                    .col(ColumnDef::new(UserSessions::SessionId).uuid().not_null())
                    .col(
                        ColumnDef::new(UserSessions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserSessions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_sessions_user_id")
                            .from((Schema::HrPublic, UserSessions::Table), UserSessions::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_sessions_session_id")
                            .from((Schema::HrPublic, UserSessions::Table), UserSessions::SessionId)
                            .to((Schema::HrPublic, Sessions::Table), Sessions::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, UserSessions::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Sessions::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, UserRoleAssignments::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, RolePermissions::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Permissions::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Roles::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Users::Table)).to_owned())
            .await?;

        Ok(())
    }
}

// Schema enum
#[derive(Iden)]
enum Schema {
    HrPublic,
}

// Table enums
#[derive(Iden)]
enum Users {
    Table,
    Id,
    Email,
    PasswordHash,
    FirstName,
    LastName,
    DisplayName,
    FullName,
    Role,
    PhoneNumber,
    AlternatePhone,
    JobTitle,
    Status,
    DepartmentId,
    ManagerId,
    HireDate,
    TerminationDate,
    IsActive,
    FailedLoginAttempts,
    LockedUntil,
    LastLogin,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum Roles {
    Table,
    Id,
    Name,
    Description,
    Level,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum Permissions {
    Table,
    Id,
    Resource,
    Action,
    Description,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum RolePermissions {
    Table,
    Id,
    RoleId,
    PermissionId,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum UserRoleAssignments {
    Table,
    Id,
    UserId,
    RoleId,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum Sessions {
    Table,
    Id,
    SessionToken,
    ExpiresAt,
    CreatedAt,
}

#[derive(Iden)]
enum UserSessions {
    Table,
    Id,
    UserId,
    SessionId,
    CreatedAt,
    UpdatedAt,
}
