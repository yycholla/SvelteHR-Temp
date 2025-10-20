//! Migration: System tables for audit, notifications, and settings

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // activity_logs
        manager.create_table(Table::create().table((S::HrPublic, ActivityLogs::Table)).if_not_exists()
            .col(ColumnDef::new(ActivityLogs::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(ActivityLogs::UserId).uuid().not_null())
            .col(ColumnDef::new(ActivityLogs::EmployeeId).uuid())
            .col(ColumnDef::new(ActivityLogs::Action).string().not_null())
            .col(ColumnDef::new(ActivityLogs::ResourceType).string().not_null())
            .col(ColumnDef::new(ActivityLogs::ResourceId).uuid())
            .col(ColumnDef::new(ActivityLogs::Details).json())
            .col(ColumnDef::new(ActivityLogs::BeforeSnapshot).json())
            .col(ColumnDef::new(ActivityLogs::AfterSnapshot).json())
            .col(ColumnDef::new(ActivityLogs::IsRollback).boolean().not_null().default(false))
            .col(ColumnDef::new(ActivityLogs::RolledBackLogId).uuid())
            .col(ColumnDef::new(ActivityLogs::IpAddress).string())
            .col(ColumnDef::new(ActivityLogs::UserAgent).string())
            .col(ColumnDef::new(ActivityLogs::SignatureId).uuid())
            .col(ColumnDef::new(ActivityLogs::BatchId).uuid())
            .col(ColumnDef::new(ActivityLogs::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .foreign_key(ForeignKey::create().name("fk_activity_logs_user_id").from((S::HrPublic, ActivityLogs::Table), ActivityLogs::UserId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::SetNull))
            .foreign_key(ForeignKey::create().name("fk_activity_logs_employee_id").from((S::HrPublic, ActivityLogs::Table), ActivityLogs::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::SetNull))
            .to_owned()).await?;

        // notifications
        manager.create_table(Table::create().table((S::HrPublic, Notifications::Table)).if_not_exists()
            .col(ColumnDef::new(Notifications::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(Notifications::UserId).uuid().not_null())
            .col(ColumnDef::new(Notifications::Type).string().not_null())
            .col(ColumnDef::new(Notifications::Title).string().not_null())
            .col(ColumnDef::new(Notifications::Message).text().not_null())
            .col(ColumnDef::new(Notifications::IsRead).boolean().not_null().default(false))
            .col(ColumnDef::new(Notifications::ReadAt).timestamp_with_time_zone())
            .col(ColumnDef::new(Notifications::RelatedEntityType).string())
            .col(ColumnDef::new(Notifications::RelatedEntityId).uuid())
            .col(ColumnDef::new(Notifications::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(Notifications::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_notifications_user_id").from((S::HrPublic, Notifications::Table), Notifications::UserId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        manager.create_index(Index::create().if_not_exists().name("idx_notifications_user_id").table((S::HrPublic, Notifications::Table)).col(Notifications::UserId).to_owned()).await?;

        // linked_resources
        manager.create_table(Table::create().table((S::HrPublic, LinkedResources::Table)).if_not_exists()
            .col(ColumnDef::new(LinkedResources::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(LinkedResources::ResourceType).string().not_null())
            .col(ColumnDef::new(LinkedResources::ResourceId).uuid().not_null())
            .col(ColumnDef::new(LinkedResources::LinkedType).string().not_null())
            .col(ColumnDef::new(LinkedResources::LinkedId).uuid().not_null())
            .col(ColumnDef::new(LinkedResources::CreatedBy).uuid().not_null())
            .col(ColumnDef::new(LinkedResources::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(LinkedResources::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_linked_resources_created_by").from((S::HrPublic, LinkedResources::Table), LinkedResources::CreatedBy).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // rollback_requests
        manager.create_table(Table::create().table((S::HrPublic, RollbackRequests::Table)).if_not_exists()
            .col(ColumnDef::new(RollbackRequests::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(RollbackRequests::EntityType).string().not_null())
            .col(ColumnDef::new(RollbackRequests::EntityId).uuid().not_null())
            .col(ColumnDef::new(RollbackRequests::RequestedBy).uuid().not_null())
            .col(ColumnDef::new(RollbackRequests::Reason).text().not_null())
            .col(ColumnDef::new(RollbackRequests::Status).string().not_null().default("pending"))
            .col(ColumnDef::new(RollbackRequests::ApprovedBy).uuid())
            .col(ColumnDef::new(RollbackRequests::ProcessedAt).timestamp_with_time_zone())
            .col(ColumnDef::new(RollbackRequests::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .foreign_key(ForeignKey::create().name("fk_rollback_requests_requested_by").from((S::HrPublic, RollbackRequests::Table), RollbackRequests::RequestedBy).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .foreign_key(ForeignKey::create().name("fk_rollback_requests_approved_by").from((S::HrPublic, RollbackRequests::Table), RollbackRequests::ApprovedBy).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::SetNull))
            .to_owned()).await?;

        // bulk_rollback_batches
        manager.create_table(Table::create().table((S::HrPublic, BulkRollbackBatches::Table)).if_not_exists()
            .col(ColumnDef::new(BulkRollbackBatches::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(BulkRollbackBatches::RequestedBy).uuid().not_null())
            .col(ColumnDef::new(BulkRollbackBatches::TotalItems).integer().not_null())
            .col(ColumnDef::new(BulkRollbackBatches::ProcessedItems).integer().not_null().default(0))
            .col(ColumnDef::new(BulkRollbackBatches::Status).string().not_null().default("pending"))
            .col(ColumnDef::new(BulkRollbackBatches::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(BulkRollbackBatches::CompletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_bulk_rollback_batches_requested_by").from((S::HrPublic, BulkRollbackBatches::Table), BulkRollbackBatches::RequestedBy).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // bulk_rollback_items
        manager.create_table(Table::create().table((S::HrPublic, BulkRollbackItems::Table)).if_not_exists()
            .col(ColumnDef::new(BulkRollbackItems::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(BulkRollbackItems::BatchId).uuid().not_null())
            .col(ColumnDef::new(BulkRollbackItems::EntityType).string().not_null())
            .col(ColumnDef::new(BulkRollbackItems::EntityId).uuid().not_null())
            .col(ColumnDef::new(BulkRollbackItems::Status).string().not_null().default("pending"))
            .col(ColumnDef::new(BulkRollbackItems::ErrorMessage).text())
            .col(ColumnDef::new(BulkRollbackItems::ProcessedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_bulk_rollback_items_batch_id").from((S::HrPublic, BulkRollbackItems::Table), BulkRollbackItems::BatchId).to((S::HrPublic, BulkRollbackBatches::Table), BulkRollbackBatches::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // payroll_records
        manager.create_table(Table::create().table((S::HrPublic, PayrollRecords::Table)).if_not_exists()
            .col(ColumnDef::new(PayrollRecords::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(PayrollRecords::EmployeeId).uuid().not_null())
            .col(ColumnDef::new(PayrollRecords::Period).string().not_null())
            .col(ColumnDef::new(PayrollRecords::GrossPay).decimal().not_null())
            .col(ColumnDef::new(PayrollRecords::NetPay).decimal().not_null())
            .col(ColumnDef::new(PayrollRecords::Deductions).json())
            .col(ColumnDef::new(PayrollRecords::ProcessedAt).timestamp_with_time_zone())
            .col(ColumnDef::new(PayrollRecords::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(PayrollRecords::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_payroll_records_employee_id").from((S::HrPublic, PayrollRecords::Table), PayrollRecords::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // compensation_bands
        manager.create_table(Table::create().table((S::HrPublic, CompensationBands::Table)).if_not_exists()
            .col(ColumnDef::new(CompensationBands::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(CompensationBands::Name).string().not_null())
            .col(ColumnDef::new(CompensationBands::MinSalary).decimal().not_null())
            .col(ColumnDef::new(CompensationBands::MaxSalary).decimal().not_null())
            .col(ColumnDef::new(CompensationBands::Currency).string().not_null().default("USD"))
            .col(ColumnDef::new(CompensationBands::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(CompensationBands::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(CompensationBands::DeletedAt).timestamp_with_time_zone())
            .to_owned()).await?;

        // hr_reports
        manager.create_table(Table::create().table((S::HrPublic, HrReports::Table)).if_not_exists()
            .col(ColumnDef::new(HrReports::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(HrReports::Title).string().not_null())
            .col(ColumnDef::new(HrReports::ReportType).string().not_null())
            .col(ColumnDef::new(HrReports::GeneratedBy).uuid().not_null())
            .col(ColumnDef::new(HrReports::Parameters).json())
            .col(ColumnDef::new(HrReports::FilePath).string())
            .col(ColumnDef::new(HrReports::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .foreign_key(ForeignKey::create().name("fk_hr_reports_generated_by").from((S::HrPublic, HrReports::Table), HrReports::GeneratedBy).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // encryption_keys
        manager.create_table(Table::create().table((S::HrPublic, EncryptionKeys::Table)).if_not_exists()
            .col(ColumnDef::new(EncryptionKeys::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(EncryptionKeys::KeyName).string().not_null().unique_key())
            .col(ColumnDef::new(EncryptionKeys::EncryptedKey).binary().not_null())
            .col(ColumnDef::new(EncryptionKeys::IsActive).boolean().not_null().default(true))
            .col(ColumnDef::new(EncryptionKeys::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EncryptionKeys::RotatedAt).timestamp_with_time_zone())
            .to_owned()).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table((S::HrPublic, EncryptionKeys::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, HrReports::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, CompensationBands::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, PayrollRecords::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, BulkRollbackItems::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, BulkRollbackBatches::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, RollbackRequests::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, LinkedResources::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, Notifications::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, ActivityLogs::Table)).to_owned()).await?;
        Ok(())
    }
}

#[derive(Iden)] enum S { HrPublic }
#[derive(Iden)] enum ActivityLogs { Table, Id, UserId, EmployeeId, Action, ResourceType, ResourceId, Details, BeforeSnapshot, AfterSnapshot, IsRollback, RolledBackLogId, IpAddress, UserAgent, SignatureId, BatchId, CreatedAt }
#[derive(Iden)] enum Notifications { Table, Id, UserId, Type, Title, Message, IsRead, ReadAt, RelatedEntityType, RelatedEntityId, CreatedAt, DeletedAt }
#[derive(Iden)] enum LinkedResources { Table, Id, ResourceType, ResourceId, LinkedType, LinkedId, CreatedBy, CreatedAt, DeletedAt }
#[derive(Iden)] enum RollbackRequests { Table, Id, EntityType, EntityId, RequestedBy, Reason, Status, ApprovedBy, ProcessedAt, CreatedAt }
#[derive(Iden)] enum BulkRollbackBatches { Table, Id, RequestedBy, TotalItems, ProcessedItems, Status, CreatedAt, CompletedAt }
#[derive(Iden)] enum BulkRollbackItems { Table, Id, BatchId, EntityType, EntityId, Status, ErrorMessage, ProcessedAt }
#[derive(Iden)] enum PayrollRecords { Table, Id, EmployeeId, Period, GrossPay, NetPay, Deductions, ProcessedAt, CreatedAt, DeletedAt }
#[derive(Iden)] enum CompensationBands { Table, Id, Name, MinSalary, MaxSalary, Currency, CreatedAt, UpdatedAt, DeletedAt }
#[derive(Iden)] enum HrReports { Table, Id, Title, ReportType, GeneratedBy, Parameters, FilePath, CreatedAt }
#[derive(Iden)] enum EncryptionKeys { Table, Id, KeyName, EncryptedKey, IsActive, CreatedAt, RotatedAt }
#[derive(Iden)] enum Users { Table, Id }
