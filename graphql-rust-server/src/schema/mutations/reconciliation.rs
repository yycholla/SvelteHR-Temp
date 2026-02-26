//! Reconciliation GraphQL Mutations

use async_graphql::{Context, Object, Result};

use crate::auth::UserContext;
use crate::integrations::intuit::IntuitClientManager;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::services::reconciliation::ReconciliationService;

use std::sync::Arc;
use uuid::Uuid;

#[derive(Default)]
pub struct ReconciliationMutations;

#[Object]
impl ReconciliationMutations {
    /// Run reconciliation for employees
    async fn reconcile_employees(&self, ctx: &Context<'_>) -> Result<ReconciliationResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Get QuickBooks client with automatic token refresh
        let client_manager = IntuitClientManager::new(db.clone());
        let intuit_client = client_manager
            .get_client()
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        let service = ReconciliationService::new(Arc::new(db.clone()));
        let result = service
            .reconcile_employees(
                &intuit_client,
                Some(user_ctx.user_id),
                user_ctx.email.clone(),
            )
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        Ok(ReconciliationResult::from(result))
    }

    /// Resolve a discrepancy
    async fn resolve_discrepancy(
        &self,
        ctx: &Context<'_>,
        discrepancy_id: String,
        resolution_notes: String,
    ) -> Result<bool> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = ctx.data::<sea_orm::DatabaseConnection>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ResolveConflicts)
            .await?;

        let service = ReconciliationService::new(Arc::new(db.clone()));
        let discrepancy_uuid = Uuid::parse_str(&discrepancy_id)?;

        // Get the report_id before resolving (to check for auto-deletion later)
        use crate::models::reconciliation_discrepancies::Entity as DiscrepancyEntity;
        use sea_orm::EntityTrait;

        let discrepancy = DiscrepancyEntity::find_by_id(discrepancy_uuid)
            .one(db)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Discrepancy not found"))?;

        let report_id = discrepancy.report_id;

        // Resolve the discrepancy
        service
            .resolve_discrepancy(discrepancy_uuid, user_ctx.user_id, resolution_notes)
            .await?;

        // Check if all discrepancies in the report are now resolved, and delete if so
        service.check_and_delete_resolved_report(report_id).await?;

        Ok(true)
    }
}

/// Reconciliation result
#[derive(Debug, Clone)]
pub struct ReconciliationResult {
    pub report_id: String,
    pub total_local: i32,
    pub total_remote: i32,
    pub total_matched: i32,
    pub total_discrepancies: i32,
    pub missing_in_local: i32,
    pub missing_in_remote: i32,
    pub data_mismatches: i32,
    pub duration_ms: i32,
}

#[Object]
impl ReconciliationResult {
    async fn report_id(&self) -> &str {
        &self.report_id
    }
    async fn total_local(&self) -> i32 {
        self.total_local
    }
    async fn total_remote(&self) -> i32 {
        self.total_remote
    }
    async fn total_matched(&self) -> i32 {
        self.total_matched
    }
    async fn total_discrepancies(&self) -> i32 {
        self.total_discrepancies
    }
    async fn missing_in_local(&self) -> i32 {
        self.missing_in_local
    }
    async fn missing_in_remote(&self) -> i32 {
        self.missing_in_remote
    }
    async fn data_mismatches(&self) -> i32 {
        self.data_mismatches
    }
    async fn duration_ms(&self) -> i32 {
        self.duration_ms
    }
}

impl From<crate::services::reconciliation::ReconciliationResult> for ReconciliationResult {
    fn from(result: crate::services::reconciliation::ReconciliationResult) -> Self {
        Self {
            report_id: result.report_id.to_string(),
            total_local: result.total_local,
            total_remote: result.total_remote,
            total_matched: result.total_matched,
            total_discrepancies: result.total_discrepancies,
            missing_in_local: result.missing_in_local,
            missing_in_remote: result.missing_in_remote,
            data_mismatches: result.data_mismatches,
            duration_ms: result.duration_ms,
        }
    }
}
