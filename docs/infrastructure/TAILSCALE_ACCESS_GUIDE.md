# Tailscale Access Guide for Tilt Development

This guide shows how to access your Tilt development environment from any device on your Tailnet.

## 🎯 What You'll Get

Access these services from **any device on your Tailnet** (laptop, tablet, phone, etc.):

- **Frontend** (Vite dev server with HMR): `https://sveltehr-dev-frontend.<tailnet>.ts.net`
- **Backend** (GraphQL API): `https://sveltehr-dev-backend.<tailnet>.ts.net`
- **Tilt UI Dashboard**: `https://sveltehr-tilt-ui.<tailnet>.ts.net`

## 🚀 Quick Setup (3 minutes)

### Step 1: Start Tilt

```bash
npm run dev:k8s
```

Wait for all services to show green checkmarks in the Tilt UI (http://localhost:10350).

### Step 2: Deploy Tailscale Access

```bash
# Apply the Tailscale configuration
kubectl apply -f k8s/tailscale-dev-ingress.yaml
```

### Step 3: Wait for Tailscale (30 seconds)

Watch the services get Tailscale IPs:

```bash
watch kubectl get svc -n sveltehr-dev
```

You should see services with `EXTERNAL-IP` values like `100.x.x.x`.

### Step 4: Get Your URLs

```bash
# Frontend URL
echo "Frontend: https://$(kubectl get svc sveltehr-dev-frontend-ts -n sveltehr-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"

# Backend URL
echo "Backend: https://$(kubectl get svc sveltehr-dev-backend-ts -n sveltehr-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"

# Tilt UI URL
echo "Tilt UI: https://$(kubectl get svc tilt-ui-ts -n sveltehr-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
```

### Step 5: Access from Any Device

On **any device connected to your Tailnet** (must be logged into Tailscale):

1. **Open Tailscale admin console**: https://login.tailscale.com/admin/machines
2. **Find your machines**: Look for `sveltehr-dev-frontend`, `sveltehr-dev-backend`, and `sveltehr-tilt-ui`
3. **Click the URLs** to access your services

Or just use the URLs from Step 4!

## 🔥 Hot Module Replacement Still Works!

Even when accessing via Tailscale:

1. **Edit a file** on your development machine: `src/routes/+page.svelte`
2. **Watch it update** on your phone/tablet/other laptop
3. **Changes sync in <2 seconds** via HMR

## 📱 Access from Different Devices

### From Your Phone

1. Install Tailscale app (iOS/Android)
2. Log in with your Tailscale account
3. Open Safari/Chrome and go to: `https://sveltehr-dev-frontend.<tailnet>.ts.net`
4. Edit code on your dev machine → watch phone update instantly!

### From Another Laptop

1. Install Tailscale and log in
2. Access the URLs directly
3. Use Tilt UI to monitor services: `https://sveltehr-tilt-ui.<tailnet>.ts.net`

### From a Tablet

1. Install Tailscale and log in
2. Perfect for testing responsive design
3. Full HMR support

## 🛠️ Architecture

```
Your Development Machine (100.98.104.21)
├── Tilt (localhost:10350)
└── K8s Cluster
    └── sveltehr-dev namespace
        ├── Frontend Pod (Vite dev server)
        │   └── Tailscale Service → sveltehr-dev-frontend.ts.net
        ├── Backend Pod (GraphQL API)
        │   └── Tailscale Service → sveltehr-dev-backend.ts.net
        └── Tilt UI Proxy Pod
            └── Tailscale Service → sveltehr-tilt-ui.ts.net

↓ (Tailscale WireGuard tunnel)

Any Device on Your Tailnet
├── Laptop
├── Phone
├── Tablet
└── Remote Desktop
```

## 🔧 Troubleshooting

### Services Not Getting Tailscale IPs

```bash
# Check Tailscale operator logs
kubectl logs -n tailscale-operator -l app=tailscale-operator

# Verify operator is running
kubectl get pods -n tailscale-operator
```

### Can't Access Services

```bash
# Check if services are in Tailscale network
tailscale status

# Look for:
# - sveltehr-dev-frontend
# - sveltehr-dev-backend
# - sveltehr-tilt-ui

# If not there, check service status
kubectl get svc -n sveltehr-dev -o wide
```

### Tilt UI Not Accessible

The Tilt UI proxy needs to reach your host machine's Tailscale IP.

```bash
# Verify Tilt is listening
netstat -tlnp | grep 10350

# Should show:
# tcp   0   0 127.0.0.1:10350   0.0.0.0:*   LISTEN   <pid>/tilt

# If it's only listening on 127.0.0.1, you need to bind to Tailscale IP
# Option 1: Use socat to forward
socat TCP-LISTEN:10350,bind=100.98.104.21,fork TCP:127.0.0.1:10350

# Option 2: Update nginx proxy to use 127.0.0.1
kubectl edit configmap tilt-ui-proxy-config -n sveltehr-dev
# Change: proxy_pass http://100.98.104.21:10350;
# To: proxy_pass http://192.168.1.129:10350;
```

### HMR WebSocket Not Connecting

If HMR doesn't work over Tailscale, update Vite config:

```typescript
// vite.config.ts
server: {
  hmr: {
    protocol: 'wss',  // Use secure WebSocket
    host: 'sveltehr-dev-frontend.<your-tailnet>.ts.net',
    port: 443,
  }
}
```

## 🔒 Security

### Who Can Access?

- **Only devices on your Tailnet** can access these services
- **Not exposed to the internet** at all
- **Encrypted WireGuard tunnel** for all traffic
- **Zero trust architecture** - devices must be authenticated

### Tailscale Access Controls

You can restrict access further using Tailscale ACLs:

```jsonc
// tailscale ACL example
{
	"acls": [
		{
			"action": "accept",
			"src": ["tag:developer"],
			"dst": ["tag:dev:*"]
		}
	],
	"tagOwners": {
		"tag:dev": ["your-email@example.com"],
		"tag:developer": ["your-email@example.com"]
	}
}
```

## 🧹 Cleanup

When done developing, you can remove Tailscale access:

```bash
# Remove Tailscale services (keeps Tilt running)
kubectl delete -f k8s/tailscale-dev-ingress.yaml

# Stop Tilt
npm run dev:k8s:down
```

## 💡 Pro Tips

1. **Bookmark the URLs** on your phone/tablet for quick access
2. **Use Tilt UI** remotely to trigger tests and view logs
3. **Test responsive design** on real devices with instant updates
4. **Show progress to clients** by sharing Tailscale access temporarily
5. **Work from anywhere** - coffee shop, home, office - all work the same

## 📊 Comparison with Other Access Methods

| Method            | Security     | Speed     | Setup     | Works Remotely |
| ----------------- | ------------ | --------- | --------- | -------------- |
| **Tailscale**     | ✅ Excellent | ✅ Fast   | ⚠️ Medium | ✅ Yes         |
| Port Forwarding   | ❌ Poor      | ✅ Fast   | ✅ Easy   | ❌ No          |
| Cloudflare Tunnel | ✅ Good      | ⚠️ Medium | ⚠️ Medium | ✅ Yes         |
| VPN               | ✅ Good      | ⚠️ Medium | ❌ Hard   | ✅ Yes         |
| Local Network     | ⚠️ Fair      | ✅ Fast   | ✅ Easy   | ❌ No          |

## 🎉 You're All Set!

You can now:

- ✅ Access Tilt UI from any device
- ✅ View frontend on phone/tablet with HMR
- ✅ Test on real devices
- ✅ Work from anywhere on your Tailnet
- ✅ Share progress securely

---

**Questions?** Check the [Troubleshooting](#troubleshooting) section or ask the team!

_Last updated: 2025-11-02_
