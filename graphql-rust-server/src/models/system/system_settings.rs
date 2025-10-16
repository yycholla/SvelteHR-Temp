//! System Settings Model
//!
//! Maps to hr_public.system_settings table
//! Only accessible to system_admin role

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, JsonValue, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// System settings by category
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "system_settings", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub category: String,
    pub settings: JsonValue,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UpdatedBy",
        to = "crate::models::user::Column::Id"
    )]
    UpdatedByUser,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for updating system settings
#[derive(Debug, Clone, InputObject)]
pub struct UpdateSystemSettingsInput {
    #[graphql(name = "category")]
    pub category: String,
    #[graphql(name = "settings")]
    pub settings: String, // JSON string
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "SystemSettings")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "category")]
    async fn category(&self) -> &str {
        &self.category
    }

    #[graphql(name = "settings")]
    async fn settings(&self) -> String {
        self.settings.to_string()
    }

    #[graphql(name = "updatedBy")]
    async fn updated_by(&self) -> Option<Uuid> {
        self.updated_by
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// User who last updated these settings (lazy-loaded)
    #[graphql(name = "updatedByUser")]
    async fn updated_by_user(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<crate::models::user::Model>> {
        if let Some(user_id) = self.updated_by {
            let db = get_db_from_context(ctx)?;
            let user = crate::models::user::Entity::find_by_id(user_id)
                .one(&db)
                .await?;
            Ok(user)
        } else {
            Ok(None)
        }
    }
}

impl Model {
    /// Find system settings by category
    pub async fn find_by_category(
        db: &DatabaseConnection,
        category: &str,
    ) -> Result<Option<Self>, DbErr> {
        Entity::find()
            .filter(Column::Category.eq(category))
            .filter(Column::DeletedAt.is_null())
            .one(db)
            .await
    }

    /// Get all system settings (all categories)
    pub async fn find_all(db: &DatabaseConnection) -> Result<Vec<Self>, DbErr> {
        Entity::find()
            .filter(Column::DeletedAt.is_null())
            .all(db)
            .await
    }

    /// Update system settings for a category
    pub async fn update_settings(
        db: &DatabaseConnection,
        category: &str,
        settings_json: JsonValue,
        updated_by_id: Uuid,
    ) -> Result<Self, DbErr> {
        let existing = Self::find_by_category(db, category).await?;

        if let Some(existing_model) = existing {
            // Update existing settings
            let mut active_model: ActiveModel = existing_model.into();
            active_model.settings = Set(settings_json);
            active_model.updated_by = Set(Some(updated_by_id));
            active_model.updated_at = Set(Utc::now());

            active_model.update(db).await
        } else {
            // Create new settings entry
            let new_model = ActiveModel {
                id: Set(Uuid::new_v4()),
                category: Set(category.to_string()),
                settings: Set(settings_json),
                updated_by: Set(Some(updated_by_id)),
                created_at: Set(Utc::now()),
                updated_at: Set(Utc::now()),
                deleted_at: Set(None),
            };

            new_model.insert(db).await
        }
    }
}
