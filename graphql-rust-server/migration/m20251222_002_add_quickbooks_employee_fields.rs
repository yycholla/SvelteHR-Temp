use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add QuickBooks Employee fields to users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    // Employee number from QuickBooks (useful for payroll integration)
                    .add_column(
                        ColumnDef::new(Users::EmployeeNumber)
                            .string()
                            .null()
                    )
                    // Gender (optional - for demographics)
                    .add_column(
                        ColumnDef::new(Users::Gender)
                            .string()
                            .null()
                    )
                    // Address fields from QuickBooks
                    .add_column(
                        ColumnDef::new(Users::StreetAddress)
                            .string()
                            .null()
                    )
                    .add_column(
                        ColumnDef::new(Users::City)
                            .string()
                            .null()
                    )
                    .add_column(
                        ColumnDef::new(Users::State)
                            .string()
                            .null()
                    )
                    .add_column(
                        ColumnDef::new(Users::PostalCode)
                            .string()
                            .null()
                    )
                    .add_column(
                        ColumnDef::new(Users::Country)
                            .string()
                            .null()
                    )
                    // Billable time setting from QuickBooks
                    .add_column(
                        ColumnDef::new(Users::BillableTime)
                            .boolean()
                            .default(false)
                            .not_null()
                    )
                    // Organization/Department name from QuickBooks (in addition to department_id)
                    .add_column(
                        ColumnDef::new(Users::Organization)
                            .string()
                            .null()
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::EmployeeNumber)
                    .drop_column(Users::Gender)
                    .drop_column(Users::StreetAddress)
                    .drop_column(Users::City)
                    .drop_column(Users::State)
                    .drop_column(Users::PostalCode)
                    .drop_column(Users::Country)
                    .drop_column(Users::BillableTime)
                    .drop_column(Users::Organization)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    EmployeeNumber,
    Gender,
    StreetAddress,
    City,
    State,
    PostalCode,
    Country,
    BillableTime,
    Organization,
}
