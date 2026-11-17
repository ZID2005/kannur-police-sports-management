# Kannur City Police Sports Facilities Management System — On-Premise Deployment Guide

This guide provides step-by-step installation, seeding, TLS configuration, backup, and maintenance procedures for the **Kannur City Police Department Server Administrator**.

The stack runs **100% on-premise** inside the department LAN/intranet with zero external cloud dependencies.

---

## 1. Architecture Overview

| Service | Container Name | Purpose | Network Exposure |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `kcp_sports_postgres` | Persistent local database + immutable `audit_logs` triggers | Internal Docker bridge (`kcp_intranet`) only |
| **Node.js / Express API** | `kcp_sports_backend` | REST API (`/api/*`), Prisma ORM, HTTP-only cookie (`kcp_session`) auth | Internal port `4000` (proxied via Nginx) |
| **Nginx Reverse Proxy** | `kcp_sports_nginx` | Serves compiled `frontend/dist` static bundle & proxies `/api/*` | LAN Ports `80` / `443` |

---

## 2. Server Prerequisites

- **OS:** Ubuntu 22.04/24.04 LTS, Debian 12, or RHEL 9 (x86_64)
- **Software:**
  - Docker Engine (`>= 24.0`) and Docker Compose plugin (`docker compose version`)
  - Node.js 20 LTS (only required if building `frontend/dist` directly on the host)
  - `openssl` & `cron`

---

## 3. Step-by-Step Initial Deployment

### Step 3.1: Prepare Environment Variables
Copy the environment template and set strong local secrets:

```bash
cp .env.example .env
```

Edit `.env` on the server:
```env
POSTGRES_DB=kcp_sports_db
POSTGRES_USER=kcp_app_user
POSTGRES_PASSWORD=<STRONG_RANDOM_LOCAL_DB_PASSWORD>

# Generate a 64-byte hex secret: openssl rand -hex 64
JWT_SECRET=<64_BYTE_CRYPTOGRAPHIC_HEX_SECRET>
JWT_EXPIRES_IN=8h
SESSION_COOKIE_NAME=kcp_session

# Set to true once HTTPS TLS certificates are enabled in nginx/nginx.conf
SESSION_COOKIE_SECURE=false

# Set to the exact LAN/Intranet URL used in browsers
ALLOWED_ORIGIN=http://192.168.1.50
BCRYPT_SALT_ROUNDS=12
```

### Step 3.2: Build the Frontend Production Bundle
Compile the React + TypeScript + Vite bundle into `frontend/dist`:

```bash
cd frontend
npm ci
npm run build
cd ..
```

### Step 3.3: Create Required Local Directories
Ensure certificate and backup mount directories exist before launching Compose:

```bash
mkdir -p nginx/certs backups
chmod +x scripts/backup_postgres.sh
```

### Step 3.4: Launch the On-Premise Stack
Build the multi-stage backend image and start all containers in detached mode:

```bash
docker compose up -d --build
```

The backend container automatically runs `npx prisma migrate deploy` on startup before launching `node dist/server.js`.

### Step 3.5: Seed Initial Facilities, Tariffs & Department Accounts
Run the idempotent seed script inside the running backend container:

```bash
docker exec -it kcp_sports_backend npm run prisma:seed
```

Verify service health:
```bash
curl -fsS http://localhost/api/health
```

---

## 4. Initial Seeded Credentials

The seed script initializes the 4 Kannur City Police sports facilities (`SYNTHETIC_TRACK`, `FOOTBALL_GROUND`, `POLICE_TURF`, `BADMINTON_COURT`), official GST (18%) tariffs, and the following starter accounts:

| Role | Username | Initial Password | Default Portal Redirect |
| :--- | :--- | :--- | :--- |
| **Staff Admin (`STAFF_ADMIN`)** | `insp_rajeev` | `KcpAdmin@2026!` | `/admin/dashboard` |
| **Gate Officer (`GATE_OFFICER`)** | `hc_pradeep` | `KcpGate@2026!` | `/gate/scanner` |
| **Citizen (`PUBLIC`)** | `priya_mohan` | `PriyaSports@2026!` | `/` |

> **Security Advisory:** Immediately rotate the initial passwords for `insp_rajeev` and `hc_pradeep` after initial verification and store credentials in the District Police Office vault.

---

## 5. Enabling Department LAN HTTPS Termination

For intranet HTTPS (recommended for HTTP-only `kcp_session` cookies with `Secure` flag):

1. Place your internal CA-signed or self-signed certificate and private key in `./nginx/certs/`:
   ```bash
   openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
     -keyout nginx/certs/kcp-sports.key \
     -out nginx/certs/kcp-sports.crt \
     -subj "/CN=sports.kannurpolice.kerala.gov.in/O=Kannur City Police/C=IN"
   ```
2. Uncomment the `listen 443 ssl http2;` server block in `nginx/nginx.conf`.
3. Update `.env`:
   - `SESSION_COOKIE_SECURE=true`
   - `ALLOWED_ORIGIN=https://sports.kannurpolice.kerala.gov.in`
4. Restart Nginx and Backend:
   ```bash
   docker compose up -d --force-recreate backend nginx
   ```

---

## 6. Automated Daily PostgreSQL Backups & Restore

### 6.1 Schedule Automated Daily Backups
Install a daily `cron` job running `scripts/backup_postgres.sh` at 02:00 AM IST:

```bash
crontab -e
```
Add:
```cron
0 2 * * * /opt/kcp-sports/scripts/backup_postgres.sh >> /var/log/kcp_pg_backup.log 2>&1
```

Backups are saved to `./backups/kcp_sports_db_YYYYMMDD_HHMMSS.sql.gz` along with `.sha256` checksums, with automatic 30-day retention pruning.

### 6.2 Restoring from a Backup
```bash
# Verify checksum first
sha256sum -c backups/kcp_sports_db_20261117_020000.sql.gz.sha256

# Restore into the running PostgreSQL container
gunzip -c backups/kcp_sports_db_20261117_020000.sql.gz | \
  docker exec -i kcp_sports_postgres psql -U kcp_app_user -d kcp_sports_db
```

---

## 7. Gate Scanner Offline Resilience Operations

- When the Gate Verification Kiosk (`/gate/scanner`) starts, it automatically downloads a signed cache manifest via `GET /api/gate/sync-cache` and stores it in browser `localStorage`.
- During LAN outages, Gate Officers continue scanning passes and recording manual overrides (`§ 6.28`), which queue locally in `localStorage`.
- As soon as network connectivity returns, the kiosk automatically dispatches queued entries via `POST /api/gate/batch-sync` (or the officer can click **Sync Offline Queue**).

---

## 8. Routine Maintenance Commands

| Task | Command |
| :--- | :--- |
| Check running container status | `docker compose ps` |
| View live backend logs | `docker compose logs -f backend` |
| View Nginx access/error logs | `docker compose logs -f nginx` |
| Run manual database backup | `./scripts/backup_postgres.sh` |
| Restart backend safely | `docker compose restart backend` |
| Rebuild after code update | `cd frontend && npm run build && cd .. && docker compose up -d --build` |
