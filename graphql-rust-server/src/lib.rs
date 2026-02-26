#![warn(unused_imports)]
#![warn(dead_code)]
#![warn(unused_variables)]
#![warn(unused_mut)]

pub mod adapters;
pub mod application;
pub mod auth;
pub mod config;
pub mod database;
pub mod dataloader;
pub mod domain;
pub mod error;
pub mod handlers;
pub mod integrations;
pub mod logging;
pub mod middleware;
pub mod models;
pub mod openapi;
pub mod ports;
pub mod scheduler;
pub mod schema;
pub mod seed_data;
pub mod services;
pub mod utils;

// Migration module (from ../migration/lib.rs)
#[path = "../migration/lib.rs"]
pub mod migration;

// Testing infrastructure - only compiled when running tests due to dev-dependencies
#[cfg(any(test, feature = "test-utils"))]
pub mod testing;
