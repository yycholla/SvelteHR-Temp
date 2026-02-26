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
pub use auth::jwt_auth_middleware as legacy_jwt_auth_middleware; // Legacy, will be removed
pub use csrf::{csrf_protection_middleware, CsrfConfig, CsrfTokenStore};
pub use error_logging::ErrorLoggingExtension;
pub use guards::{
    And, RequireAnyRole, RequireMinRoleLevel, RequireOwnership, RequirePermission, RequireRole,
};
pub use jwt_auth::{
    admin_jwt_auth_middleware, jwt_auth_middleware,
    optional_jwt_auth_middleware as optional_jwt_middleware,
};
pub use optional_auth::optional_jwt_auth_middleware as legacy_optional_jwt_auth_middleware; // Legacy
pub use rate_limiting::{rate_limiting_middleware, RateLimitConfig, RateLimiter};
pub use request_limits::{
    request_limits_middleware, sanitize_string_input, validate_email_format, validate_phone_format,
    RequestLimitsConfig,
};
pub use security_headers::security_headers_middleware;
