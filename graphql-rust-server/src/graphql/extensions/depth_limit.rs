//! Query depth limiter placeholder
//!
//! Uses async-graphql's built-in depth limiting via Schema::limit_depth()

/// Default maximum query depth
pub const DEFAULT_MAX_DEPTH: usize = 10;

/// Depth limit configuration
pub struct DepthLimit {
    pub max_depth: usize,
}

impl DepthLimit {
    pub fn new(max_depth: usize) -> Self {
        Self { max_depth }
    }
}
