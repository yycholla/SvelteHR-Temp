//! Seed Data Binary
//!
//! Populates database with realistic test data for development.
//! Automatically invoked on container startup when ENABLE_SEED_DATA=true.

use graphql_rust_server::database;
use graphql_rust_server::seed_data::{SeedConfig, SeedError};
use std::process;

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    // Production safety check
    if let Err(e) = check_production_safety() {
        eprintln!("Error: {}", e);
        process::exit(1);
    }

    // Load configuration from environment
    let config = SeedConfig::from_env();

    // Connect to database
    let db = match database::create_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("Database connection failed: {}", e);
            process::exit(2);
        }
    };

    println!("Seed data binary started");
    println!("Configuration: {:?}", config);

    // TODO: Initialize seed context (T011)
    // TODO: Execute seeding orchestration (T068-T076)

    println!("Seed data binary completed (stub)");
    process::exit(0);
}

/// Production safety check - prevents accidental production execution
fn check_production_safety() -> Result<(), SeedError> {
    let enable_seed = std::env::var("ENABLE_SEED_DATA")
        .unwrap_or_default()
        .to_lowercase();
    let environment = std::env::var("ENVIRONMENT")
        .unwrap_or_default()
        .to_lowercase();

    if enable_seed == "true" || environment == "development" {
        Ok(())
    } else {
        Err(SeedError::ProductionSafetyBlock)
    }
}
