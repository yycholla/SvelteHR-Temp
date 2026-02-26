//! Time Entry Model
//!
//! Maps to hr_public.time_entries table for time tracking and QuickBooks sync

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Time entry status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum TimeEntryStatus {
    #[graphql(name = "DRAFT")]
    Draft,
    #[graphql(name = "SUBMITTED")]
    Submitted,
    #[graphql(name = "APPROVED")]
    Approved,
    #[graphql(name = "REJECTED")]
    Rejected,
}

impl TimeEntryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TimeEntryStatus::Draft => "draft",
            TimeEntryStatus::Submitted => "submitted",
            TimeEntryStatus::Approved => "approved",
            TimeEntryStatus::Rejected => "rejected",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "draft" => TimeEntryStatus::Draft,
            "submitted" => TimeEntryStatus::Submitted,
            "approved" => TimeEntryStatus::Approved,
            "rejected" => TimeEntryStatus::Rejected,
            _ => TimeEntryStatus::Draft,
        }
    }
}

/// Time entry sync state enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
#[graphql(name = "TimeEntrySyncState")]
pub enum TimeEntrySyncState {
    #[graphql(name = "NOT_SYNCED")]
    NotSynced,
    #[graphql(name = "PENDING")]
    Pending,
    #[graphql(name = "SYNCED")]
    Synced,
    #[graphql(name = "FAILED")]
    Failed,
}

impl TimeEntrySyncState {
    pub fn as_str(&self) -> &'static str {
        match self {
            TimeEntrySyncState::NotSynced => "not_synced",
            TimeEntrySyncState::Pending => "pending",
            TimeEntrySyncState::Synced => "synced",
            TimeEntrySyncState::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "not_synced" => TimeEntrySyncState::NotSynced,
            "pending" => TimeEntrySyncState::Pending,
            "synced" => TimeEntrySyncState::Synced,
            "failed" => TimeEntrySyncState::Failed,
            _ => TimeEntrySyncState::NotSynced,
        }
    }
}

/// Time entry record
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "time_entries", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub entry_date: NaiveDate,
    pub hours: Decimal,
    pub project_id: Option<Uuid>,
    pub is_billable: bool,
    pub description: Option<String>,
    pub status: String,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
    pub quickbooks_time_activity_id: Option<String>,
    #[sea_orm(column_name = "sync_state")]
    pub sync_status: String, // NOTE: Column renamed to sync_state in DB
    pub synced_at: Option<DateTime<Utc>>,
    pub sync_error: Option<String>,
    pub last_modified_at: DateTime<Utc>,
    pub quickbooks_sync_token: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::ApprovedBy",
        to = "crate::models::user::Column::Id"
    )]
    Approver,
    #[sea_orm(
        belongs_to = "super::project::Entity",
        from = "Column::ProjectId",
        to = "super::project::Column::Id"
    )]
    Project,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new time entry
#[derive(Debug, Clone, InputObject)]
pub struct CreateTimeEntryInput {
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    #[graphql(name = "entryDate")]
    pub entry_date: NaiveDate,
    pub hours: f64,
    #[graphql(name = "projectId")]
    pub project_id: Option<Uuid>,
    #[graphql(name = "isBillable")]
    pub is_billable: Option<bool>,
    pub description: Option<String>,
}

/// Input for updating a time entry
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTimeEntryInput {
    #[graphql(name = "entryDate")]
    pub entry_date: Option<NaiveDate>,
    pub hours: Option<f64>,
    #[graphql(name = "projectId")]
    pub project_id: Option<Uuid>,
    #[graphql(name = "isBillable")]
    pub is_billable: Option<bool>,
    pub description: Option<String>,
}

/// Input for approving/rejecting time entries
#[derive(Debug, Clone, InputObject)]
pub struct ApproveTimeEntryInput {
    pub approve: bool,
    #[graphql(name = "rejectedReason")]
    pub rejected_reason: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "TimeEntry")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "entryDate")]
    async fn entry_date(&self) -> NaiveDate {
        self.entry_date
    }

    async fn hours(&self) -> f64 {
        self.hours.to_f64().unwrap_or(0.0)
    }

    #[graphql(name = "projectId")]
    async fn project_id(&self) -> Option<Uuid> {
        self.project_id
    }

    #[graphql(name = "isBillable")]
    async fn is_billable(&self) -> bool {
        self.is_billable
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    async fn status(&self) -> TimeEntryStatus {
        TimeEntryStatus::from_str(&self.status)
    }

    #[graphql(name = "approvedBy")]
    async fn approved_by(&self) -> Option<Uuid> {
        self.approved_by
    }

    #[graphql(name = "approvedAt")]
    async fn approved_at(&self) -> Option<DateTime<Utc>> {
        self.approved_at
    }

    #[graphql(name = "rejectedReason")]
    async fn rejected_reason(&self) -> Option<&str> {
        self.rejected_reason.as_deref()
    }

    #[graphql(name = "quickbooksTimeActivityId")]
    async fn quickbooks_time_activity_id(&self) -> Option<&str> {
        self.quickbooks_time_activity_id.as_deref()
    }

    #[graphql(name = "syncStatus")]
    async fn sync_status(&self) -> TimeEntrySyncState {
        TimeEntrySyncState::from_str(&self.sync_status)
    }

    #[graphql(name = "syncedAt")]
    async fn synced_at(&self) -> Option<DateTime<Utc>> {
        self.synced_at
    }

    #[graphql(name = "syncError")]
    async fn sync_error(&self) -> Option<&str> {
        self.sync_error.as_deref()
    }

    #[graphql(name = "lastModifiedAt")]
    async fn last_modified_at(&self) -> DateTime<Utc> {
        self.last_modified_at
    }

    #[graphql(name = "quickbooksSyncToken")]
    async fn quickbooks_sync_token(&self) -> Option<&str> {
        self.quickbooks_sync_token.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
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

    /// Approver relationship (lazy-loaded)
    async fn approver(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<crate::models::User>> {
        if let Some(approver_id) = self.approved_by {
            let db = get_db_from_context(ctx)?;
            let approver = crate::models::user::Entity::find_by_id(approver_id)
                .one(&db)
                .await?;
            Ok(approver)
        } else {
            Ok(None)
        }
    }

    /// Project relationship (lazy-loaded)
    async fn project(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Option<super::project::Model>> {
        if let Some(project_id) = self.project_id {
            let db = get_db_from_context(ctx)?;
            let project = super::project::Entity::find_by_id(project_id)
                .one(&db)
                .await?;
            Ok(project)
        } else {
            Ok(None)
        }
    }
}
