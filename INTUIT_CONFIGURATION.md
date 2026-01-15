# Intuit QuickBooks Developer Portal Configuration

This document provides the required URLs and settings for configuring the SvelteHR app in the Intuit Developer Portal.

## Production App Configuration

### Application URLs

**Host Domain:**

```
hr.mtncarerx.com
```

**Launch URL (OAuth Redirect URI):**

```
https://hr.mtncarerx.com/api/intuit/callback
```

**Disconnect URL:**

```
https://hr.mtncarerx.com/api/intuit/disconnect
```

**Webhook URL (for sync notifications):**

```
https://hr.mtncarerx.com/api/intuit/webhook
```

### Legal Pages

**End User License Agreement (EULA):**

```
https://hr.mtncarerx.com/terms
```

**Privacy Policy:**

```
https://hr.mtncarerx.com/privacy
```

## OAuth Scopes Required

Add the following scopes in the Intuit Developer Portal:

- `com.intuit.quickbooks.accounting` - For employee and payroll data
- `com.intuit.quickbooks.payment` - For payment processing (optional)

## Environment Configuration

The following environment variables are already configured in Kubernetes (via Doppler):

- `INTUIT_CLIENT_ID` - OAuth client ID from Intuit Developer Portal
- `INTUIT_CLIENT_SECRET` - OAuth client secret (SENSITIVE)
- `INTUIT_REDIRECT_URI` - OAuth callback URL
- `INTUIT_ENVIRONMENT` - Set to "production"
- `INTUIT_WEBHOOK_URL` - Webhook endpoint URL
- `INTUIT_WEBHOOK_VERIFIER_TOKEN` - HMAC signature verification token

## Setup Steps

### 1. Create App in Intuit Developer Portal

1. Go to https://developer.intuit.com/
2. Navigate to "My Apps" → "Create an app"
3. Select "QuickBooks Online and Payments"
4. Fill in app details

### 2. Configure OAuth Settings

**Redirect URIs:**

- Production: `https://hr.mtncarerx.com/api/intuit/callback`

**Scopes:**

- ✅ com.intuit.quickbooks.accounting
- ✅ com.intuit.quickbooks.payment (if needed)

### 3. Configure App Settings

**App Name:** SvelteHR

**Description:**

```
Enterprise HR management system with QuickBooks integration for seamless
employee data synchronization, payroll management, and time tracking.
```

**Logo:** Upload company logo (512x512 px recommended)

**Support Email:** support@mountaincarerx.com

**App URL:** https://hr.mtncarerx.com

### 4. Legal and Compliance

**Terms of Service URL:**

```
https://hr.mtncarerx.com/terms
```

**Privacy Policy URL:**

```
https://hr.mtncarerx.com/privacy
```

**EULA URL:**

```
https://hr.mtncarerx.com/terms
```

### 5. Webhooks Configuration

**Webhook URL:**

```
https://hr.mtncarerx.com/api/intuit/webhook
```

**Webhook Events to Subscribe:**

- Customer created/updated/deleted
- Employee created/updated/deleted
- Department created/updated/deleted
- Vendor created/updated/deleted

**Verifier Token:**

- Generate a secure token: `openssl rand -hex 32`
- Add to Doppler as `INTUIT_WEBHOOK_VERIFIER_TOKEN`
- Configure in Intuit Developer Portal

### 6. Disconnect URL

**Disconnect Callback URL:**

```
https://hr.mtncarerx.com/api/intuit/disconnect
```

This endpoint is called when a user disconnects SvelteHR from QuickBooks.

## Testing

### Test Disconnect Endpoint

```bash
curl -X GET https://hr.mtncarerx.com/api/intuit/disconnect
```

Expected response:

```json
{
	"endpoint": "intuit-disconnect-webhook",
	"status": "active",
	"timestamp": "2026-01-12T...",
	"methods": ["POST"]
}
```

### Test Legal Pages

- Privacy Policy: https://hr.mtncarerx.com/privacy
- Terms of Service: https://hr.mtncarerx.com/terms

Both pages should be publicly accessible without authentication.

## Production Deployment

The legal pages and disconnect endpoint are included in the `2.0.3` release.

**Deployment Status:**

- ✅ Privacy policy page created
- ✅ Terms of service / EULA created
- ✅ Disconnect webhook endpoint created
- ✅ Public routes configured (no auth required)
- ⏳ Waiting for frontend 2.0.3 deployment

## Security Notes

1. **Webhook Security**: All webhooks must verify the HMAC signature using `INTUIT_WEBHOOK_VERIFIER_TOKEN`
2. **OAuth Tokens**: Refresh tokens are stored encrypted in the database
3. **SSL/TLS**: All endpoints must use HTTPS in production
4. **Rate Limiting**: Consider adding rate limits to webhook endpoints

## Support

For questions or issues:

- Technical Support: support@mountaincarerx.com
- Privacy Inquiries: privacy@mountaincarerx.com
- Legal Inquiries: legal@mountaincarerx.com
