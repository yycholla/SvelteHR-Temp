//! Seed Execution Context
//!
//! Tracks seed execution state and provides audit context.

use chrono::{DateTime, Utc};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

use super::config::SeedConfig;
use super::Result;
use crate::models::user;

#[derive(Debug, Clone)]
pub struct SeedContext {
    pub system_user_id: Uuid,
    pub batch_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub config: SeedConfig,
}

impl SeedContext {
    pub fn new(system_user_id: Uuid, config: SeedConfig) -> Self {
        Self {
            system_user_id,
            batch_id: Uuid::new_v4(),
            started_at: Utc::now(),
            config,
        }
    }
}

#[derive(Debug, Clone)]
pub struct EntitySeedResult {
    pub entity_type: String,
    pub created_count: usize,
    pub skipped_count: usize,
    pub failed_count: usize,
    pub errors: Vec<String>,
}

impl EntitySeedResult {
    pub fn new(entity_type: &str) -> Self {
        Self {
            entity_type: entity_type.to_string(),
            created_count: 0,
            skipped_count: 0,
            failed_count: 0,
            errors: Vec::new(),
        }
    }

    pub fn failed(entity_type: &str, error: impl std::fmt::Display) -> Self {
        Self {
            entity_type: entity_type.to_string(),
            created_count: 0,
            skipped_count: 0,
            failed_count: 1,
            errors: vec![error.to_string()],
        }
    }
}

#[derive(Debug, Clone)]
pub struct SeedResult {
    pub batch_id: Uuid,
    pub entity_results: Vec<EntitySeedResult>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

impl SeedResult {
    pub fn new(batch_id: Uuid) -> Self {
        Self {
            batch_id,
            entity_results: Vec::new(),
            started_at: Utc::now(),
            completed_at: None,
        }
    }

    pub fn add(&mut self, result: EntitySeedResult) {
        self.entity_results.push(result);
    }

    pub fn complete(&mut self) {
        self.completed_at = Some(Utc::now());
    }

    pub fn total_created(&self) -> usize {
        self.entity_results.iter().map(|r| r.created_count).sum()
    }

    pub fn total_skipped(&self) -> usize {
        self.entity_results.iter().map(|r| r.skipped_count).sum()
    }

    pub fn total_failed(&self) -> usize {
        self.entity_results.iter().map(|r| r.failed_count).sum()
    }

    pub fn execution_time(&self) -> Option<chrono::Duration> {
        self.completed_at
            .map(|completed| completed - self.started_at)
    }
}

/// Initialize seed context by finding or creating system user
pub async fn initialize_seed_context(
    db: &DatabaseConnection,
    config: SeedConfig,
) -> Result<SeedContext> {
    use sea_orm::*;

    // Try to find system user (typically admin@mountainhr.dev)
    let system_user = user::Entity::find()
        .filter(user::Column::Email.eq("admin@mountainhr.dev"))
        .one(db)
        .await?
        .ok_or(super::SeedError::SystemUserNotFound)?;

    Ok(SeedContext::new(system_user.id, config))
}
