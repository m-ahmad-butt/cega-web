# AWS — manual bootstrap (both servers)

Host nginx / TLS is done by CI `init:*` — not here.

| Item | Staging (blue) | Production (green) |
|------|----------------|--------------------|
| EIP | `3.108.49.218` | `3.7.93.239` |
| Deploy dir | `/opt/web-comp-stage` | `/opt/web-comp` |
| Runner tag | `web-staging` | `web-production` |
| Domain | `web-comp-stage.duckdns.org` | `web-comp.duckdns.org` |
| SSH key | `terraform/server-web.pem` | same |

```powershell
.\ssh-stage.ps1    # staging
.\ssh.ps1          # production
```

---

## 0) Terraform (once)

```bash
cd terraform && terraform init && terraform apply
```

---

## 1) System + Docker (both)

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git rsync ufw
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Log out / SSH back in for docker group.

---

## 2) Deploy dir (stage / prod)

**Staging**

```bash
sudo mkdir -p /opt/web-comp-stage
```

**Production**

```bash
sudo mkdir -p /opt/web-comp
```

---

## 3) GitLab Runner + register (both)

```bash
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt-get install -y gitlab-runner
sudo usermod -aG docker gitlab-runner
sudo systemctl enable --now gitlab-runner

# ownership after runner user exists
sudo chown gitlab-runner:gitlab-runner /opt/web-comp-stage   # staging
sudo chown gitlab-runner:gitlab-runner /opt/web-comp         # production

sudo gitlab-runner register
```

| Prompt | Staging | Production |
|--------|---------|------------|
| GitLab URL | `https://gitlab.com/` | same |
| Token | project runner token | same |
| Description | `web-staging` | `web-production` |
| Tags | `web-staging` | `web-production` |
| Executor | `shell` | `shell` |

```bash
sudo gitlab-runner list
sudo gitlab-runner status
```

DuckDNS: `web-comp-stage` → `3.108.49.218`, `web-comp` → `3.7.93.239`.

---

## 4) After first deploy — passwordless sudo for init (once per server)

Run this **once** after `deploy:*`, then play `init:*` in GitLab:

**Staging**

```bash
sudo bash /opt/web-comp-stage/scripts/ci/install-runner-sudoers.sh
```

**Production**

```bash
sudo bash /opt/web-comp/scripts/ci/install-runner-sudoers.sh
```

---

