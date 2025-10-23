//! Migration: Task management tables
//!
//! Creates tables for:
//! - task_types
//! - tasks
//! - task_assignees
//! - task_dependencies
//! - task_audit_entries

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create task_types table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TaskTypes::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TaskTypes::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(TaskTypes::Name).string().not_null())
                    .col(ColumnDef::new(TaskTypes::Description).string())
                    .col(ColumnDef::new(TaskTypes::DefaultPriority).string())
                    .col(ColumnDef::new(TaskTypes::ColorCode).string())
                    .col(
                        ColumnDef::new(TaskTypes::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(TaskTypes::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TaskTypes::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create tasks table with all fields from task.rs model
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Tasks::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Tasks::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Tasks::Title).string().not_null())
                    .col(ColumnDef::new(Tasks::Description).text())
                    .col(ColumnDef::new(Tasks::TaskTypeId).uuid())
                    .col(
                        ColumnDef::new(Tasks::Status)
                            .string()
                            .not_null()
                            .default("todo"),
                    )
                    .col(
                        ColumnDef::new(Tasks::Priority)
                            .string()
                            .not_null()
                            .default("medium"),
                    )
                    .col(ColumnDef::new(Tasks::DueDate).timestamp_with_time_zone())
                    .col(ColumnDef::new(Tasks::CompletedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Tasks::EstimatedHours).integer())
                    .col(ColumnDef::new(Tasks::ActualHours).integer())
                    .col(ColumnDef::new(Tasks::Tags).array(ColumnType::Text))
                    .col(ColumnDef::new(Tasks::DepartmentId).uuid())
                    .col(ColumnDef::new(Tasks::CreatedBy).uuid().not_null())
                    .col(ColumnDef::new(Tasks::AssigneeId).uuid())
                    .col(ColumnDef::new(Tasks::ParentTaskId).uuid())
                    .col(
                        ColumnDef::new(Tasks::RequiresManualReassignment)
                            .boolean()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Tasks::Archived)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Tasks::ArchivedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Tasks::ArchivedBy).uuid())
                    .col(
                        ColumnDef::new(Tasks::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Tasks::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Tasks::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_task_type_id")
                            .from((Schema::HrPublic, Tasks::Table), Tasks::TaskTypeId)
                            .to((Schema::HrPublic, TaskTypes::Table), TaskTypes::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_department_id")
                            .from((Schema::HrPublic, Tasks::Table), Tasks::DepartmentId)
                            .to((Schema::HrPublic, Departments::Table), Departments::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_created_by")
                            .from((Schema::HrPublic, Tasks::Table), Tasks::CreatedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_assignee_id")
                            .from((Schema::HrPublic, Tasks::Table), Tasks::AssigneeId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_parent_task_id")
                            .from((Schema::HrPublic, Tasks::Table), Tasks::ParentTaskId)
                            .to((Schema::HrPublic, Tasks::Table), Tasks::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_archived_by")
                            .from((Schema::HrPublic, Tasks::Table), Tasks::ArchivedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for tasks
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_tasks_status")
                    .table((Schema::HrPublic, Tasks::Table))
                    .col(Tasks::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_tasks_assignee_id")
                    .table((Schema::HrPublic, Tasks::Table))
                    .col(Tasks::AssigneeId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_tasks_created_by")
                    .table((Schema::HrPublic, Tasks::Table))
                    .col(Tasks::CreatedBy)
                    .to_owned(),
            )
            .await?;

        // Partial index for active tasks
        manager
            .get_connection()
            .execute_unprepared("CREATE INDEX idx_tasks_active ON hr_public.tasks(status) WHERE deleted_at IS NULL AND archived = false")
            .await?;

        // Create task_assignees table (many-to-many)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TaskAssignees::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TaskAssignees::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(TaskAssignees::TaskId).uuid().not_null())
                    .col(ColumnDef::new(TaskAssignees::UserId).uuid().not_null())
                    .col(ColumnDef::new(TaskAssignees::AssignedBy).uuid().not_null())
                    .col(
                        ColumnDef::new(TaskAssignees::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TaskAssignees::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(TaskAssignees::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_assignees_task_id")
                            .from((Schema::HrPublic, TaskAssignees::Table), TaskAssignees::TaskId)
                            .to((Schema::HrPublic, Tasks::Table), Tasks::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_assignees_user_id")
                            .from((Schema::HrPublic, TaskAssignees::Table), TaskAssignees::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_assignees_assigned_by")
                            .from((Schema::HrPublic, TaskAssignees::Table), TaskAssignees::AssignedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (task_id, user_id)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_task_assignees_task_user")
                    .table((Schema::HrPublic, TaskAssignees::Table))
                    .col(TaskAssignees::TaskId)
                    .col(TaskAssignees::UserId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create task_dependencies table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TaskDependencies::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TaskDependencies::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(TaskDependencies::TaskId).uuid().not_null())
                    .col(ColumnDef::new(TaskDependencies::DependsOnTaskId).uuid().not_null())
                    .col(
                        ColumnDef::new(TaskDependencies::DependencyType)
                            .string()
                            .not_null()
                            .default("blocks"),
                    )
                    .col(
                        ColumnDef::new(TaskDependencies::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TaskDependencies::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(TaskDependencies::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_dependencies_task_id")
                            .from((Schema::HrPublic, TaskDependencies::Table), TaskDependencies::TaskId)
                            .to((Schema::HrPublic, Tasks::Table), Tasks::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_dependencies_depends_on_task_id")
                            .from((Schema::HrPublic, TaskDependencies::Table), TaskDependencies::DependsOnTaskId)
                            .to((Schema::HrPublic, Tasks::Table), Tasks::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (task_id, depends_on_task_id)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_task_dependencies_task_depends")
                    .table((Schema::HrPublic, TaskDependencies::Table))
                    .col(TaskDependencies::TaskId)
                    .col(TaskDependencies::DependsOnTaskId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create task_audit_entries table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TaskAuditEntries::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TaskAuditEntries::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(TaskAuditEntries::TaskId).uuid().not_null())
                    .col(ColumnDef::new(TaskAuditEntries::UserId).uuid().not_null())
                    .col(ColumnDef::new(TaskAuditEntries::Action).string().not_null())
                    .col(ColumnDef::new(TaskAuditEntries::FieldName).string())
                    .col(ColumnDef::new(TaskAuditEntries::OldValue).json())
                    .col(ColumnDef::new(TaskAuditEntries::NewValue).json())
                    .col(ColumnDef::new(TaskAuditEntries::Comment).text())
                    .col(
                        ColumnDef::new(TaskAuditEntries::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_audit_entries_task_id")
                            .from((Schema::HrPublic, TaskAuditEntries::Table), TaskAuditEntries::TaskId)
                            .to((Schema::HrPublic, Tasks::Table), Tasks::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_task_audit_entries_user_id")
                            .from((Schema::HrPublic, TaskAuditEntries::Table), TaskAuditEntries::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Create index for task audit entries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_task_audit_entries_task_id")
                    .table((Schema::HrPublic, TaskAuditEntries::Table))
                    .col(TaskAuditEntries::TaskId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, TaskAuditEntries::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, TaskDependencies::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, TaskAssignees::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Tasks::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, TaskTypes::Table)).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum TaskTypes {
    Table,
    Id,
    Name,
    Description,
    DefaultPriority,
    ColorCode,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Tasks {
    Table,
    Id,
    Title,
    Description,
    TaskTypeId,
    Status,
    Priority,
    DueDate,
    CompletedAt,
    EstimatedHours,
    ActualHours,
    Tags,
    DepartmentId,
    CreatedBy,
    AssigneeId,
    ParentTaskId,
    RequiresManualReassignment,
    Archived,
    ArchivedAt,
    ArchivedBy,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum TaskAssignees {
    Table,
    Id,
    TaskId,
    UserId,
    AssignedBy,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum TaskDependencies {
    Table,
    Id,
    TaskId,
    DependsOnTaskId,
    DependencyType,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum TaskAuditEntries {
    Table,
    Id,
    TaskId,
    UserId,
    Action,
    FieldName,
    OldValue,
    NewValue,
    Comment,
    CreatedAt,
}

#[derive(Iden)]
enum Departments {
    Table,
    Id,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
