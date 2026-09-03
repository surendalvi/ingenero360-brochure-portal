# Production Deployment Guide: ingenero360.ai

This guide details how to deploy the **IngeneroX360AI Suite Brochure & Demos Portal** to your domain **`ingenero360.ai`** via GitHub.

---

## 📋 Step 1: Push Local Repository to GitHub

Open terminal / command prompt in your project root folder (`Brochure/`) and run:

```bash
# Initialize git if not already initialized
git init

# Add all project files (brochures/, demos.json, static/, app.py, templates/)
git add -A

# Commit all changes
git commit -m "Deploying IngeneroX360AI Brochure & Demos Portal for ingenero360.ai"

# Link your GitHub repository (replace YOUR_GITHUB_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ingenero360-brochure-portal.git

# Set main branch and push
git branch -M main
git push -u origin main
```

---

## 🌐 Step 2: Configure Domain DNS Records for `ingenero360.ai`

In your Domain Registrar DNS panel (e.g. GoDaddy, Cloudflare, Namecheap, Route53):

| Type | Host / Name | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| **A Record** | `@` (or `ingenero360.ai`) | `YOUR_SERVER_PUBLIC_IP` | Automatic / 300 |
| **CNAME** | `www` | `ingenero360.ai` | Automatic / 300 |

---

## 🖥️ Step 3: Server Setup (Ubuntu / Linux VPS or AWS EC2)

Connect to your server via SSH:

```bash
ssh ubuntu@YOUR_SERVER_PUBLIC_IP
```

### Install Required System Packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx
```

---

## 🚀 Step 4: Clone & Configure Service

### 1. Clone Project from GitHub:
```bash
sudo mkdir -p /var/www/ingenero360-portal
sudo chown -R $USER:$USER /var/www/ingenero360-portal
cd /var/www/ingenero360-portal

git clone https://github.com/YOUR_GITHUB_USERNAME/ingenero360-brochure-portal.git .
```

### 2. Create Python Virtual Environment & Install Dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Install & Start Systemd Service:
```bash
# Copy systemd service file
sudo cp ingenero360_portal.service /etc/systemd/system/

# Reload systemd daemon & start service
sudo systemctl daemon-reload
sudo systemctl enable ingenero360_portal.service
sudo systemctl start ingenero360_portal.service

# Verify service is running
sudo systemctl status ingenero360_portal.service
```

---

## 🔒 Step 5: Configure Nginx & SSL Certificate (`https://ingenero360.ai`)

### 1. Link Nginx Configuration:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/ingenero360.ai
sudo ln -s /etc/nginx/sites-available/ingenero360.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Issue Free SSL Certificate via Let's Encrypt Certbot:
```bash
sudo certbot --nginx -d ingenero360.ai -d www.ingenero360.ai
```
Follow the interactive prompts to enable automatic HTTPS redirection.

---

## 🐋 Alternative: Docker Compose Deployment

If you prefer containerized deployment:

```bash
# Build & start container
docker-compose up -d --build

# View logs
docker-compose logs -f
```

---

## ⚡ Step 6: Automated Auto-Deployments via GitHub Actions

Every time you add a brochure to the `brochures/` folder or edit a demo link:
1. `git add -A`
2. `git commit -m "Added new brochure"`
3. `git push origin main`

GitHub Actions will automatically test and trigger seamless deployment to **`https://ingenero360.ai`**!
