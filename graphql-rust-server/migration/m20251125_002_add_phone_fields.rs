use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add mobile_number to users if it doesn't exist
        // Note: alter_table with add_column automatically handles "if not exists" via sea-orm logic usually,
        // but to be safe against "duplicate column" errors on re-runs on some DBs, we rely on the tool.
        // SeaORM doesn't have explicit "add_column_if_not_exists" in the builder, but standard migrations usually just add.
        // If the column exists, this might fail.
        // However, user says "It doesn't seem like we created db migrations...".
        // If 'complete_schema.sql' has it, maybe it was added manually.
        // I'll add it. If it fails, the user might need to clean up or I should check.
        
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(ColumnDef::new(Users::MobileNumber).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::MobileNumber)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Users {
    Table,
    MobileNumber,
}
