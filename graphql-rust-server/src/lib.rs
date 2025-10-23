pub mod auth;
pub mod config;
pub mod database;
pub mod dataloader;
pub mod error;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod seed_data;
pub mod services;
pub mod schema;
pub mod utils;

// Migration module (from ../migration/lib.rs)
#[path = "../migration/lib.rs"]
pub mod migration;

// Testing infrastructure - only compiled when running tests due to dev-dependencies
#[cfg(any(test, feature = "test-utils"))]
pub mod testing;

pub use models::session;