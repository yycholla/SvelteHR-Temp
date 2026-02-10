pub mod audit;
pub mod auth;
pub mod csrf;
pub mod error_logging;
pub mod guards;
pub mod jwt_auth;
pub mod optional_auth;
pub mod rate_limiting;
pub mod request_limits;
pub mod security_headers;

pub use audit::AuditExtension;
pub use error_logging::ErrorLoggingExtension;
pub use auth::jwt_auth_middleware as legacy_jwt_auth_middleware; // Legacy, will be removed
pub use csrf::{csrf_protection_middleware, CsrfTokenStore, CsrfConfig};
pub use jwt_auth::{
    jwt_auth_middleware,
    optional_jwt_auth_middleware as optional_jwt_middleware,
    admin_jwt_auth_middleware,
};
pub use optional_auth::optional_jwt_auth_middleware as legacy_optional_jwt_auth_middleware; // Legacy
pub use rate_limiting::{rate_limiting_middleware, RateLimiter, RateLimitConfig};
pub use request_limits::{request_limits_middleware, RequestLimitsConfig, sanitize_string_input, validate_email_format, validate_phone_format};
pub use security_headers::security_headers_middleware;
pub use guards::{
    RequireRole, RequirePermission, RequireAnyRole,
    RequireMinRoleLevel, RequireOwnership, And,
};
