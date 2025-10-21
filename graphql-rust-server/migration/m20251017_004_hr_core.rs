//! Migration: HR Core tables
//!
//! Creates tables for:
//! - departments
//! - leave_types
//! - time_off_policies
//!
//! Also adds the circular FK from users.department_id -> departments.id

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create departments table (manager_id FK to users will be added after)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Departments::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Departments::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Departments::Name).string().not_null())
                    .col(ColumnDef::new(Departments::Description).string())
                    .col(ColumnDef::new(Departments::ParentDepartmentId).uuid())
                    .col(ColumnDef::new(Departments::ManagerId).uuid())
                    .col(
                        ColumnDef::new(Departments::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Departments::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Departments::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Self-referential FK for parent_department_id
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_departments_parent_department_id")
                    .from((Schema::HrPublic, Departments::Table), Departments::ParentDepartmentId)
                    .to((Schema::HrPublic, Departments::Table), Departments::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // FK from departments.manager_id -> users.id
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_departments_manager_id")
                    .from((Schema::HrPublic, Departments::Table), Departments::ManagerId)
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // Now add the FK from users.department_id -> departments.id (circular dependency resolved)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_users_department_id")
                    .from((Schema::HrPublic, Users::Table), Users::DepartmentId)
                    .to((Schema::HrPublic, Departments::Table), Departments::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // Create indexes for departments
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_departments_name")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::Name)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_departments_manager_id")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::ManagerId)
                    .to_owned(),
            )
            .await?;

        // Create leave_types table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, LeaveTypes::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(LeaveTypes::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(LeaveTypes::Name).string().not_null())
                    .col(ColumnDef::new(LeaveTypes::Description).string())
                    .col(
                        ColumnDef::new(LeaveTypes::DefaultDays)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(LeaveTypes::RequiresApproval)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(LeaveTypes::IsPaid)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(LeaveTypes::Color).string())
                    .col(
                        ColumnDef::new(LeaveTypes::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(LeaveTypes::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(LeaveTypes::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Create time_off_policies table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TimeOffPolicies::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TimeOffPolicies::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(TimeOffPolicies::Name).string().not_null())
                    .col(ColumnDef::new(TimeOffPolicies::Description).string())
                    .col(ColumnDef::new(TimeOffPolicies::LeaveTypeId).uuid().not_null())
                    .col(
                        ColumnDef::new(TimeOffPolicies::AccrualRate)
                            .decimal()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(TimeOffPolicies::MaxCarryOver)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(TimeOffPolicies::MinimumHoursPerRequest)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(
                        ColumnDef::new(TimeOffPolicies::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TimeOffPolicies::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(TimeOffPolicies::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_time_off_policies_leave_type_id")
                            .from((Schema::HrPublic, TimeOffPolicies::Table), TimeOffPolicies::LeaveTypeId)
                            .to((Schema::HrPublic, LeaveTypes::Table), LeaveTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop FK from users to departments first
        manager
            .drop_foreign_key(
                ForeignKey::drop()
                    .name("fk_users_department_id")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, TimeOffPolicies::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, LeaveTypes::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Departments::Table)).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Departments {
    Table,
    Id,
    Name,
    Description,
    ParentDepartmentId,
    ManagerId,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    DepartmentId,
    Id,
}

#[derive(Iden)]
enum LeaveTypes {
    Table,
    Id,
    Name,
    Description,
    DefaultDays,
    RequiresApproval,
    IsPaid,
    Color,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum TimeOffPolicies {
    Table,
    Id,
    Name,
    Description,
    LeaveTypeId,
    AccrualRate,
    MaxCarryOver,
    MinimumHoursPerRequest,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
