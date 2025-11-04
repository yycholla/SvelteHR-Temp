pub mod audit;
pub mod auth;
pub mod csrf;
pub mod guards;
pub mod optional_auth;
pub mod rate_limiting;
pub mod request_limits;
pub mod security_headers;
pub mod session_auth;

pub use audit::AuditExtension;
pub use auth::jwt_auth_middleware;
pub use csrf::{csrf_protection_middleware, CsrfTokenStore, CsrfConfig};
pub use optional_auth::optional_jwt_auth_middleware;
pub use rate_limiting::{rate_limiting_middleware, RateLimiter, RateLimitConfig};
pub use request_limits::{request_limits_middleware, RequestLimitsConfig, sanitize_string_input, validate_email_format, validate_phone_format};
pub use security_headers::security_headers_middleware;
pub use session_auth::{
    session_auth_middleware,
    optional_session_auth_middleware,
    admin_session_auth_middleware,
};
pub use guards::{
    RequireRole, RequirePermission, RequireAnyRole,
    RequireMinRoleLevel, RequireOwnership, And,
};
