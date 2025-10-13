//! Document Assignment Model
//!
//! Maps to hr_public.document_assignments table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Document access level enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "document_access_level", rename_all = "lowercase")]
pub enum DocumentAccessLevel {
    #[graphql(name = "READ")]
    Read,
    #[graphql(name = "WRITE")]
    Write,
    #[graphql(name = "ADMIN")]
    Admin,
}

/// Document assignment to users or departments
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentAssignment {
    pub id: Uuid,
    pub document_id: Uuid,
    pub user_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub access_level: DocumentAccessLevel,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by_id: Uuid,
}

/// Input for creating a new document assignment
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentAssignmentInput {
    #[graphql(name = "documentId")]
    pub document_id: Uuid,
    #[graphql(name = "userId")]
    pub user_id: Option<Uuid>,
    #[graphql(name = "departmentId")]
    pub department_id: Option<Uuid>,
    #[graphql(name = "accessLevel")]
    pub access_level: DocumentAccessLevel,
    #[graphql(name = "assignedById")]
    pub assigned_by_id: Uuid,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl DocumentAssignment {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "documentId")]
    async fn document_id(&self) -> Uuid {
        self.document_id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Option<Uuid> {
        self.user_id
    }

    #[graphql(name = "departmentId")]
    async fn department_id(&self) -> Option<Uuid> {
        self.department_id
    }

    #[graphql(name = "accessLevel")]
    async fn access_level(&self) -> DocumentAccessLevel {
        self.access_level
    }

    #[graphql(name = "assignedAt")]
    async fn assigned_at(&self) -> DateTime<Utc> {
        self.assigned_at
    }

    #[graphql(name = "assignedById")]
    async fn assigned_by_id(&self) -> Uuid {
        self.assigned_by_id
    }

    /// Document relationship (lazy-loaded)
    async fn document(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<super::document::Document> {
        let pool = ctx.data::<PgPool>()?;
        let document = sqlx::query_as::<_, super::document::Document>(
            r#"
            SELECT id, title, description, category_id, file_path, file_size,
                   mime_type, uploader_id, created_at, updated_at, deleted_at
            FROM hr_public.documents
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.document_id)
        .fetch_one(pool)
        .await?;

        Ok(document)
    }

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        if let Some(user_id) = self.user_id {
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
            .bind(user_id)
            .fetch_optional(pool)
            .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }

    /// Department relationship (lazy-loaded)
    async fn department(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<crate::models::Department>> {
        if let Some(dept_id) = self.department_id {
            let pool = ctx.data::<PgPool>()?;
            let dept = sqlx::query_as::<_, crate::models::Department>(
                r#"
                SELECT id, name, description, parent_department_id, manager_id,
                       created_at, updated_at, deleted_at
                FROM hr_public.departments
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(dept_id)
            .fetch_optional(pool)
            .await?;

            Ok(dept)
        } else {
            Ok(None)
        }
    }

    /// Assigner relationship (lazy-loaded)
    #[graphql(name = "assignedBy")]
    async fn assigned_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.assigned_by_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
