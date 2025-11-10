# Kubernetes Production Deployment - Quick Start

**For servers with existing Kubernetes installations**

---

## Scenario: Fresh Installation on Server with Existing K8s

If you see this error:
```
[ERROR Port-6443]: Port 6443 is in use
[ERROR Port-10259]: Port 10259 is in use
[ERROR Port-10257]: Port 10257 is in use
[ERROR Port-10250]: Port 10250 is in use
```

**This means Kubernetes is already partially installed.**

---

## Step-by-Step Recovery

### Step 1: Clean Up Existing Installation (5 minutes)

```bash
# SSH into production server
ssh root@hr.example.com

# Run the cleanup script
cd /root/SvelteHR
bash scripts/k8s-cleanup.sh

# When prompted, type 'yes' to confirm
```

**What this does:**
- Resets kubeadm completely
- Removes all Kubernetes data
- Cleans up network interfaces
- Frees up ports 6443, 10259, 10257, 10250
- Removes all containers and images

### Step 2: Verify Cleanup (2 minutes)

```bash
# Check that ports are free
netstat -tuln | grep -E ':(6443|10259|10257|10250)'
# Should return nothing

# Check no kubelet running
ps aux | grep kubelet
# Should only show the grep command

# Check directories removed
ls /etc/kubernetes
# Should show: No such file or directory
```

### Step 3: Re-run Deployment Script (90 minutes)

```bash
# Make sure you've edited the configuration first
vim /root/k8s-backup-restore-deploy.sh

# Run the deployment
bash /root/k8s-backup-restore-deploy.sh
```

---

## Alternative: Manual Cleanup (if script fails)

If the cleanup script has issues, run these commands manually:

```bash
# 1. Reset kubeadm
kubeadm reset -f

# 2. Remove Kubernetes directories
rm -rf /etc/kubernetes/
rm -rf /var/lib/kubelet/
rm -rf /var/lib/etcd/
rm -rf /etc/cni/
rm -rf ~/.kube/

# 3. Remove network interfaces
ip link delete cni0 || true
ip link delete flannel.1 || true

# 4. Flush iptables
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X

# 5. Stop containerd and clean data
systemctl stop containerd
rm -rf /var/lib/containerd/*
systemctl start containerd

# 6. Reboot (recommended)
reboot
```

---

## Prevention: Check Before Deployment

Before running the deployment script, check if Kubernetes is already installed:

```bash
# Check if kubeadm is configured
kubeadm version

# Check if kubelet is running
systemctl status kubelet

# Check if ports are in use
netstat -tuln | grep -E ':(6443|10259|10257|10250)'

# If any of these return results, run cleanup first
```

---

## Complete Fresh Deployment Workflow

```bash
# 1. SSH into server
ssh root@hr.example.com

# 2. Check for existing installation
netstat -tuln | grep -E ':(6443|10259|10257|10250)'

# 3. If ports are in use, clean up
bash scripts/k8s-cleanup.sh

# 4. Edit deployment configuration
vim k8s-backup-restore-deploy.sh
# Update: DOPPLER_TOKEN, TAILSCALE_*, GHCR_*, etc.

# 5. Run deployment
bash k8s-backup-restore-deploy.sh

# 6. Monitor progress (in another terminal)
tail -f /var/log/k8s-backup-restore-*.log

# 7. Verify deployment
kubectl get pods --all-namespaces
```

---

## Troubleshooting

### Issue: Cleanup script fails

**Solution**: Reboot the server
```bash
reboot
# Wait 2 minutes, then SSH back in
# Re-run deployment script
```

### Issue: Ports still in use after cleanup

**Check what's using the port:**
```bash
lsof -i :6443
# Kill the process
kill -9 <PID>
```

### Issue: CNI interfaces won't delete

**Force remove:**
```bash
ip link set cni0 down
ip link delete cni0
```

### Issue: containerd won't start after cleanup

**Reconfigure containerd:**
```bash
rm /etc/containerd/config.toml
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
```

---

## Next Steps After Successful Deployment

1. **Test Application Access**
   ```bash
   curl -I https://hr.example.com
   ```

2. **Verify Database**
   ```bash
   kubectl exec -it -n sveltehr-prod sveltehr-prod-postgres-cluster-1 -- \
     psql -U postgres -d hr_system -c "\dt"
   ```

3. **Check Backups**
   ```bash
   velero backup get
   velero schedule get
   ```

4. **Access Monitoring**
   ```bash
   # Prometheus
   kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090 &

   # Grafana
   kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80 &
   ```

5. **Configure DNS** (if migrating)
   - Update A record to point to new server IP
   - Wait for propagation (5-60 minutes)

---

## Summary: Recovery Commands

```bash
# Quick cleanup and redeploy
cd /root/SvelteHR
bash scripts/k8s-cleanup.sh
# Type 'yes' when prompted
bash k8s-backup-restore-deploy.sh

# Or manual cleanup + reboot
kubeadm reset -f
rm -rf /etc/kubernetes /var/lib/kubelet /var/lib/etcd /etc/cni ~/.kube
reboot
# After reboot
bash k8s-backup-restore-deploy.sh
```

---

**End of Quick Start Guide**
