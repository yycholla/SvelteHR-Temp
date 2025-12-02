use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Alter Trainings Table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column(ColumnDef::new(Trainings::MetaTitle).string().null())
                    .add_column(ColumnDef::new(Trainings::MetaDescription).string().null())
                    .add_column(ColumnDef::new(Trainings::Tags).array(ColumnType::Text).null())
                    .add_column(ColumnDef::new(Trainings::AuthorId).uuid().null())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column(Trainings::MetaTitle)
                    .drop_column(Trainings::MetaDescription)
                    .drop_column(Trainings::Tags)
                    .drop_column(Trainings::AuthorId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Trainings {
    Table,
    MetaTitle,
    MetaDescription,
    Tags,
    AuthorId,
}
