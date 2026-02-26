use anyhow::Result;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    #[serde(default = "default_database_url")]
    pub database_url: String,

    #[serde(default = "default_host")]
    pub host: String,

    #[serde(default = "default_port")]
    pub port: u16,

    #[serde(default = "default_cors_origins")]
    pub cors_allowed_origins: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(envy::from_env::<Config>()?)
    }
}

fn default_database_url() -> String {
    "postgresql://postgres:postgres123@postgres-dev:5432/hr_system".to_string()
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    4000
}

fn default_cors_origins() -> String {
    "http://localhost:5173,http://localhost:3000".to_string()
}
