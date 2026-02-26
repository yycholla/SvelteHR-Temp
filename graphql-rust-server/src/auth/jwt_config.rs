use jsonwebtoken::{DecodingKey, EncodingKey};
use std::env;
use std::time::Duration;

/// JWT configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct JwtConfig {
    /// Access token time-to-live (short-lived, in-memory storage)
    pub access_ttl: Duration,
    /// Refresh token time-to-live (long-lived, HTTP-only cookie)
    pub refresh_ttl: Duration,
    /// JWT issuer claim (identifies who issued the token)
    pub issuer: String,
    /// JWT audience claim (identifies who the token is intended for)
    pub audience: String,
}

/// RSA key pair for JWT signing and verification
#[derive(Clone)]
pub struct JwtKeys {
    /// Private key for signing tokens (RS256)
    pub encoding_key: EncodingKey,
    /// Public key for verifying tokens (RS256)
    pub decoding_key: DecodingKey,
}

impl std::fmt::Debug for JwtKeys {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JwtKeys")
            .field("encoding_key", &"<REDACTED>")
            .field("decoding_key", &"<REDACTED>")
            .finish()
    }
}

/// JWT configuration loading errors
#[derive(Debug, thiserror::Error)]
pub enum JwtConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnvVar(String),

    #[error("Invalid PEM format for {key_type}: {details}")]
    InvalidPemFormat { key_type: String, details: String },

    #[error("Invalid TTL value for {var}: {value} (expected positive integer)")]
    InvalidTtl { var: String, value: String },

    #[error("Failed to parse {key_type} key: {error}")]
    KeyParseError { key_type: String, error: String },
}

impl JwtConfig {
    /// Load JWT configuration from environment variables
    ///
    /// Required environment variables:
    /// - JWT_ACCESS_TTL_MINUTES: Access token TTL in minutes (default: 15)
    /// - JWT_REFRESH_TTL_DAYS: Refresh token TTL in days (default: 7)
    /// - JWT_ISSUER: Token issuer identifier (default: mountainhr-api)
    /// - JWT_AUDIENCE: Token audience identifier (default: mountainhr-app)
    ///
    /// # Errors
    ///
    /// Returns `JwtConfigError` if:
    /// - Required environment variables are missing
    /// - TTL values are not valid positive integers
    ///
    /// # Example
    ///
    /// ```no_run
    /// use hr_graphql_server::auth::jwt_config::JwtConfig;
    ///
    /// let config = JwtConfig::from_env().expect("Failed to load JWT config");
    /// println!("Access TTL: {:?}", config.access_ttl);
    /// ```
    pub fn from_env() -> Result<Self, JwtConfigError> {
        // Load access token TTL (default: 15 minutes)
        let access_ttl_minutes = env::var("JWT_ACCESS_TTL_MINUTES")
            .unwrap_or_else(|_| "15".to_string())
            .parse::<u64>()
            .map_err(|_| JwtConfigError::InvalidTtl {
                var: "JWT_ACCESS_TTL_MINUTES".to_string(),
                value: env::var("JWT_ACCESS_TTL_MINUTES").unwrap_or_default(),
            })?;

        // Load refresh token TTL (default: 7 days)
        let refresh_ttl_days = env::var("JWT_REFRESH_TTL_DAYS")
            .unwrap_or_else(|_| "7".to_string())
            .parse::<u64>()
            .map_err(|_| JwtConfigError::InvalidTtl {
                var: "JWT_REFRESH_TTL_DAYS".to_string(),
                value: env::var("JWT_REFRESH_TTL_DAYS").unwrap_or_default(),
            })?;

        // Load issuer (default: mountainhr-api)
        let issuer = env::var("JWT_ISSUER").unwrap_or_else(|_| "mountainhr-api".to_string());

        // Load audience (default: mountainhr-app)
        let audience = env::var("JWT_AUDIENCE").unwrap_or_else(|_| "mountainhr-app".to_string());

        Ok(Self {
            access_ttl: Duration::from_secs(access_ttl_minutes * 60),
            refresh_ttl: Duration::from_secs(refresh_ttl_days * 24 * 60 * 60),
            issuer,
            audience,
        })
    }

    /// Get access token TTL in seconds
    pub fn access_ttl_secs(&self) -> u64 {
        self.access_ttl.as_secs()
    }

    /// Get refresh token TTL in seconds
    pub fn refresh_ttl_secs(&self) -> u64 {
        self.refresh_ttl.as_secs()
    }
}

impl JwtKeys {
    /// Load RSA key pair from files
    ///
    /// # Arguments
    ///
    /// * `private_key_path` - Path to RSA private key file (PEM format)
    /// * `public_key_path` - Path to RSA public key file (PEM format)
    ///
    /// # Errors
    ///
    /// Returns `JwtConfigError` if:
    /// - Files cannot be read
    /// - PEM format is invalid (missing BEGIN/END markers)
    /// - Keys cannot be parsed by jsonwebtoken library
    ///
    /// # Example
    ///
    /// ```no_run
    /// use hr_graphql_server::auth::jwt_config::JwtKeys;
    ///
    /// let keys = JwtKeys::from_files("/app/keys/jwt-private.pem", "/app/keys/jwt-public.pem")
    ///     .expect("Failed to load JWT keys");
    /// ```
    pub fn from_files(
        private_key_path: &str,
        public_key_path: &str,
    ) -> Result<Self, JwtConfigError> {
        use std::fs;

        // Read private key file
        let private_key_pem =
            fs::read_to_string(private_key_path).map_err(|e| JwtConfigError::KeyParseError {
                key_type: "private key file".to_string(),
                error: format!("Failed to read {}: {}", private_key_path, e),
            })?;

        // Read public key file
        let public_key_pem =
            fs::read_to_string(public_key_path).map_err(|e| JwtConfigError::KeyParseError {
                key_type: "public key file".to_string(),
                error: format!("Failed to read {}: {}", public_key_path, e),
            })?;

        // Validate private key PEM format
        Self::validate_pem_format(&private_key_pem, "private key")?;

        // Validate public key PEM format
        Self::validate_pem_format(&public_key_pem, "public key")?;

        // Parse private key for encoding (signing)
        let encoding_key = EncodingKey::from_rsa_pem(private_key_pem.as_bytes()).map_err(|e| {
            JwtConfigError::KeyParseError {
                key_type: "private key".to_string(),
                error: e.to_string(),
            }
        })?;

        // Parse public key for decoding (verification)
        let decoding_key = DecodingKey::from_rsa_pem(public_key_pem.as_bytes()).map_err(|e| {
            JwtConfigError::KeyParseError {
                key_type: "public key".to_string(),
                error: e.to_string(),
            }
        })?;

        Ok(Self {
            encoding_key,
            decoding_key,
        })
    }

    /// Load RSA key pair from environment variables
    ///
    /// Required environment variables:
    /// - JWT_PRIVATE_KEY: RSA private key in PEM format (with -----BEGIN/END----- markers)
    /// - JWT_PUBLIC_KEY: RSA public key in PEM format (with -----BEGIN/END----- markers)
    ///
    /// # Errors
    ///
    /// Returns `JwtConfigError` if:
    /// - Environment variables are missing
    /// - PEM format is invalid (missing BEGIN/END markers)
    /// - Keys cannot be parsed by jsonwebtoken library
    ///
    /// # Security
    ///
    /// - Private key should be stored securely (secrets manager in production)
    /// - Keys should never be logged or exposed in error messages
    /// - Use RS256 algorithm (2048-bit RSA keys)
    ///
    /// # Example
    ///
    /// ```no_run
    /// use hr_graphql_server::auth::jwt_config::JwtKeys;
    ///
    /// let keys = JwtKeys::from_env().expect("Failed to load JWT keys");
    /// // Use keys for signing/verifying tokens
    /// ```
    pub fn from_env() -> Result<Self, JwtConfigError> {
        // Load private key
        let private_key_pem = env::var("JWT_PRIVATE_KEY")
            .map_err(|_| JwtConfigError::MissingEnvVar("JWT_PRIVATE_KEY".to_string()))?;

        // Load public key
        let public_key_pem = env::var("JWT_PUBLIC_KEY")
            .map_err(|_| JwtConfigError::MissingEnvVar("JWT_PUBLIC_KEY".to_string()))?;

        // Validate private key PEM format
        Self::validate_pem_format(&private_key_pem, "private key")?;

        // Validate public key PEM format
        Self::validate_pem_format(&public_key_pem, "public key")?;

        // Parse private key for encoding (signing)
        let encoding_key = EncodingKey::from_rsa_pem(private_key_pem.as_bytes()).map_err(|e| {
            JwtConfigError::KeyParseError {
                key_type: "private key".to_string(),
                error: e.to_string(),
            }
        })?;

        // Parse public key for decoding (verification)
        let decoding_key = DecodingKey::from_rsa_pem(public_key_pem.as_bytes()).map_err(|e| {
            JwtConfigError::KeyParseError {
                key_type: "public key".to_string(),
                error: e.to_string(),
            }
        })?;

        Ok(Self {
            encoding_key,
            decoding_key,
        })
    }

    /// Validate PEM format (must contain BEGIN and END markers)
    fn validate_pem_format(pem: &str, key_type: &str) -> Result<(), JwtConfigError> {
        let has_begin = pem.contains("-----BEGIN");
        let has_end = pem.contains("-----END");

        if !has_begin || !has_end {
            return Err(JwtConfigError::InvalidPemFormat {
                key_type: key_type.to_string(),
                details: format!(
                    "Missing PEM markers (BEGIN: {}, END: {})",
                    has_begin, has_end
                ),
            });
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    // Test RSA keys (for testing only - generated with openssl genrsa 2048)
    const TEST_PRIVATE_KEY: &str = r#"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2wyAKaeOuib88
HUc7DET6pJ/cuZUWbcnSYD4W9Wl34GzQx6zlXl6nQ/SfY5JXW1VXq9Dn1nnzigIy
3GeEd2u+dS3sA2Ie5buZ69qLpqtZj23qBpeTeOCZmDTbhIuizyGAFnKkYBNdScoj
Dc87T/ANE0tNIvJA2TW7tAUBgs/dZFKH+lDxgfWOzMJZIReVTjova+qy/B/hSRvd
iIEXWRvY2mmHQDdDk2GJ6CuDHFhIErpKGqERnm4f+6rrGNXPtPQXsgnVX/5bxsr8
4m3S9/HabEhKJ+Y6LzhCvkWG6Ut2CjW+sp+7Ozx/ZQD+nQy93gwTQ0g58/ys2ieg
hT8u+mnvAgMBAAECggEAAr0sNZZo//HMM2RERS7FuTSOuW9F5uGl/332FZWqSyPK
YwXzDIxHAokNWUwpN8pEc6gSspQaHMZp37BCPuUj8LqZ1xUlOyL565scxIYEFbda
utdMHeeBr4ZCmIhFKB9O4w1dvM08d7lGNb3xvUj75yjtsni+b66xqZ/6M+UYJLsN
1M2ivbxy65fk69lqtFN+NBRJGKKOgUsBT6ZmShIBqtzcshVw/H4hqq6Oppy6DCW8
05QfkOCMCOnaTLiNQ681gTwAU6BRkV4SivIJpY/uNBIrTiTlBkceq5bGNbQVloS2
PkLl7YgMxTT9GP74zXzeDEeKbxXHGC1YVQVs3SQ2GQKBgQDomYwrldZF2+0j3Enb
JQawE3fzDBOHwF9jxIzFgbtdjEl7O2EIqA3+mPKBE7MwIJI8A+idQuGKIXzo9Be8
lXGEQh35S9MTWjK1YBX1WQpQfLiHfFIyw4SfscQ6mrmRyN1N+F4TZKE6PH2mtGpE
KR5YDOyMK2vUAiY7RZrPv9RbuQKBgQDJJgs35cPBaWtHf31MZ7anoWhjUgcY11IU
5DDKXMLeAH4bAvwjok+FZTy8a1DU3daDlBlNcMnFrq3hIvZUM+2MIR8Pop8n/idJ
hTBnua4X36sj/GUv9wqda7fvFR5Q9LtpaSe1+TVdB8GF0nSxb/P/UFb7qmNGFqCA
p8iJnKfW5wKBgQCoW1uFwLKTZhhDOJOMt0Qb9juABGGuhKOGxyFNZBWGJKCbPeOC
LIHUokgE/YlZcHnoTrvz+BDftlV/GA6GRXUg0ep4I1XoUAUcGyxJpeU9VMkL6ARn
EfXQ0Q7DjHJ8/vKQGRGe39uDF32rSDMSmuCHwvMEkfk+P0AE7uCbNrIyoQKBgD9S
SZ/MJebCH/J/ENu3nomAx1LU5MUOK5nGCBH8R6AJealZNDSniO8OYqNSCT0ppLkB
K0H0qqAfkD9aeT8ipbpCRvvuDrpRSN7dHdLZYhPD5qVKdDQ4SdAqs9mAxW1ozYKu
hsDDdegWY/aTvQaKnr4V9Xv+NIhA4T//EaM4fKGrAoGAHvNzd4mdsKgvurpT+lH6
AeVni/1ooPefCFbOVws2wJzd+UtfdSM1zlxIqv3uMO0ZZdTv8or1M5Cb0mKdv7gI
ajy3m/b35958OScQxTwe3UJ+t4LSOzc9ENxOhsYKPLWs26XbZu3LZgHTOEvs+5W4
Mf97+dt9ZYdwMjXVJmLN5X4=
-----END PRIVATE KEY-----"#;

    const TEST_PUBLIC_KEY: &str = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtsMgCmnjrom/PB1HOwxE
+qSf3LmVFm3J0mA+FvVpd+Bs0Mes5V5ep0P0n2OSV1tVV6vQ59Z584oCMtxnhHdr
vnUt7ANiHuW7mevai6arWY9t6gaXk3jgmZg024SLos8hgBZypGATXUnKIw3PO0/w
DRNLTSLyQNk1u7QFAYLP3WRSh/pQ8YH1jszCWSEXlU46L2vqsvwf4Ukb3YiBF1kb
2Npph0A3Q5NhiegrgxxYSBK6ShqhEZ5uH/uq6xjVz7T0F7IJ1V/+W8bK/OJt0vfx
2mxISifmOi84Qr5FhulLdgo1vrKfuzs8f2UA/p0Mvd4ME0NIOfP8rNonoIU/Lvpp
7wIDAQAB
-----END PUBLIC KEY-----"#;

    // Helper to clear all JWT env vars before each test
    fn clear_jwt_env() {
        env::remove_var("JWT_ACCESS_TTL_MINUTES");
        env::remove_var("JWT_REFRESH_TTL_DAYS");
        env::remove_var("JWT_ISSUER");
        env::remove_var("JWT_AUDIENCE");
        env::remove_var("JWT_PRIVATE_KEY");
        env::remove_var("JWT_PUBLIC_KEY");
    }

    #[test]
    fn test_jwt_config_from_env_with_defaults() {
        clear_jwt_env();

        // Set minimal env vars, rely on defaults
        env::set_var("JWT_ISSUER", "test-issuer");
        env::set_var("JWT_AUDIENCE", "test-audience");

        let config = JwtConfig::from_env().expect("Should load with defaults");

        assert_eq!(config.access_ttl, Duration::from_secs(15 * 60)); // 15 minutes
        assert_eq!(config.refresh_ttl, Duration::from_secs(7 * 24 * 60 * 60)); // 7 days
        assert_eq!(config.issuer, "test-issuer");
        assert_eq!(config.audience, "test-audience");

        // Cleanup
        env::remove_var("JWT_ISSUER");
        env::remove_var("JWT_AUDIENCE");
    }

    #[test]
    fn test_jwt_config_from_env_with_custom_values() {
        clear_jwt_env();

        env::set_var("JWT_ACCESS_TTL_MINUTES", "30");
        env::set_var("JWT_REFRESH_TTL_DAYS", "14");
        env::set_var("JWT_ISSUER", "custom-issuer");
        env::set_var("JWT_AUDIENCE", "custom-audience");

        let config = JwtConfig::from_env().expect("Should load custom values");

        assert_eq!(config.access_ttl, Duration::from_secs(30 * 60)); // 30 minutes
        assert_eq!(config.refresh_ttl, Duration::from_secs(14 * 24 * 60 * 60)); // 14 days
        assert_eq!(config.issuer, "custom-issuer");
        assert_eq!(config.audience, "custom-audience");

        // Cleanup
        env::remove_var("JWT_ACCESS_TTL_MINUTES");
        env::remove_var("JWT_REFRESH_TTL_DAYS");
        env::remove_var("JWT_ISSUER");
        env::remove_var("JWT_AUDIENCE");
    }

    #[test]
    fn test_jwt_config_invalid_ttl() {
        clear_jwt_env();

        env::set_var("JWT_ACCESS_TTL_MINUTES", "invalid");

        let result = JwtConfig::from_env();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            JwtConfigError::InvalidTtl { .. }
        ));

        env::remove_var("JWT_ACCESS_TTL_MINUTES");
    }

    #[test]
    fn test_jwt_keys_from_env_success() {
        clear_jwt_env();

        env::set_var("JWT_PRIVATE_KEY", TEST_PRIVATE_KEY);
        env::set_var("JWT_PUBLIC_KEY", TEST_PUBLIC_KEY);

        let _keys = JwtKeys::from_env().expect("Should load test keys");

        // Keys should be loaded successfully
        // We can't directly test the keys, but if from_env() succeeds, they're valid

        // Cleanup
        env::remove_var("JWT_PRIVATE_KEY");
        env::remove_var("JWT_PUBLIC_KEY");
    }

    #[test]
    fn test_jwt_keys_missing_private_key() {
        clear_jwt_env();

        env::remove_var("JWT_PRIVATE_KEY");
        env::set_var("JWT_PUBLIC_KEY", TEST_PUBLIC_KEY);

        let result = JwtKeys::from_env();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            JwtConfigError::MissingEnvVar(_)
        ));

        env::remove_var("JWT_PUBLIC_KEY");
    }

    #[test]
    fn test_jwt_keys_missing_public_key() {
        clear_jwt_env();

        env::set_var("JWT_PRIVATE_KEY", TEST_PRIVATE_KEY);
        env::remove_var("JWT_PUBLIC_KEY");

        let result = JwtKeys::from_env();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            JwtConfigError::MissingEnvVar(_)
        ));

        env::remove_var("JWT_PRIVATE_KEY");
    }

    #[test]
    fn test_jwt_keys_invalid_pem_format() {
        clear_jwt_env();

        env::set_var("JWT_PRIVATE_KEY", "not-a-valid-pem-key");
        env::set_var("JWT_PUBLIC_KEY", TEST_PUBLIC_KEY);

        let result = JwtKeys::from_env();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            JwtConfigError::InvalidPemFormat { .. }
        ));

        env::remove_var("JWT_PRIVATE_KEY");
        env::remove_var("JWT_PUBLIC_KEY");
    }

    #[test]
    fn test_validate_pem_format_valid() {
        let valid_pem = "-----BEGIN PRIVATE KEY-----\ndata\n-----END PRIVATE KEY-----";
        assert!(JwtKeys::validate_pem_format(valid_pem, "test").is_ok());
    }

    #[test]
    fn test_validate_pem_format_missing_begin() {
        let invalid_pem = "data\n-----END PRIVATE KEY-----";
        assert!(JwtKeys::validate_pem_format(invalid_pem, "test").is_err());
    }

    #[test]
    fn test_validate_pem_format_missing_end() {
        let invalid_pem = "-----BEGIN PRIVATE KEY-----\ndata";
        assert!(JwtKeys::validate_pem_format(invalid_pem, "test").is_err());
    }

    #[test]
    fn test_access_ttl_secs() {
        clear_jwt_env();

        env::set_var("JWT_ACCESS_TTL_MINUTES", "20");

        let config = JwtConfig::from_env().expect("Should load config");
        assert_eq!(config.access_ttl_secs(), 20 * 60);

        env::remove_var("JWT_ACCESS_TTL_MINUTES");
    }

    #[test]
    fn test_refresh_ttl_secs() {
        clear_jwt_env();

        env::set_var("JWT_REFRESH_TTL_DAYS", "30");

        let config = JwtConfig::from_env().expect("Should load config");
        assert_eq!(config.refresh_ttl_secs(), 30 * 24 * 60 * 60);

        env::remove_var("JWT_REFRESH_TTL_DAYS");
    }
}
