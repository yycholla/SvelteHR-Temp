//! Custom Axum extractors

use async_trait::async_trait;
use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};

use crate::auth::UserContext;

/// Extractor for UserContext from request extensions
///
/// The JWT middleware stores UserContext in request extensions,
/// and this extractor makes it available to handlers.
pub struct MaybeUserContext(pub Option<UserContext>);

#[async_trait]
impl<S> FromRequestParts<S> for MaybeUserContext
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user_context = parts.extensions.get::<UserContext>().cloned();
        Ok(MaybeUserContext(user_context))
    }
}
