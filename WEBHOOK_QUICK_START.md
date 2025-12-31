# QuickBooks Webhook Integration - Quick Start Guide

## Setup (5 minutes)

### 1. Environment Variables
Add to your `.env` file:
```bash
# Webhook Configuration
INTUIT_WEBHOOK_URL=https://your-domain.com/api/intuit/webhook
INTUIT_WEBHOOK_VERIFIER_TOKEN=your_webhook_verifier_token_from_quickbooks
```

### 2. QuickBooks Developer Portal Setup
1. Log in to https://developer.intuit.com
2. Go to your app → Settings → Webhooks
3. Click "Create Subscription"
4. Enter webhook endpoint: `https://your-domain.com/api/intuit/webhook`
5. Select entities to monitor: `Employee`, `Department`
6. Copy the **Verifier Token** to your `.env` file
7. Save and activate

### 3. Database Migration
The migration should already be applied, but verify:
```bash
cd graphql-rust-server
cargo run --bin migrate
```

## Usage

### Admin Dashboard
Navigate to: **Settings → Integrations → Webhooks**

**URL**: `/admin/settings/integrations/webhooks`

### Register Webhook (First Time)
1. Click **"Register Webhook"**
2. Select entity types (Employee, Department recommended)
3. Click **"Register Webhook"**
4. Verify status shows **"Active"** with green indicator

### View Webhook Events
The dashboard shows:
- **Statistics Cards**: Total, Pending, Processing, Completed, Failed events
- **Event List**: Recent webhook deliveries with status
- **Filters**: Filter by status or event type

### Handle Failed Events
1. Look for events with **"Failed"** status (red badge)
2. Click on the event to view details
3. Review the error message
4. Click **"Retry"** button to retry processing
5. Check if status changes to "Completed"

### Unregister Webhook
1. Click **"Unregister Webhook"** (red button)
2. Confirm action
3. Status changes to "Inactive"

## GraphQL Examples

### Check Webhook Status
```graphql
query {
  webhooks {
    webhookStatus {
      isActive
      webhookId
      entityNames
      lastDeliveredAt
      failureCount
    }
  }
}
```

### Get Recent Events
```graphql
query {
  webhooks {
    webhookEvents(limit: 20) {
      id
      eventType
      entityName
      status
      receivedAt
      processedAt
      lastError
    }
  }
}
```

### Get Statistics
```graphql
query {
  webhooks {
    webhookStatistics {
      totalEvents
      pendingEvents
      completedEvents
      failedEvents
      avgProcessingTimeMs
    }
  }
}
```

### Register Webhook
```graphql
mutation {
  webhooks {
    registerWebhook(entityNames: ["Employee", "Department"]) {
      success
      message
      webhookId
    }
  }
}
```

### Retry Failed Event
```graphql
mutation {
  webhooks {
    retryWebhookEvent(eventId: "uuid-here") {
      success
      message
      eventsProcessed
    }
  }
}
```

## Testing

### Test Webhook Delivery
1. **Using QuickBooks Sandbox**:
   - Create or update an employee in QuickBooks sandbox
   - Wait 1-2 seconds
   - Check webhook dashboard for new event

2. **Using Developer Portal**:
   - Go to Webhooks section in developer portal
   - Click "Send Test Notification"
   - Select event type (e.g., Employee.Create)
   - Check webhook dashboard

### Verify Event Processing
```sql
-- Check recent events
SELECT
    event_type,
    entity_name,
    status,
    received_at,
    processed_at
FROM hr_public.webhook_events
ORDER BY received_at DESC
LIMIT 10;
```

## Troubleshooting

### Webhook Not Receiving Events
1. **Check QuickBooks Configuration**:
   - Verify webhook URL is correct in QuickBooks portal
   - Ensure URL is publicly accessible (not localhost)
   - Check entity types are selected

2. **Check Server Logs**:
   ```bash
   # Look for webhook-related logs
   grep "webhook" /var/log/hr-server.log
   ```

3. **Verify Environment Variables**:
   ```bash
   echo $INTUIT_WEBHOOK_URL
   echo $INTUIT_WEBHOOK_VERIFIER_TOKEN
   ```

### Signature Verification Fails
- **Error**: "Invalid webhook signature"
- **Solution**: Verify `INTUIT_WEBHOOK_VERIFIER_TOKEN` matches QuickBooks portal

### Events Stuck in "Pending"
- **Issue**: Events not processing
- **Solution**:
  ```graphql
  mutation {
    webhooks {
      processPendingWebhookEvents(limit: 10) {
        success
        message
        eventsProcessed
      }
    }
  }
  ```

### High Failure Rate
1. Check error messages in failed events
2. Verify QuickBooks API credentials are valid
3. Check network connectivity to QuickBooks API
4. Review server logs for detailed error messages

## API Endpoints

### Webhook Receiver (Public)
- **URL**: `POST /api/intuit/webhook`
- **Auth**: HMAC signature verification
- **Headers**: `intuit-signature`
- **Body**: QuickBooks webhook payload (JSON)

### GraphQL API (Authenticated)
- **URL**: `POST /graphql`
- **Auth**: Session cookie
- **Operations**: See GraphQL Examples above

## Permissions Required

To use webhook management features, users need:
- **View Statistics**: `ViewSyncHistory` permission
- **Register/Unregister**: `ManageIntegrations` permission
- **Retry Events**: `ManageIntegrations` permission

Assign these permissions via the RBAC system in admin settings.

## Performance Notes

- Webhook receipt: < 100ms (immediate acknowledgment)
- Event processing: 500ms - 2s (async, depending on entity type)
- Statistics query: < 50ms (indexed)
- Event list query: < 100ms (paginated, indexed)

## Best Practices

1. **Monitor Failure Rates**: Set up alerts if failure rate > 5%
2. **Regular Cleanup**: Archive events older than 90 days
3. **Test Changes**: Always test in sandbox before production
4. **Review Errors**: Check failed events daily and retry if needed
5. **Entity Selection**: Only subscribe to entities you actively use

## Support

For issues or questions:
1. Check this guide first
2. Review `/WEBHOOK_IMPLEMENTATION_SUMMARY.md` for technical details
3. Check server logs for detailed error messages
4. Contact DevOps team for infrastructure issues
5. Contact QuickBooks support for API-related issues

## Next Steps

After successful setup:
1. ✅ Test webhook delivery with QuickBooks sandbox
2. ✅ Monitor events for 24 hours
3. ✅ Review statistics and failure rates
4. ✅ Set up production environment
5. ✅ Configure monitoring and alerts
6. ✅ Train admin team on webhook management

---

**Documentation Version**: 1.0
**Last Updated**: December 30, 2025
**Status**: Production Ready
