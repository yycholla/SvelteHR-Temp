//! Row-Level Security (RLS) Trait
//!
//! Provides a standardized interface for applying security filters to SeaORM queries
//! based on the authenticated user's context.

use crate::auth::UserContext;
use sea_orm::{EntityTrait, Select};

/// Trait for entities that support Row-Level Security filtering
pub trait RlsFilterable: EntityTrait {
    /// Apply RLS filter to a query based on UserContext
    ///
    /// # Arguments
    /// * `query` - The SeaORM Select query to filter
    /// * `user` - The authenticated user context
    ///
    /// # Returns
    /// Modified Select query with security filters applied
    fn apply_rls(query: Select<Self>, user: &UserContext) -> Select<Self>;
}
