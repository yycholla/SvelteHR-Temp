use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add intuit_department_id to departments table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Departments::Table))
                    .add_column(ColumnDef::new(Departments::IntuitDepartmentId).string())
                    .to_owned(),
            )
            .await?;

        // Create index on intuit_department_id
        manager
            .create_index(
                Index::create()
                    .name("idx_departments_intuit_department_id")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::IntuitDepartmentId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_departments_intuit_department_id")
                    .table((Schema::HrPublic, Departments::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Departments::Table))
                    .drop_column(Departments::IntuitDepartmentId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Departments {
    Table,
    IntuitDepartmentId,
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}
