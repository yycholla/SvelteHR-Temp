//! Document Assignment Model
//!
//! Maps to hr_public.document_assignments table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Access levels for document assignments
#[derive(Clone, Copy, Debug, Enum, PartialEq, Eq)]
pub enum DocumentAccessLevel {
    Read,
    Write,
    Admin,
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
}

/// Document assignment to users or departments
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "document_assignments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub document_id: Uuid,
    pub user_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub access_level: String, // Will be converted to enum in GraphQL
    pub assigned_by_id: Uuid,
    pub assigned_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::document::Entity",
        from = "Column::DocumentId",
        to = "super::document::Column::Id"
    )]
    Document,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "crate::models::department::Entity",
        from = "Column::DepartmentId",
        to = "crate::models::department::Column::Id"
    )]
    Department,
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
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
        match self.access_level.as_str() {
            "read" => DocumentAccessLevel::Read,
            "write" => DocumentAccessLevel::Write,
            "admin" => DocumentAccessLevel::Admin,
            _ => DocumentAccessLevel::Read, // Default fallback
        }
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
    ) -> GqlResult<super::document::Model> {
        let db = get_db_from_context(ctx)?;
        let document = super::document::Entity::find_by_id(self.document_id)
            .filter(super::document::Column::DeletedAt.is_null())
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;

        Ok(document)
    }

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        if let Some(user_id) = self.user_id {
            let db = get_db_from_context(ctx)?;
            let user = crate::models::user::Entity::find_by_id(user_id)
                .one(db)
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
            let db = get_db_from_context(ctx)?;
            let dept = crate::models::department::Entity::find_by_id(dept_id)
                .one(db)
                .await?;

            Ok(dept)
        } else {
            Ok(None)
        }
    }

    /// Assigner relationship (lazy-loaded)
    #[graphql(name = "assignedBy")]
    async fn assigned_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.assigned_by_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
