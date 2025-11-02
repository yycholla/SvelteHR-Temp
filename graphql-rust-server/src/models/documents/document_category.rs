//! Document Category Model
//!
//! Maps to hr_public.document_categories table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter, QueryOrder, QuerySelect};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// Document category for hierarchical organization
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "document_categories", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub parent_category_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentCategoryId",
        to = "Column::Id"
    )]
    ParentCategory,
    #[sea_orm(has_many = "Entity")]
    ChildCategories,
}

impl Related<Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ParentCategory.def()
    }

    fn via() -> Option<RelationDef> {
        Some(Relation::ChildCategories.def().rev())
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new document category
#[derive(Debug, Clone, InputObject)]
pub struct CreateDocumentCategoryInput {
    pub name: String,
    pub description: Option<String>,
    #[graphql(name = "parentCategoryId")]
    pub parent_category_id: Option<Uuid>,
}

/// Input for updating a document category
#[derive(Debug, Clone, InputObject)]
pub struct UpdateDocumentCategoryInput {
    pub name: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "parentCategoryId")]
    pub parent_category_id: Option<Uuid>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "documents_document_category_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    #[graphql(name = "parentCategoryId")]
    async fn parent_category_id(&self) -> Option<Uuid> {
        self.parent_category_id
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    #[graphql(name = "deletedAt")]
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Parent category relationship (lazy-loaded)
    #[graphql(name = "parentCategory")]
    async fn parent_category(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<Model>> {
        if let Some(parent_id) = self.parent_category_id {
            let db = get_db_from_context(ctx)?;
            let category = Entity::find_by_id(parent_id)
                .filter(Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            Ok(category)
        } else {
            Ok(None)
        }
    }

    /// Child categories relationship (lazy-loaded)
    #[graphql(name = "childCategories")]
    async fn child_categories(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<Model>> {
        let db = get_db_from_context(ctx)?;
        let categories = Entity::find()
            .filter(Column::ParentCategoryId.eq(self.id))
            .filter(Column::DeletedAt.is_null())
            .order_by_asc(Column::Name)
            .all(&db)
            .await?;

        Ok(categories)
    }

    /// Documents in this category (lazy-loaded)
    async fn documents(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::document::Model>> {
        let db = get_db_from_context(ctx)?;
        let documents = super::document::Entity::find()
            .filter(super::document::Column::CategoryId.eq(self.id))
            .filter(super::document::Column::DeletedAt.is_null())
            .order_by_asc(super::document::Column::Title)
            .all(&db)
            .await?;

        Ok(documents)
    }
}
