//! QuickBooks Sync Preview GraphQL Queries

use async_graphql::{Context, Enum, Object, Result};
use chrono::{DateTime, Utc};

use crate::auth::UserContext;
use crate::integrations::intuit::IntuitClient;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::services::sync_preview::{
    SyncPreviewService, SyncPreview as ServiceSyncPreview, PreviewItem as ServicePreviewItem,
    FieldChange as ServiceFieldChange, PreviewConflict as ServicePreviewConflict,
    PreviewSummary as ServicePreviewSummary, PreviewDirection as ServicePreviewDirection,
    PreviewEntityType as ServicePreviewEntityType, ChangeType as ServiceChangeType,
};

#[derive(Default)]
pub struct IntuitPreviewQueries;

#[Object]
impl IntuitPreviewQueries {
    /// Generate a preview of sync changes without executing the sync
    async fn preview_sync(
        &self,
        ctx: &Context<'_>,
        direction: PreviewDirectionInput,
        entity_type: EntityTypeInput,
    ) -> Result<SyncPreview> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;
        let intuit_client = ctx.data::<IntuitClient>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ViewSyncHistory)
            .await?;

        // Convert input enums to service enums
        let service_direction = match direction {
            PreviewDirectionInput::Pull => ServicePreviewDirection::Pull,
            PreviewDirectionInput::Push => ServicePreviewDirection::Push,
            PreviewDirectionInput::Bidirectional => ServicePreviewDirection::Bidirectional,
        };

        let service_entity_type = match entity_type {
            EntityTypeInput::Employee => ServicePreviewEntityType::Employee,
            EntityTypeInput::Department => ServicePreviewEntityType::Department,
        };

        // Generate preview
        let preview_service = SyncPreviewService::new(db.clone());
        let preview = preview_service
            .generate_preview(intuit_client, service_direction, service_entity_type)
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        Ok(SyncPreview::from(preview))
    }
}

/// Preview direction input
#[derive(Debug, Clone, Copy, Enum, PartialEq, Eq)]
pub enum PreviewDirectionInput {
    /// QuickBooks → Local (Pull)
    Pull,
    /// Local → QuickBooks (Push)
    Push,
    /// Both directions
    Bidirectional,
}

/// Entity type input
#[derive(Debug, Clone, Copy, Enum, PartialEq, Eq)]
#[graphql(name = "PreviewEntityTypeInput")]
pub enum EntityTypeInput {
    Employee,
    Department,
}

/// Complete sync preview
#[derive(Debug, Clone)]
pub struct SyncPreview {
    pub creates: Vec<PreviewItem>,
    pub updates: Vec<PreviewItem>,
    pub deletes: Vec<PreviewItem>,
    pub conflicts: Vec<PreviewConflict>,
    pub summary: PreviewSummary,
    pub generated_at: DateTime<Utc>,
}

#[Object]
impl SyncPreview {
    async fn creates(&self) -> &Vec<PreviewItem> {
        &self.creates
    }

    async fn updates(&self) -> &Vec<PreviewItem> {
        &self.updates
    }

    async fn deletes(&self) -> &Vec<PreviewItem> {
        &self.deletes
    }

    async fn conflicts(&self) -> &Vec<PreviewConflict> {
        &self.conflicts
    }

    async fn summary(&self) -> &PreviewSummary {
        &self.summary
    }

    async fn generated_at(&self) -> DateTime<Utc> {
        self.generated_at
    }
}

impl From<ServiceSyncPreview> for SyncPreview {
    fn from(service: ServiceSyncPreview) -> Self {
        Self {
            creates: service.creates.into_iter().map(PreviewItem::from).collect(),
            updates: service.updates.into_iter().map(PreviewItem::from).collect(),
            deletes: service.deletes.into_iter().map(PreviewItem::from).collect(),
            conflicts: service.conflicts.into_iter().map(PreviewConflict::from).collect(),
            summary: PreviewSummary::from(service.summary),
            generated_at: service.generated_at,
        }
    }
}

/// Preview item showing a change
#[derive(Debug, Clone)]
pub struct PreviewItem {
    pub entity_type: String,
    pub entity_id: String,
    pub entity_name: String,
    pub local_data: Option<serde_json::Value>,
    pub remote_data: Option<serde_json::Value>,
    pub field_changes: Vec<FieldChange>,
    pub change_reason: String,
}

#[Object]
impl PreviewItem {
    async fn entity_type(&self) -> &str {
        &self.entity_type
    }

    async fn entity_id(&self) -> &str {
        &self.entity_id
    }

    async fn entity_name(&self) -> &str {
        &self.entity_name
    }

    async fn local_data(&self) -> Option<&serde_json::Value> {
        self.local_data.as_ref()
    }

    async fn remote_data(&self) -> Option<&serde_json::Value> {
        self.remote_data.as_ref()
    }

    async fn field_changes(&self) -> &Vec<FieldChange> {
        &self.field_changes
    }

    async fn change_reason(&self) -> &str {
        &self.change_reason
    }
}

impl From<ServicePreviewItem> for PreviewItem {
    fn from(service: ServicePreviewItem) -> Self {
        Self {
            entity_type: service.entity_type,
            entity_id: service.entity_id,
            entity_name: service.entity_name,
            local_data: service.local_data,
            remote_data: service.remote_data,
            field_changes: service.field_changes.into_iter().map(FieldChange::from).collect(),
            change_reason: service.change_reason,
        }
    }
}

/// Field-level change
#[derive(Debug, Clone)]
pub struct FieldChange {
    pub field_name: String,
    pub local_value: Option<String>,
    pub remote_value: Option<String>,
    pub will_change_to: String,
    pub change_type: ChangeType,
}

#[Object(name = "PreviewFieldChange")]
impl FieldChange {
    async fn field_name(&self) -> &str {
        &self.field_name
    }

    async fn local_value(&self) -> Option<&str> {
        self.local_value.as_deref()
    }

    async fn remote_value(&self) -> Option<&str> {
        self.remote_value.as_deref()
    }

    async fn will_change_to(&self) -> &str {
        &self.will_change_to
    }

    async fn change_type(&self) -> ChangeType {
        self.change_type
    }
}

impl From<ServiceFieldChange> for FieldChange {
    fn from(service: ServiceFieldChange) -> Self {
        Self {
            field_name: service.field_name,
            local_value: service.local_value,
            remote_value: service.remote_value,
            will_change_to: service.will_change_to,
            change_type: ChangeType::from(service.change_type),
        }
    }
}

/// Type of change
#[derive(Debug, Clone, Copy, Enum, PartialEq, Eq)]
pub enum ChangeType {
    Added,
    Modified,
    Removed,
    NoChange,
}

impl From<ServiceChangeType> for ChangeType {
    fn from(service: ServiceChangeType) -> Self {
        match service {
            ServiceChangeType::Added => ChangeType::Added,
            ServiceChangeType::Modified => ChangeType::Modified,
            ServiceChangeType::Removed => ChangeType::Removed,
            ServiceChangeType::NoChange => ChangeType::NoChange,
        }
    }
}

/// Potential conflict
#[derive(Debug, Clone)]
pub struct PreviewConflict {
    pub entity_id: String,
    pub entity_type: String,
    pub entity_name: String,
    pub conflict_type: String,
    pub description: String,
    pub suggested_resolution: String,
    pub local_last_modified: Option<DateTime<Utc>>,
    pub remote_last_modified: Option<DateTime<Utc>>,
}

#[Object]
impl PreviewConflict {
    async fn entity_id(&self) -> &str {
        &self.entity_id
    }

    async fn entity_type(&self) -> &str {
        &self.entity_type
    }

    async fn entity_name(&self) -> &str {
        &self.entity_name
    }

    async fn conflict_type(&self) -> &str {
        &self.conflict_type
    }

    async fn description(&self) -> &str {
        &self.description
    }

    async fn suggested_resolution(&self) -> &str {
        &self.suggested_resolution
    }

    async fn local_last_modified(&self) -> Option<DateTime<Utc>> {
        self.local_last_modified
    }

    async fn remote_last_modified(&self) -> Option<DateTime<Utc>> {
        self.remote_last_modified
    }
}

impl From<ServicePreviewConflict> for PreviewConflict {
    fn from(service: ServicePreviewConflict) -> Self {
        Self {
            entity_id: service.entity_id,
            entity_type: service.entity_type,
            entity_name: service.entity_name,
            conflict_type: service.conflict_type,
            description: service.description,
            suggested_resolution: service.suggested_resolution,
            local_last_modified: service.local_last_modified,
            remote_last_modified: service.remote_last_modified,
        }
    }
}

/// Preview summary statistics
#[derive(Debug, Clone)]
pub struct PreviewSummary {
    pub total_creates: i32,
    pub total_updates: i32,
    pub total_deletes: i32,
    pub total_conflicts: i32,
    pub estimated_duration_sec: i32,
    pub api_calls_required: i32,
    pub safe_to_proceed: bool,
}

#[Object(name = "IntuitPreviewSummary")]
impl PreviewSummary {
    async fn total_creates(&self) -> i32 {
        self.total_creates
    }

    async fn total_updates(&self) -> i32 {
        self.total_updates
    }

    async fn total_deletes(&self) -> i32 {
        self.total_deletes
    }

    async fn total_conflicts(&self) -> i32 {
        self.total_conflicts
    }

    async fn estimated_duration_sec(&self) -> i32 {
        self.estimated_duration_sec
    }

    async fn api_calls_required(&self) -> i32 {
        self.api_calls_required
    }

    async fn safe_to_proceed(&self) -> bool {
        self.safe_to_proceed
    }
}

impl From<ServicePreviewSummary> for PreviewSummary {
    fn from(service: ServicePreviewSummary) -> Self {
        Self {
            total_creates: service.total_creates,
            total_updates: service.total_updates,
            total_deletes: service.total_deletes,
            total_conflicts: service.total_conflicts,
            estimated_duration_sec: service.estimated_duration_sec,
            api_calls_required: service.api_calls_required,
            safe_to_proceed: service.safe_to_proceed,
        }
    }
}
