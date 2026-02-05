//! New sync mutations using hexagonal architecture

use async_graphql::{Context, Object, Result};
use std::sync::Arc;

use crate::{
    adapters::{QuickBooksAdapter, SeaOrmSyncRepository},
    application::SyncService,
    auth::UserContext,
    database::get_db_from_context,
    integrations::intuit::IntuitClientManager,
    ports::health::HealthStatus,
    schema::types::sync::{ConflictStrategy, SyncDirection, SyncInput, SyncReport},
};

/// Mock health port for now
struct MockHealthPort;

#[async_trait::async_trait]
impl crate::ports::HealthPort for MockHealthPort {
    async fn record_sync_completed(
        &self,
        _report: &crate::domain::sync::SyncReport,
    ) -> Result<(), crate::domain::sync::SyncError> {
        Ok(())
    }

    async fn get_health_status(&self) -> Result<HealthStatus, crate::domain::sync::SyncError> {
        Ok(HealthStatus::healthy())
    }
}

#[derive(Default)]
pub struct SyncMutationsV2;

#[Object]
impl SyncMutationsV2 {
    /// Trigger a sync operation using the new architecture
    async fn sync(&self, ctx: &Context<'_>, input: SyncInput) -> Result<SyncReport> {
        let _user = ctx.data::<UserContext>()?;
        let db = get_db_from_context(ctx)?;

        // Create IntuitClientManager and get client
        let client_manager = IntuitClientManager::new(db.clone());
        let client = client_manager.get_client().await.map_err(|e| {
            async_graphql::Error::new(format!("Failed to get QuickBooks client: {}", e))
        })?;

        // Create adapters
        let qb_adapter = QuickBooksAdapter::new(client);
        let repo_adapter = SeaOrmSyncRepository::new(db.clone());
        let health_adapter = MockHealthPort;

        // Create SyncService
        let sync_service = SyncService::new(
            Arc::new(qb_adapter),
            Arc::new(repo_adapter),
            Arc::new(health_adapter),
        );

        // Execute sync based on direction
        let domain_report = match input.direction {
            SyncDirection::Push => {
                sync_service
                    .sync_push(input.entity_type.into(), input.mode.into())
                    .await
            }
            SyncDirection::Pull => {
                sync_service
                    .sync_pull(input.entity_type.into(), input.mode.into())
                    .await
            }
            SyncDirection::Bidirectional => {
                let strategy = input
                    .conflict_strategy
                    .unwrap_or(ConflictStrategy::LastWriteWins);
                sync_service
                    .sync_bidirectional(
                        input.entity_type.into(),
                        input.mode.into(),
                        strategy.into(),
                    )
                    .await
            }
        };

        Ok(domain_report.into())
    }
}
