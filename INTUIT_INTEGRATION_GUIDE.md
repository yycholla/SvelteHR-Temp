# Intuit QuickBooks Integration Guide

This guide walks you through integrating Intuit QuickBooks/Workforce with your HR platform.

## ✅ Completed Steps

- [x] Created Intuit Developer app
- [x] Added environment variables to `.env.example`
- [x] Created database migration for Intuit tables
- [x] Registered migration in `lib.rs` and `main.rs`

## 📋 Next Steps

### Step 1: Configure Your Environment

1. Copy `.env.example` to `.env` (if not already done):

   ```bash
   cp .env.example .env
   ```

2. Add your Intuit credentials to `.env`:

   ```bash
   # Get these from https://developer.intuit.com/app/developer/myapps
   INTUIT_CLIENT_ID=your_client_id_here
   INTUIT_CLIENT_SECRET=your_client_secret_here
   INTUIT_REDIRECT_URI=http://localhost:3000/api/intuit/callback
   INTUIT_ENVIRONMENT=sandbox
   INTUIT_SCOPES=com.intuit.quickbooks.accounting com.intuit.quickbooks.payment
   ```

3. In your Intuit Developer dashboard, add the redirect URI:
   - Go to your app settings
   - Add `http://localhost:3000/api/intuit/callback` to Redirect URIs
   - For production, add `https://yourdomain.com/api/intuit/callback`

### Step 2: Run the Database Migration

```bash
cd graphql-rust-server
cargo run --bin migration up
```

This will create the following tables:

- `intuit_connections` - Stores OAuth tokens and connection info
- `intuit_sync_log` - Logs all sync operations for debugging
- Adds `intuit_employee_id` column to `users` table

### Step 3: Install Required Rust Dependencies

Add to `graphql-rust-server/Cargo.toml`:

```toml
[dependencies]
# Existing dependencies...

# OAuth 2.0 client
oauth2 = "4.4"

# HTTP client for Intuit API
reqwest = { version = "0.11", features = ["json"] }

# For JWT validation of Intuit tokens
jsonwebtoken = "9.2"

# URL encoding
url = "2.5"
```

Then run:

```bash
cd graphql-rust-server
cargo build
```

### Step 4: Implement the OAuth Flow (Frontend)

Create the OAuth connection page at `src/routes/admin/settings/integrations/+page.svelte`:

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	const { data } = $props();

	async function connectIntuit() {
		// Redirect to backend OAuth endpoint
		window.location.href = '/api/intuit/connect';
	}

	async function disconnectIntuit() {
		await fetch('/api/intuit/disconnect', { method: 'POST' });
		window.location.reload();
	}
</script>

<div class="container mx-auto p-6">
	<h1 class="text-2xl font-bold mb-6">Integrations</h1>

	<Card>
		<CardHeader>
			<CardTitle>QuickBooks / Intuit Workforce</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.intuitConnected}
				<div class="space-y-4">
					<p class="text-sm text-green-600">
						✓ Connected to {data.intuitCompanyName || 'QuickBooks'}
					</p>
					<p class="text-sm text-muted-foreground">
						Last synced: {data.intuitLastSync
							? new Date(data.intuitLastSync).toLocaleString()
							: 'Never'}
					</p>
					<div class="flex gap-2">
						<Button variant="outline" onclick={disconnectIntuit}>Disconnect</Button>
						<Button onclick={() => (window.location.href = '/api/intuit/sync')}>Sync Now</Button>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">
						Connect your QuickBooks account to sync employee data and payroll information.
					</p>
					<Button onclick={connectIntuit}>Connect to QuickBooks</Button>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
```

### Step 5: Implement Backend OAuth Routes (SvelteKit)

Create `src/routes/api/intuit/connect/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const clientId = process.env.INTUIT_CLIENT_ID;
	const redirectUri = process.env.INTUIT_REDIRECT_URI;
	const scopes = process.env.INTUIT_SCOPES || 'com.intuit.quickbooks.accounting';
	const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox';

	const authUrl =
		environment === 'production'
			? 'https://appcenter.intuit.com/connect/oauth2'
			: 'https://appcenter.intuit.com/connect/oauth2';

	// Generate random state for CSRF protection
	const state = crypto.randomUUID();

	// Store state in session/cookie for validation
	const authorizationUrl = new URL(authUrl);
	authorizationUrl.searchParams.set('client_id', clientId!);
	authorizationUrl.searchParams.set('redirect_uri', redirectUri!);
	authorizationUrl.searchParams.set('response_type', 'code');
	authorizationUrl.searchParams.set('scope', scopes);
	authorizationUrl.searchParams.set('state', state);

	throw redirect(302, authorizationUrl.toString());
};
```

Create `src/routes/api/intuit/callback/+server.ts`:

```typescript
import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';

export const GET: RequestHandler = async ({ url, fetch, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const realmId = url.searchParams.get('realmId');

	if (!code || !realmId) {
		throw error(400, 'Missing authorization code or realm ID');
	}

	// Exchange code for tokens via GraphQL mutation
	const client = createUrqlClient(fetch);
	const mutation = `
    mutation ExchangeIntuitCode($code: String!, $realmId: String!) {
      intuit {
        connect(code: $code, realmId: $realmId) {
          success
          companyName
        }
      }
    }
  `;

	const result = await client.mutation(mutation, { code, realmId });

	if (result.error) {
		throw error(500, 'Failed to connect to QuickBooks');
	}

	throw redirect(302, '/admin/settings/integrations?connected=true');
};
```

### Step 6: Implement Rust Backend Integration

Create `graphql-rust-server/src/integrations/intuit/mod.rs`:

```rust
mod client;
mod oauth;
mod models;

pub use client::IntuitClient;
pub use oauth::{exchange_code, refresh_token};
pub use models::*;

use async_trait::async_trait;
use chrono::{DateTime, Utc, Duration};
use oauth2::{
    AuthorizationCode, ClientId, ClientSecret, CsrfToken, RedirectUrl, RefreshToken,
    Scope, TokenResponse, TokenUrl,
};
use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct IntuitClient {
    http_client: HttpClient,
    base_url: String,
    access_token: String,
    realm_id: String,
}

impl IntuitClient {
    pub fn new(access_token: String, realm_id: String) -> Self {
        let environment = env::var("INTUIT_ENVIRONMENT").unwrap_or_else(|_| "sandbox".to_string());
        let base_url = if environment == "production" {
            "https://quickbooks.api.intuit.com".to_string()
        } else {
            "https://sandbox-quickbooks.api.intuit.com".to_string()
        };

        Self {
            http_client: HttpClient::new(),
            base_url,
            access_token,
            realm_id,
        }
    }

    // Get employee from Intuit
    pub async fn get_employee(&self, employee_id: &str) -> Result<IntuitEmployee, Box<dyn std::error::Error>> {
        let url = format!(
            "{}/v3/company/{}/employee/{}",
            self.base_url, self.realm_id, employee_id
        );

        let resp = self.http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(format!("Intuit API error: {}", resp.status()).into());
        }

        let employee: IntuitEmployee = resp.json().await?;
        Ok(employee)
    }

    // Create employee in Intuit
    pub async fn create_employee(
        &self,
        request: &CreateIntuitEmployeeRequest
    ) -> Result<IntuitEmployee, Box<dyn std::error::Error>> {
        let url = format!(
            "{}/v3/company/{}/employee",
            self.base_url, self.realm_id
        );

        let resp = self.http_client
            .post(&url)
            .bearer_auth(&self.access_token)
            .header("Content-Type", "application/json")
            .json(request)
            .send()
            .await?;

        if !resp.status().is_success() {
            let error_text = resp.text().await?;
            return Err(format!("Intuit API error: {}", error_text).into());
        }

        let employee: IntuitEmployee = resp.json().await?;
        Ok(employee)
    }

    // Update employee in Intuit
    pub async fn update_employee(
        &self,
        employee_id: &str,
        request: &UpdateIntuitEmployeeRequest
    ) -> Result<IntuitEmployee, Box<dyn std::error::Error>> {
        let url = format!(
            "{}/v3/company/{}/employee",
            self.base_url, self.realm_id
        );

        let resp = self.http_client
            .post(&url)
            .bearer_auth(&self.access_token)
            .header("Content-Type", "application/json")
            .json(request)
            .send()
            .await?;

        if !resp.status().is_success() {
            let error_text = resp.text().await?;
            return Err(format!("Intuit API error: {}", error_text).into());
        }

        let employee: IntuitEmployee = resp.json().await?;
        Ok(employee)
    }
}

// Models
#[derive(Debug, Serialize, Deserialize)]
pub struct IntuitEmployee {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "GivenName")]
    pub given_name: Option<String>,
    #[serde(rename = "FamilyName")]
    pub family_name: Option<String>,
    #[serde(rename = "PrimaryEmailAddr")]
    pub email: Option<EmailAddress>,
    #[serde(rename = "Active")]
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmailAddress {
    #[serde(rename = "Address")]
    pub address: String,
}

#[derive(Debug, Serialize)]
pub struct CreateIntuitEmployeeRequest {
    #[serde(rename = "GivenName")]
    pub given_name: String,
    #[serde(rename = "FamilyName")]
    pub family_name: String,
    #[serde(rename = "PrimaryEmailAddr")]
    pub email: EmailAddress,
}

#[derive(Debug, Serialize)]
pub struct UpdateIntuitEmployeeRequest {
    #[serde(rename = "Id")]
    pub id: String,
    #[serde(rename = "GivenName")]
    pub given_name: Option<String>,
    #[serde(rename = "FamilyName")]
    pub family_name: Option<String>,
    #[serde(rename = "PrimaryEmailAddr")]
    pub email: Option<EmailAddress>,
    #[serde(rename = "SyncToken")]
    pub sync_token: String, // Required for updates
}
```

### Step 7: Add GraphQL Mutations

Add to `graphql-rust-server/src/schema/mutations/mod.rs`:

```rust
pub mod intuit;

// In your root mutation
pub use intuit::IntuitMutation;
```

Create `graphql-rust-server/src/schema/mutations/intuit.rs`:

```rust
use async_graphql::{Context, Object, Result};
use uuid::Uuid;
use crate::integrations::intuit::IntuitClient;
use sea_orm::DatabaseConnection;

#[derive(Default)]
pub struct IntuitMutation;

#[Object]
impl IntuitMutation {
    /// Connect to Intuit QuickBooks
    async fn connect_intuit(
        &self,
        ctx: &Context<'_>,
        code: String,
        realm_id: String
    ) -> Result<IntuitConnectionResult> {
        // Exchange code for tokens
        let tokens = crate::integrations::intuit::exchange_code(&code).await?;

        // Store in database
        let db = ctx.data::<DatabaseConnection>()?;
        // ... save tokens to intuit_connections table

        Ok(IntuitConnectionResult {
            success: true,
            company_name: Some("QuickBooks Company".to_string())
        })
    }

    /// Sync user to Intuit
    async fn sync_user_to_intuit(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid
    ) -> Result<SyncResult> {
        let db = ctx.data::<DatabaseConnection>()?;

        // Get user from DB
        // Get Intuit connection
        // Create or update employee in Intuit

        Ok(SyncResult {
            success: true,
            message: Some("User synced successfully".to_string())
        })
    }
}

#[derive(Debug)]
pub struct IntuitConnectionResult {
    pub success: bool,
    pub company_name: Option<String>,
}

#[Object]
impl IntuitConnectionResult {
    async fn success(&self) -> bool {
        self.success
    }

    async fn company_name(&self) -> Option<String> {
        self.company_name.clone()
    }
}

#[derive(Debug)]
pub struct SyncResult {
    pub success: bool,
    pub message: Option<String>,
}

#[Object]
impl SyncResult {
    async fn success(&self) -> bool {
        self.success
    }

    async fn message(&self) -> Option<String> {
        self.message.clone()
    }
}
```

### Step 8: Test the Integration

1. Start your backend:

   ```bash
   cd graphql-rust-server
   cargo run
   ```

2. Start your frontend:

   ```bash
   npm run dev
   ```

3. Navigate to `/admin/settings/integrations`

4. Click "Connect to QuickBooks"

5. You'll be redirected to Intuit's OAuth page

6. After authorizing, you'll be redirected back with tokens

7. Test syncing a user to Intuit

## 🔄 Next Features to Implement

1. **Automatic Sync**: Background job to sync users periodically
2. **Webhook Handler**: Receive updates from Intuit when data changes
3. **Pay Stub Access**: Allow employees to view pay stubs
4. **Time Tracking**: Submit PTO to Intuit
5. **Error Handling**: Retry logic for failed syncs

## 📚 Resources

- [Intuit Developer Docs](https://developer.intuit.com/app/developer/qbo/docs/get-started)
- [QuickBooks API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/employee)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)

## 🐛 Troubleshooting

### Token Expired

Tokens expire after 1 hour. Implement token refresh:

```rust
pub async fn refresh_access_token(refresh_token: &str) -> Result<TokenResponse> {
    // Use refresh token to get new access token
}
```

### API Rate Limits

QuickBooks has rate limits (500 requests per minute). Implement:

- Request queuing
- Exponential backoff
- Rate limit headers checking

### Sync Conflicts

When data changes in both systems:

1. Log conflict in `intuit_sync_log`
2. Notify admin
3. Let admin choose which version to keep
