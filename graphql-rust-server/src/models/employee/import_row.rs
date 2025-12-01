use async_graphql::{Enum, Object};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize, Enum)]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum ImportRowStatus {
    #[sea_orm(string_value = "PENDING")]
    Pending,
    #[sea_orm(string_value = "VALID")]
    Valid,
    #[sea_orm(string_value = "ERROR")]
    Error,
    #[sea_orm(string_value = "IMPORTED")]
    Imported,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_import_rows", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub job_id: Uuid,
    pub raw_data: Json,
    pub parsed_data: Option<Json>,
    pub status: ImportRowStatus,
    pub validation_errors: Option<Json>,
    pub matched_user_id: Option<Uuid>,
    pub row_number: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::import_job::Entity",
        from = "Column::JobId",
        to = "super::import_job::Column::Id"
    )]
    Job,
}

impl Related<super::import_job::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Job.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[Object(name = "EmployeeImportRow")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }
    async fn row_number(&self) -> i32 {
        self.row_number
    }
    async fn status(&self) -> ImportRowStatus {
        self.status
    }
    async fn raw_data(&self) -> String {
        self.raw_data.to_string()
    }
    async fn parsed_data(&self) -> Option<String> {
        self.parsed_data.as_ref().map(|j| j.to_string())
    }
    async fn validation_errors(&self) -> Option<String> {
        self.validation_errors.as_ref().map(|j| j.to_string())
    }
    async fn matched_user_id(&self) -> Option<Uuid> {
        self.matched_user_id
    }
}
