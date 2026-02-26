use anyhow::{Context, Result};
use base64::{engine::general_purpose, Engine as _};
use oauth2::{
    basic::BasicClient, AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, RedirectUrl,
    RefreshToken, Scope, TokenResponse, TokenUrl,
};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntuitTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64, // seconds
}

/// Get the OAuth authorization URL that users should visit
pub fn get_authorization_url() -> Result<(String, CsrfToken)> {
    let client = create_oauth_client()?;

    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("com.intuit.quickbooks.accounting".to_string()))
        .add_scope(Scope::new("com.intuit.quickbooks.payment".to_string()))
        .url();

    Ok((auth_url.to_string(), csrf_token))
}

/// Exchange authorization code for access and refresh tokens
pub async fn exchange_code_for_tokens(code: String) -> Result<IntuitTokens> {
    let client = create_oauth_client()?;

    let token_result = client
        .exchange_code(AuthorizationCode::new(code))
        .request_async(oauth2::reqwest::async_http_client)
        .await
        .context("Failed to exchange authorization code for tokens")?;

    let access_token = token_result.access_token().secret().clone();
    let refresh_token = token_result
        .refresh_token()
        .map(|t| t.secret().clone())
        .ok_or_else(|| anyhow::anyhow!("OAuth token response did not include a refresh token"))?;
    let expires_in = token_result
        .expires_in()
        .map(|d| d.as_secs() as i64)
        .unwrap_or(3600);

    Ok(IntuitTokens {
        access_token,
        refresh_token,
        expires_in,
    })
}

/// Refresh an expired access token using the refresh token
pub async fn refresh_access_token(refresh_token_str: String) -> Result<IntuitTokens> {
    let client = create_oauth_client()?;

    let token_result = client
        .exchange_refresh_token(&RefreshToken::new(refresh_token_str.clone()))
        .request_async(oauth2::reqwest::async_http_client)
        .await
        .context("Failed to refresh access token")?;

    let access_token = token_result.access_token().secret().clone();
    // Some refresh responses omit refresh_token; preserve existing token in that case.
    let refresh_token = token_result
        .refresh_token()
        .map(|t| t.secret().clone())
        .unwrap_or(refresh_token_str);
    let expires_in = token_result
        .expires_in()
        .map(|d| d.as_secs() as i64)
        .unwrap_or(3600);

    Ok(IntuitTokens {
        access_token,
        refresh_token,
        expires_in,
    })
}

/// Revoke an OAuth token (access or refresh) with Intuit.
/// Intuit recommends revoking the refresh token during disconnect flows.
pub async fn revoke_token(token: String) -> Result<()> {
    let client_id = env::var("INTUIT_CLIENT_ID")
        .context("INTUIT_CLIENT_ID is required for token revocation")?;
    let client_secret = env::var("INTUIT_CLIENT_SECRET")
        .context("INTUIT_CLIENT_SECRET is required for token revocation")?;

    let credentials = format!("{}:{}", client_id, client_secret);
    let auth_header = format!(
        "Basic {}",
        general_purpose::STANDARD.encode(credentials.as_bytes())
    );

    let response = reqwest::Client::new()
        .post("https://developer.api.intuit.com/v2/oauth2/tokens/revoke")
        .header("Authorization", auth_header)
        .header("Accept", "application/json")
        .form(&[("token", token)])
        .send()
        .await
        .context("Failed to send token revocation request")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!(
            "Intuit token revocation failed with status {}: {}",
            status,
            body
        );
    }

    Ok(())
}

/// Create OAuth client from environment variables
fn create_oauth_client() -> Result<BasicClient> {
    let client_id = ClientId::new(env::var("INTUIT_CLIENT_ID")?);
    let client_secret = ClientSecret::new(env::var("INTUIT_CLIENT_SECRET")?);
    let redirect_url = RedirectUrl::new(env::var("INTUIT_REDIRECT_URI")?)?;

    let environment = env::var("INTUIT_ENVIRONMENT").unwrap_or_else(|_| "sandbox".to_string());

    // OAuth endpoints differ between sandbox and production
    let (auth_url, token_url) = if environment == "production" {
        (
            "https://appcenter.intuit.com/connect/oauth2",
            "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        )
    } else {
        (
            "https://appcenter.intuit.com/connect/oauth2",
            "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        )
    };

    let client = BasicClient::new(
        client_id,
        Some(client_secret),
        AuthUrl::new(auth_url.to_string())?,
        Some(TokenUrl::new(token_url.to_string())?),
    )
    .set_redirect_uri(redirect_url);

    Ok(client)
}
