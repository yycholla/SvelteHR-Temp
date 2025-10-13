//! Employee Certification Model
//!
//! Maps to hr_public.employee_certifications table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Employee professional certification
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EmployeeCertification {
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

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EmployeeCertification {
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
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_one(pool)
        .await?;

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
