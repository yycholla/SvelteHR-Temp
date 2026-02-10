use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Access token claims (short-lived, stored in memory on client)
///
/// Contains user identity, roles, and permissions for authorization.
/// Stored in client memory, expires in 15 minutes by default.
///
/// # Standard JWT Claims
/// - `sub`: Subject (user ID as string)
/// - `email`: User's email address
/// - `exp`: Expiration time (Unix timestamp)
/// - `iat`: Issued at time (Unix timestamp)
/// - `jti`: JWT ID (unique token identifier)
/// - `iss`: Issuer (identifies who issued the token)
/// - `aud`: Audience (identifies who the token is intended for)
///
/// # Custom Claims
/// - `roles`: Array of role names
/// - `permissions`: Array of permission strings
/// - `department_id`: Optional department UUID (for departmental filtering)
/// - `display_name`: User's display name
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AccessTokenClaims {
    // Standard JWT claims
    /// Subject - User ID (UUID as string)
    pub sub: String,
    /// User's email address
    pub email: String,
    /// Expiration time (Unix timestamp in seconds)
    pub exp: i64,
    /// Issued at time (Unix timestamp in seconds)
    pub iat: i64,
    /// JWT ID - Unique token identifier
    pub jti: String,
    /// Issuer - Who issued this token
    pub iss: String,
    /// Audience - Who this token is intended for
    pub aud: String,

    // Custom claims for authorization
    /// User's roles (e.g., ["Admin", "Manager"])
    pub roles: Vec<String>,
    /// User's permissions (e.g., ["users:read", "employees:write"])
    pub permissions: Vec<String>,
    /// User's department ID (for RLS filtering)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub department_id: Option<String>,
    /// User's display name
    pub display_name: String,
}

impl AccessTokenClaims {
    /// Parse user ID from `sub` claim as UUID
    ///
    /// # Errors
    ///
    /// Returns `uuid::Error` if `sub` is not a valid UUID
    pub fn user_id(&self) -> Result<Uuid, uuid::Error> {
        Uuid::parse_str(&self.sub)
    }

    /// Parse department ID as UUID (if present)
    ///
    /// # Errors
    ///
    /// Returns `uuid::Error` if `department_id` is present but not a valid UUID
    pub fn department_uuid(&self) -> Result<Option<Uuid>, uuid::Error> {
        match &self.department_id {
            Some(id) => Ok(Some(Uuid::parse_str(id)?)),
            None => Ok(None),
        }
    }

    /// Check if token has expired
    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now().timestamp();
        self.exp < now
    }

    /// Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    /// Check if user has a specific permission
    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.iter().any(|p| p == permission)
    }

    /// Check if user has any of the specified permissions
    pub fn has_any_permission(&self, permissions: &[&str]) -> bool {
        permissions.iter().any(|p| self.has_permission(p))
    }

    /// Check if user has all of the specified permissions
    pub fn has_all_permissions(&self, permissions: &[&str]) -> bool {
        permissions.iter().all(|p| self.has_permission(p))
    }
}

/// Refresh token claims (long-lived, stored as HTTP-only cookie)
///
/// Contains minimal information needed for token rotation.
/// Stored in HTTP-only cookie, expires in 7 days by default.
///
/// # Standard JWT Claims
/// - `sub`: Subject (user ID as string)
/// - `jti`: JWT ID (unique token identifier)
/// - `exp`: Expiration time (Unix timestamp)
/// - `iat`: Issued at time (Unix timestamp)
/// - `iss`: Issuer
/// - `aud`: Audience
///
/// # Custom Claims
/// - `family_id`: Token family ID (for rotation detection)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RefreshTokenClaims {
    // Standard JWT claims
    /// Subject - User ID (UUID as string)
    pub sub: String,
    /// JWT ID - Unique token identifier
    pub jti: String,
    /// Expiration time (Unix timestamp in seconds)
    pub exp: i64,
    /// Issued at time (Unix timestamp in seconds)
    pub iat: i64,
    /// Issuer - Who issued this token
    pub iss: String,
    /// Audience - Who this token is intended for
    pub aud: String,

    // Custom claims for token rotation
    /// Token family ID - Used to detect replay attacks
    /// All tokens in a rotation chain share the same family_id
    pub family_id: String,
}

impl RefreshTokenClaims {
    /// Parse user ID from `sub` claim as UUID
    ///
    /// # Errors
    ///
    /// Returns `uuid::Error` if `sub` is not a valid UUID
    pub fn user_id(&self) -> Result<Uuid, uuid::Error> {
        Uuid::parse_str(&self.sub)
    }

    /// Parse token ID from `jti` claim as UUID
    ///
    /// # Errors
    ///
    /// Returns `uuid::Error` if `jti` is not a valid UUID
    pub fn token_id(&self) -> Result<Uuid, uuid::Error> {
        Uuid::parse_str(&self.jti)
    }

    /// Parse family ID as UUID
    ///
    /// # Errors
    ///
    /// Returns `uuid::Error` if `family_id` is not a valid UUID
    pub fn family_uuid(&self) -> Result<Uuid, uuid::Error> {
        Uuid::parse_str(&self.family_id)
    }

    /// Check if token has expired
    pub fn is_expired(&self) -> bool {
        let now = chrono::Utc::now().timestamp();
        self.exp < now
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    fn create_test_access_claims() -> AccessTokenClaims {
        AccessTokenClaims {
            sub: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            email: "test@example.com".to_string(),
            exp: 1700000000,
            iat: 1699999000,
            jti: "660e8400-e29b-41d4-a716-446655440001".to_string(),
            iss: "mountainhr-api".to_string(),
            aud: "mountainhr-app".to_string(),
            roles: vec!["Admin".to_string(), "Manager".to_string()],
            permissions: vec![
                "users:read".to_string(),
                "users:write".to_string(),
                "employees:read".to_string(),
            ],
            department_id: Some("770e8400-e29b-41d4-a716-446655440002".to_string()),
            display_name: "Test User".to_string(),
        }
    }

    fn create_test_refresh_claims() -> RefreshTokenClaims {
        RefreshTokenClaims {
            sub: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            jti: "660e8400-e29b-41d4-a716-446655440001".to_string(),
            exp: 1700000000,
            iat: 1699999000,
            iss: "mountainhr-api".to_string(),
            aud: "mountainhr-app".to_string(),
            family_id: "880e8400-e29b-41d4-a716-446655440003".to_string(),
        }
    }

    #[test]
    fn test_access_claims_serialization() {
        let claims = create_test_access_claims();
        let json = serde_json::to_string(&claims).expect("Should serialize");

        // Verify JSON contains expected fields
        assert!(json.contains("\"sub\":\"550e8400-e29b-41d4-a716-446655440000\""));
        assert!(json.contains("\"email\":\"test@example.com\""));
        assert!(json.contains("\"roles\":[\"Admin\",\"Manager\"]"));
        assert!(json.contains("\"permissions\""));
    }

    #[test]
    fn test_access_claims_deserialization() {
        let json = r#"{
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "exp": 1700000000,
            "iat": 1699999000,
            "jti": "660e8400-e29b-41d4-a716-446655440001",
            "iss": "mountainhr-api",
            "aud": "mountainhr-app",
            "roles": ["Admin"],
            "permissions": ["users:read"],
            "department_id": "770e8400-e29b-41d4-a716-446655440002",
            "display_name": "Test User"
        }"#;

        let claims: AccessTokenClaims = serde_json::from_str(json).expect("Should deserialize");

        assert_eq!(claims.sub, "550e8400-e29b-41d4-a716-446655440000");
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.roles, vec!["Admin"]);
        assert_eq!(claims.permissions, vec!["users:read"]);
        assert_eq!(claims.display_name, "Test User");
    }

    #[test]
    fn test_access_claims_user_id() {
        let claims = create_test_access_claims();
        let user_id = claims.user_id().expect("Should parse UUID");

        assert_eq!(user_id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_access_claims_department_uuid() {
        let claims = create_test_access_claims();
        let dept_id = claims.department_uuid().expect("Should parse UUID");

        assert!(dept_id.is_some());
        assert_eq!(dept_id.unwrap().to_string(), "770e8400-e29b-41d4-a716-446655440002");
    }

    #[test]
    fn test_access_claims_department_uuid_none() {
        let mut claims = create_test_access_claims();
        claims.department_id = None;

        let dept_id = claims.department_uuid().expect("Should handle None");
        assert!(dept_id.is_none());
    }

    #[test]
    fn test_access_claims_is_expired() {
        let mut claims = create_test_access_claims();

        // Set expiration to past
        claims.exp = 1000000000; // Way in the past
        assert!(claims.is_expired());

        // Set expiration to future
        claims.exp = chrono::Utc::now().timestamp() + 3600; // 1 hour from now
        assert!(!claims.is_expired());
    }

    #[test]
    fn test_access_claims_has_role() {
        let claims = create_test_access_claims();

        assert!(claims.has_role("Admin"));
        assert!(claims.has_role("Manager"));
        assert!(!claims.has_role("Employee"));
    }

    #[test]
    fn test_access_claims_has_permission() {
        let claims = create_test_access_claims();

        assert!(claims.has_permission("users:read"));
        assert!(claims.has_permission("users:write"));
        assert!(!claims.has_permission("users:delete"));
    }

    #[test]
    fn test_access_claims_has_any_permission() {
        let claims = create_test_access_claims();

        assert!(claims.has_any_permission(&["users:read", "users:delete"]));
        assert!(claims.has_any_permission(&["users:write"]));
        assert!(!claims.has_any_permission(&["users:delete", "system:admin"]));
    }

    #[test]
    fn test_access_claims_has_all_permissions() {
        let claims = create_test_access_claims();

        assert!(claims.has_all_permissions(&["users:read", "users:write"]));
        assert!(claims.has_all_permissions(&["employees:read"]));
        assert!(!claims.has_all_permissions(&["users:read", "users:delete"]));
    }

    #[test]
    fn test_refresh_claims_serialization() {
        let claims = create_test_refresh_claims();
        let json = serde_json::to_string(&claims).expect("Should serialize");

        assert!(json.contains("\"sub\":\"550e8400-e29b-41d4-a716-446655440000\""));
        assert!(json.contains("\"jti\":\"660e8400-e29b-41d4-a716-446655440001\""));
        assert!(json.contains("\"family_id\":\"880e8400-e29b-41d4-a716-446655440003\""));
    }

    #[test]
    fn test_refresh_claims_deserialization() {
        let json = r#"{
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "jti": "660e8400-e29b-41d4-a716-446655440001",
            "exp": 1700000000,
            "iat": 1699999000,
            "iss": "mountainhr-api",
            "aud": "mountainhr-app",
            "family_id": "880e8400-e29b-41d4-a716-446655440003"
        }"#;

        let claims: RefreshTokenClaims = serde_json::from_str(json).expect("Should deserialize");

        assert_eq!(claims.sub, "550e8400-e29b-41d4-a716-446655440000");
        assert_eq!(claims.jti, "660e8400-e29b-41d4-a716-446655440001");
        assert_eq!(claims.family_id, "880e8400-e29b-41d4-a716-446655440003");
    }

    #[test]
    fn test_refresh_claims_user_id() {
        let claims = create_test_refresh_claims();
        let user_id = claims.user_id().expect("Should parse UUID");

        assert_eq!(user_id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_refresh_claims_token_id() {
        let claims = create_test_refresh_claims();
        let token_id = claims.token_id().expect("Should parse UUID");

        assert_eq!(token_id.to_string(), "660e8400-e29b-41d4-a716-446655440001");
    }

    #[test]
    fn test_refresh_claims_family_uuid() {
        let claims = create_test_refresh_claims();
        let family_id = claims.family_uuid().expect("Should parse UUID");

        assert_eq!(family_id.to_string(), "880e8400-e29b-41d4-a716-446655440003");
    }

    #[test]
    fn test_refresh_claims_is_expired() {
        let mut claims = create_test_refresh_claims();

        // Set expiration to past
        claims.exp = 1000000000; // Way in the past
        assert!(claims.is_expired());

        // Set expiration to future
        claims.exp = chrono::Utc::now().timestamp() + 86400; // 1 day from now
        assert!(!claims.is_expired());
    }

    #[test]
    fn test_access_claims_roundtrip() {
        let original = create_test_access_claims();
        let json = serde_json::to_string(&original).expect("Should serialize");
        let deserialized: AccessTokenClaims = serde_json::from_str(&json).expect("Should deserialize");

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_refresh_claims_roundtrip() {
        let original = create_test_refresh_claims();
        let json = serde_json::to_string(&original).expect("Should serialize");
        let deserialized: RefreshTokenClaims = serde_json::from_str(&json).expect("Should deserialize");

        assert_eq!(original, deserialized);
    }

    #[test]
    fn test_access_claims_without_department() {
        let json = r#"{
            "sub": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "exp": 1700000000,
            "iat": 1699999000,
            "jti": "660e8400-e29b-41d4-a716-446655440001",
            "iss": "mountainhr-api",
            "aud": "mountainhr-app",
            "roles": ["Employee"],
            "permissions": ["self:read"],
            "display_name": "Test User"
        }"#;

        let claims: AccessTokenClaims = serde_json::from_str(json).expect("Should deserialize without department_id");

        assert!(claims.department_id.is_none());
        assert_eq!(claims.roles, vec!["Employee"]);
    }

    #[test]
    fn test_invalid_uuid_in_sub() {
        let claims = AccessTokenClaims {
            sub: "not-a-uuid".to_string(),
            ..create_test_access_claims()
        };

        assert!(claims.user_id().is_err());
    }

    #[test]
    fn test_invalid_uuid_in_department_id() {
        let mut claims = create_test_access_claims();
        claims.department_id = Some("not-a-uuid".to_string());

        assert!(claims.department_uuid().is_err());
    }
}
