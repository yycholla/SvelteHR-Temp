use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(ColumnDef::new(Users::Nickname).string().null())
                    .add_column(ColumnDef::new(Users::SocialMediaRelease).boolean().default(false))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::Nickname)
                    .drop_column(Users::SocialMediaRelease)
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
    Nickname,
    SocialMediaRelease,
}