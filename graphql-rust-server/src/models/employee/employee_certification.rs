//! Employee Certification Model
//!
//! Maps to hr_public.employee_certifications table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Employee professional certification
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_certifications")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub certification_name: String,
    pub issuing_organization: String,
    pub issue_date: NaiveDate,
    pub expiration_date: Option<NaiveDate>,
    pub certification_number: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::EmployeeId",
        to = "crate::models::user::Column::Id"
    )]
    Employee,
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "employee_employee_certification_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "certificationName")]
    async fn certification_name(&self) -> &str {
        &self.certification_name
    }

    #[graphql(name = "issuingOrganization")]
    async fn issuing_organization(&self) -> &str {
        &self.issuing_organization
    }

    #[graphql(name = "issueDate")]
    async fn issue_date(&self) -> NaiveDate {
        self.issue_date
    }

    #[graphql(name = "expirationDate")]
    async fn expiration_date(&self) -> Option<NaiveDate> {
        self.expiration_date
    }

    #[graphql(name = "certificationNumber")]
    async fn certification_number(&self) -> Option<&str> {
        self.certification_number.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Employee relationship (lazy-loaded)
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.employee_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}

/// Input for creating a new employee certification
#[derive(Debug, Clone, InputObject)]
pub struct CreateEmployeeCertificationInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    #[graphql(name = "certificationName")]
    pub certification_name: String,
    #[graphql(name = "issuingOrganization")]
    pub issuing_organization: String,
    #[graphql(name = "issueDate")]
    pub issue_date: NaiveDate,
    #[graphql(name = "expirationDate")]
    pub expiration_date: Option<NaiveDate>,
    #[graphql(name = "certificationNumber")]
    pub certification_number: Option<String>,
}

/// Filter for querying employee certifications
#[derive(Debug, Clone, InputObject)]
pub struct EmployeeCertificationFilter {
    #[graphql(name = "employeeId")]
    pub employee_id: Option<Uuid>,
    #[graphql(name = "certificationName")]
    pub certification_name: Option<String>,
    #[graphql(name = "expirationDate")]
    pub expiration_date: Option<NaiveDate>,
}
