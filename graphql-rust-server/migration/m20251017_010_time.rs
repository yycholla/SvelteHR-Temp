//! Migration: Time tracking and leave management tables

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // attendance_records
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, AttendanceRecords::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AttendanceRecords::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(AttendanceRecords::EmployeeId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(AttendanceRecords::Date).date().not_null())
                    .col(ColumnDef::new(AttendanceRecords::CheckIn).timestamp_with_time_zone())
                    .col(ColumnDef::new(AttendanceRecords::CheckOut).timestamp_with_time_zone())
                    .col(ColumnDef::new(AttendanceRecords::HoursWorked).decimal())
                    .col(
                        ColumnDef::new(AttendanceRecords::Status)
                            .string()
                            .not_null()
                            .default("present"),
                    )
                    .col(ColumnDef::new(AttendanceRecords::Notes).text())
                    .col(
                        ColumnDef::new(AttendanceRecords::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(AttendanceRecords::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(AttendanceRecords::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_attendance_records_employee_id")
                            .from(
                                (S::HrPublic, AttendanceRecords::Table),
                                AttendanceRecords::EmployeeId,
                            )
                            .to((S::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_attendance_records_employee_date")
                    .table((S::HrPublic, AttendanceRecords::Table))
                    .col(AttendanceRecords::EmployeeId)
                    .col(AttendanceRecords::Date)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // leave_balances
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, LeaveBalances::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(LeaveBalances::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(LeaveBalances::EmployeeId).uuid().not_null())
                    .col(ColumnDef::new(LeaveBalances::LeaveTypeId).uuid().not_null())
                    .col(
                        ColumnDef::new(LeaveBalances::TotalDays)
                            .decimal()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(LeaveBalances::UsedDays)
                            .decimal()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(LeaveBalances::RemainingDays)
                            .decimal()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(LeaveBalances::Year).integer().not_null())
                    .col(
                        ColumnDef::new(LeaveBalances::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(LeaveBalances::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(LeaveBalances::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_leave_balances_employee_id")
                            .from(
                                (S::HrPublic, LeaveBalances::Table),
                                LeaveBalances::EmployeeId,
                            )
                            .to((S::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_leave_balances_leave_type_id")
                            .from(
                                (S::HrPublic, LeaveBalances::Table),
                                LeaveBalances::LeaveTypeId,
                            )
                            .to((S::HrPublic, LeaveTypes::Table), LeaveTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_leave_balances_employee_type_year")
                    .table((S::HrPublic, LeaveBalances::Table))
                    .col(LeaveBalances::EmployeeId)
                    .col(LeaveBalances::LeaveTypeId)
                    .col(LeaveBalances::Year)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // leave_requests
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, LeaveRequests::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(LeaveRequests::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(LeaveRequests::EmployeeId).uuid().not_null())
                    .col(ColumnDef::new(LeaveRequests::LeaveTypeId).uuid().not_null())
                    .col(ColumnDef::new(LeaveRequests::StartDate).date().not_null())
                    .col(ColumnDef::new(LeaveRequests::EndDate).date().not_null())
                    .col(
                        ColumnDef::new(LeaveRequests::TotalDays)
                            .decimal()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(LeaveRequests::Status)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .col(ColumnDef::new(LeaveRequests::Reason).text())
                    .col(ColumnDef::new(LeaveRequests::ApprovedBy).uuid())
                    .col(ColumnDef::new(LeaveRequests::ApprovedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(LeaveRequests::RejectionReason).text())
                    .col(
                        ColumnDef::new(LeaveRequests::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(LeaveRequests::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(LeaveRequests::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_leave_requests_employee_id")
                            .from(
                                (S::HrPublic, LeaveRequests::Table),
                                LeaveRequests::EmployeeId,
                            )
                            .to((S::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_leave_requests_leave_type_id")
                            .from(
                                (S::HrPublic, LeaveRequests::Table),
                                LeaveRequests::LeaveTypeId,
                            )
                            .to((S::HrPublic, LeaveTypes::Table), LeaveTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_leave_requests_approved_by")
                            .from(
                                (S::HrPublic, LeaveRequests::Table),
                                LeaveRequests::ApprovedBy,
                            )
                            .to((S::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_leave_requests_employee_id")
                    .table((S::HrPublic, LeaveRequests::Table))
                    .col(LeaveRequests::EmployeeId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_leave_requests_status")
                    .table((S::HrPublic, LeaveRequests::Table))
                    .col(LeaveRequests::Status)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, LeaveRequests::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, LeaveBalances::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, AttendanceRecords::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum S {
    HrPublic,
}
#[derive(Iden)]
enum AttendanceRecords {
    Table,
    Id,
    EmployeeId,
    Date,
    CheckIn,
    CheckOut,
    HoursWorked,
    Status,
    Notes,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum LeaveBalances {
    Table,
    Id,
    EmployeeId,
    LeaveTypeId,
    TotalDays,
    UsedDays,
    RemainingDays,
    Year,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum LeaveRequests {
    Table,
    Id,
    EmployeeId,
    LeaveTypeId,
    StartDate,
    EndDate,
    TotalDays,
    Status,
    Reason,
    ApprovedBy,
    ApprovedAt,
    RejectionReason,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum Users {
    Table,
    Id,
}
#[derive(Iden)]
enum LeaveTypes {
    Table,
    Id,
}
