//! LinkedResource domain model with GraphQL integration
//!
//! Represents attachments, links, and resources associated with tasks.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Resource type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "resource_type", rename_all = "lowercase")]
pub enum ResourceType {
    File,
    Link,
    Document,
    Image,
    Video,
}

/// LinkedResource model - maps to hr_public.linked_resources table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LinkedResource {
    pub id: Uuid,
    pub task_id: Uuid,
    pub resource_type: ResourceType,
    pub title: String,
    pub url: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub description: Option<String>,
    pub uploaded_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for LinkedResource
#[Object]
impl LinkedResource {
    /// Unique linked resource identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task ID (foreign key)
    async fn task_id(&self) -> Uuid {
        self.task_id
    }

    /// Type of resource
    async fn resource_type(&self) -> ResourceType {
        self.resource_type
    }

    /// Resource title or name
    async fn title(&self) -> &str {
        &self.title
    }

    /// URL if resource is a link
    async fn url(&self) -> Option<&str> {
        self.url.as_deref()
    }

    /// File path if resource is uploaded
    async fn file_path(&self) -> Option<&str> {
        self.file_path.as_deref()
    }

    /// File size in bytes
    async fn file_size(&self) -> Option<i64> {
        self.file_size
    }

    /// MIME type of the resource
    async fn mime_type(&self) -> Option<&str> {
        self.mime_type.as_deref()
    }

    /// Resource description
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// User ID who uploaded/created the resource
    async fn uploaded_by(&self) -> Uuid {
        self.uploaded_by
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Soft delete timestamp (NULL if not deleted)
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Task associated with this resource
    async fn task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Task>> {
        let pool = ctx.data::<PgPool>()?;

        let task = sqlx::query_as::<_, super::task::Task>(
            r#"
            SELECT id, title, description, status, priority, due_date, start_date,
                   completed_at, estimated_hours, actual_hours, tags, department_id,
                   created_by, created_at, updated_at, deleted_at
            FROM hr_public.tasks
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.task_id)
        .fetch_optional(pool)
        .await?;

        Ok(task)
    }

    /// User who uploaded the resource
    async fn uploader(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.uploaded_by)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Human-readable file size
    async fn file_size_formatted(&self) -> Option<String> {
        self.file_size.map(|bytes| {
            if bytes < 1024 {
                format!("{} B", bytes)
            } else if bytes < 1024 * 1024 {
                format!("{:.2} KB", bytes as f64 / 1024.0)
            } else if bytes < 1024 * 1024 * 1024 {
                format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
            } else {
                format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
            }
        })
    }

    /// Whether this is a file attachment
    async fn is_file(&self) -> bool {
        matches!(
            self.resource_type,
            ResourceType::File | ResourceType::Document | ResourceType::Image | ResourceType::Video
        )
    }

    /// Whether this is an external link
    async fn is_link(&self) -> bool {
        self.resource_type == ResourceType::Link
    }
}

/// LinkedResource creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateLinkedResourceInput {
    pub task_id: Uuid,
    pub resource_type: ResourceType,
    pub title: String,
    pub url: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub description: Option<String>,
}

/// LinkedResource update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateLinkedResourceInput {
    pub title: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_linked_resource_model_compiles() {
        let resource = LinkedResource {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            resource_type: ResourceType::Document,
            title: "Project Specification".to_string(),
            url: None,
            file_path: Some("/uploads/spec.pdf".to_string()),
            file_size: Some(1024000),
            mime_type: Some("application/pdf".to_string()),
            description: Some("Technical specification document".to_string()),
            uploaded_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(resource.resource_type, ResourceType::Document);
    }
}
