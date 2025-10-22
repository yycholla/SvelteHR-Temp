//! Seed Data Module
//!
//! Provides comprehensive development seed data generation for the HR application.
//! Integrates with existing SeaORM models and activity logging system.

pub mod audit;
pub mod builders;
pub mod config;
pub mod context;
pub mod dependencies;

pub use config::{SeedConfig, VolumeTarget};
pub use context::{EntitySeedResult, SeedContext, SeedResult};

use thiserror::Error;

#[derive(Error, Debug)]
pub enum SeedError {
    #[error("Production safety block: seed data execution requires ENABLE_SEED_DATA=true or ENVIRONMENT=development")]
    ProductionSafetyBlock,

    #[error("Missing DATABASE_URL environment variable")]
    MissingDatabaseUrl,

    #[error("Database connection error: {0}")]
    DatabaseConnection(#[from] sea_orm::DbErr),

    #[error("System user not found - required for audit logging")]
    SystemUserNotFound,

    #[error("Seed operation failed: {0}")]
    SeedOperation(String),
}

pub type Result<T> = std::result::Result<T, SeedError>;
