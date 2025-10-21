//! Document Access Log Model
//!
//! Maps to hr_public.document_access_logs table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Types of document access operations
#[derive(Clone, Copy, Debug, Enum, PartialEq, Eq)]
pub enum DocumentAccessType {
    View,
    Download,
    Edit,
    Delete,
}

impl DocumentAccessType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentAccessType::View => "view",
            DocumentAccessType::Download => "download",
            DocumentAccessType::Edit => "edit",
            DocumentAccessType::Delete => "delete",
        }
    }
}

/// Document access audit log
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "document_access_logs", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub document_id: Uuid,
    pub user_id: Uuid,
    pub access_type: String, // Will be converted to enum in GraphQL
    pub accessed_at: DateTime<Utc>,
    pub ip_address: Option<String>,
}

/// Input for creating a new document access log
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentAccessLogInput {
    #[graphql(name = "documentId")]
    pub document_id: Uuid,
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    #[graphql(name = "accessType")]
    pub access_type: DocumentAccessType,
    #[graphql(name = "ipAddress")]
    pub ip_address: Option<String>,
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
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "documents_document_access_log_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "documentId")]
    async fn document_id(&self) -> Uuid {
        self.document_id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "accessType")]
    async fn access_type(&self) -> DocumentAccessType {
        match self.access_type.as_str() {
            "view" => DocumentAccessType::View,
            "download" => DocumentAccessType::Download,
            "edit" => DocumentAccessType::Edit,
            "delete" => DocumentAccessType::Delete,
            _ => DocumentAccessType::View, // Default fallback
        }
    }

    #[graphql(name = "accessedAt")]
    async fn accessed_at(&self) -> DateTime<Utc> {
        self.accessed_at
    }

    #[graphql(name = "ipAddress")]
    async fn ip_address(&self) -> Option<&str> {
        self.ip_address.as_deref()
    }

    /// Document relationship (lazy-loaded)
    async fn document(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<super::document::Model> {
        let db = get_db_from_context(ctx)?;
        let document = super::document::Entity::find_by_id(self.document_id)
            .filter(super::document::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;

        Ok(document)
    }

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.user_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
