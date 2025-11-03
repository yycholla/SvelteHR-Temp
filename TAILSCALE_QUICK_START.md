# Tailscale Quick Start for Tilt Development

## ⚡ 1-Step Setup (You Already Have Tailscale!)

Since your Tailscale operator is already installed, just run:

```bash
./scripts/setup-tailscale.sh
```

This will deploy the Tailscale services for your dev environment.

Then restart Tilt:

```bash
tilt down
tilt up
```

## 🎉 That's It!

After ~30 seconds, you'll see a message in Tilt UI showing your Tailscale URLs:

```
🌐 Tailscale Access Enabled

Your Services:
• Frontend: https://sveltehr-dev-frontend.<your-tailnet>.ts.net
• Backend:  https://sveltehr-dev-backend.<your-tailnet>.ts.net
• Tilt UI:  https://sveltehr-tilt-ui.<your-tailnet>.ts.net
```

## 📱 Access From Any Device

On **any device** connected to your Tailnet (phone, tablet, laptop):

1. Install Tailscale and log in
2. Open the URLs above in your browser
3. **Hot Module Replacement works!** Edit code on your dev machine → see changes instantly on your phone

## 🔍 Verify Setup

```bash
# Check Tailscale operator is running
kubectl get pods -n tailscale-operator

# Check services got Tailscale IPs
kubectl get svc -n sveltehr-dev | grep -E 'frontend-ts|backend-ts|tilt-ui-ts'

# Get exact URLs
kubectl get svc sveltehr-dev-frontend-ts -n sveltehr-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## 🛠️ How It Works

When Tilt starts with Tailscale operator installed:

1. **Tilt detects** the operator automatically
2. **Deploys** Tailscale LoadBalancer services for frontend, backend, and Tilt UI
3. **Tailscale operator** provisions hostnames in your Tailnet
4. **You access** services from any device on your Tailnet

## 📚 More Information

- **Full Guide**: See `TAILSCALE_ACCESS_GUIDE.md` for detailed instructions
- **Troubleshooting**: Check the guide's troubleshooting section
- **Security**: All traffic is encrypted via WireGuard, only accessible to your Tailnet

## 🧹 Disable Tailscale (Optional)

If you want to disable Tailscale access temporarily:

```bash
# Option 1: Uninstall operator (removes all Tailscale access)
helm uninstall tailscale-operator -n tailscale-operator

# Option 2: Just delete the services (keeps operator)
kubectl delete svc -n sveltehr-dev -l tailscale.com/expose=true
kubectl delete deployment tilt-ui-proxy -n sveltehr-dev

# Restart Tilt to reload
tilt down && tilt up
```

---

**Created:** 2025-11-03
**Tilt will automatically detect Tailscale operator and enable access on every start!**
