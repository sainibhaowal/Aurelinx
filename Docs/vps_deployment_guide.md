# Production Deployment Guide: Aurelinx on VPS

This guide provides step-by-step instructions to deploy the Aurelinx HR Intelligence Platform on your Virtual Private Server (VPS) at **144.91.118.196** using Docker Compose.

---

## Prerequisites

Before starting, make sure you are logged into your VPS as `root`:
```bash
ssh root@144.91.118.196
```

---

## Step 1: Install Docker and Docker Compose on VPS

Run the following commands on your VPS terminal to update packages and install Docker:

```bash
# Update local packages
apt-get update && apt-get upgrade -y

# Install Docker dependencies
apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine, Buildx, and Docker Compose
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version
docker buildx version
```


```
cd /opt/aurelinx
git pull origin main
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps
```

### Troubleshooting: Missing `buildx` Plugin Warning
If you see the warning:
`WARN[0000] Docker Compose requires buildx plugin to be installed`
or if `docker buildx version` fails, manually install the binary plugin using these commands:
```bash
# Create CLI plugins directory
mkdir -p ~/.docker/cli-plugins

# Download the latest buildx binary (e.g., v0.15.1)
curl -SL https://github.com/docker/buildx/releases/download/v0.15.1/buildx-v0.15.1.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx

# Make the plugin executable
chmod +x ~/.docker/cli-plugins/docker-buildx

# Verify
docker buildx version
```

---

## Step 2: Clone the Repository

Clone the Aurelinx codebase onto your VPS. Since your repository is on GitHub (`sainibhaowal/Aurelinx`), run:

```bash
# Clone using HTTPS (simplest for VPS without SSH keys registered on GitHub)
git clone https://github.com/sainibhaowal/Aurelinx.git /var/www/aurelinx

# Navigate to the repository
cd /var/www/aurelinx
```

> [!NOTE]
> Cloning a fresh copy from GitHub will automatically restore all standard directory structures, including the `infra/` folder with configuration templates.

---

## Step 3: Configure Environment Variables

1. Navigate to the `infra/` folder:
   ```bash
   cd /var/www/aurelinx/infra
   ```
2. Create your production environment file from the example:
   ```bash
   cp .env.production.example .env.production
   ```
3. Open `.env.production` for editing (e.g., using `nano .env.production`):
   ```bash
   nano .env.production
   ```

### Core Configuration Adjustments

Modify the variables below to align with your VPS IP address and secure credentials.

```ini
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# --- Database Credentials (Change the default passwords for security!) ---
POSTGRES_DB=aurelinx_db
POSTGRES_USER=aurelinx
POSTGRES_PASSWORD=SECURE_DATABASE_PASSWORD_HERE
POSTGRES_PORT=55433
POSTGRES_SCHEMA=app
DATABASE_URL=postgresql+psycopg://aurelinx:SECURE_DATABASE_PASSWORD_HERE@postgres:5432/aurelinx_db?options=-csearch_path%3Dapp,public

# --- Redis Configuration ---
REDIS_PASSWORD=SECURE_REDIS_PASSWORD_HERE
REDIS_PORT=6380
REDIS_URL=redis://:SECURE_REDIS_PASSWORD_HERE@redis:6379/0

# --- Networking & URLs (Crucial for remote access) ---
API_PORT=5100
WEB_PORT=3100

# Replace localhost with your VPS Public IP
NEXT_PUBLIC_API_URL=http://144.91.118.196:5100
FRONTEND_URL=http://144.91.118.196:3100
ALLOWED_ORIGINS=http://144.91.118.196:3100
ALLOWED_HOSTS=144.91.118.196,localhost,127.0.0.1,web,api

# --- JWT Configuration (Generate a strong secret key) ---
# You can generate one with: openssl rand -hex 32
SECRET_KEY=YOUR_SECURE_JWT_SECRET_KEY_HERE
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALGORITHM=HS256

# --- LLM API Keys (If utilizing agentic capabilities) ---
OPENAI_API_KEY=your-openai-api-key-here
CLAUDE_API_KEY=your-claude-api-key-here
GROQ_API_KEY=your-groq-api-key-here
```

Press `Ctrl + O` then `Enter` to save, and `Ctrl + X` to exit `nano`.

---

## Step 4: Build and Deploy the Containers

Build and run your full-stack application stack in the background:

```bash
docker compose -f infra/docker-compose.prod.yml up -d --build --no-deps web api worker scheduler
```

### Checking Services Status

Verify that all containers are healthy:
```bash
docker compose -f infra/docker-compose.prod.yml ps
```

You should see 7 running services:
- `aurelinx-postgres` (healthy)
- `aurelinx-redis` (healthy)
- `aurelinx-qdrant` (healthy)
- `aurelinx-api` (healthy)
- `aurelinx-worker` (running)
- `aurelinx-scheduler` (running)
- `aurelinx-web` (healthy)

---

## Step 5: Seed the Database with Initial Data

Once the services are active, initialize and populate the database with default admin credentials and dummy data:

```bash
docker compose -f infra/docker-compose.prod.yml exec api python -m app.core.seed_data
```

> [!TIP]
> After seeding, you can log in with:
> - **Username**: `admin@aurelinx.com`
> - **Password**: `AdminPassword123`

---

## Step 6: Access the App

You can now open your browser and navigate to:
- **Web App Front-end**: `http://144.91.118.196:3100`
- **Backend API & Swagger Documentation**: `http://144.91.118.196:5100/api/v1/docs`

---

## Step 7: (Recommended) Setup Nginx and SSL

To expose the application over secure HTTPS (`https://yourdomain.com`) instead of raw IP ports, set up Nginx on the VPS:

1. **Install Nginx**:
   ```bash
   apt-get install -y nginx
   ```
2. **Configure Nginx**: Create `/etc/nginx/sites-available/aurelinx` with:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com; # Replace with your domain

       # Frontend UI
       location / {
           proxy_pass http://127.0.0.1:3100;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Backend API Gateway
       location /api/ {
           proxy_pass http://127.0.0.1:5100;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. **Enable configuration and reload**:
   ```bash
   ln -s /etc/nginx/sites-available/aurelinx /etc/nginx/sites-enabled/
   rm /etc/nginx/sites-enabled/default
   nginx -t && systemctl restart nginx
   ```
4. **Acquire Let's Encrypt SSL Certificate**:
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```
5. **Update `.env.production` URLs**: Update your URLs in `.env.production` to `https://yourdomain.com` and run `docker compose -f infra/docker-compose.prod.yml up -d` to apply changes.

---

## Useful Maintenance Commands

- **View Logs**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml logs -f
  ```
- **Stop Applications**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml down
  ```
- **Restart Application**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml restart
  ```
