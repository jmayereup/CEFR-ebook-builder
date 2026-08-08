# Deployment Guide for `tj-books`

This document details the configuration for deploying the `tj-books` service (`tj-books.service`) and setting up the Nginx reverse proxy.

---

## 1. Systemd Service Setup

Create or update the systemd service file at `/etc/systemd/system/tj-books.service`:

```ini
[Unit]
Description=TJ Books CEFR Story Generator Service
After=network.target

[Service]
Type=simple
User=jmayer
Group=jmayer
WorkingDirectory=/opt/tj-books

# Load environment variables directly from .env file
EnvironmentFile=/opt/tj-books/.env

# Default fallbacks if not defined in .env
Environment=NODE_ENV=production
Environment=PORT=3009

ExecStart=/usr/bin/node /opt/tj-books/dist/server.cjs
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=tj-books

[Install]
WantedBy=multi-user.target
```

> **Note**: If `node` is installed via NVM under the `jmayer` home directory, adjust `ExecStart` accordingly (e.g. `/home/jmayer/.nvm/versions/node/v24.19.0/bin/node /opt/tj-books/dist/server.cjs`).

After creating or updating the service file:
```bash
sudo systemctl daemon-reload
sudo systemctl enable tj-books.service
sudo systemctl start tj-books.service
```

---

## 2. Passwordless Sudo for Deployment User (`jmayer`)

To allow the non-root user `jmayer` to restart the service during automated deployments (`npm run deploy`), create a sudoers rule at `/etc/sudoers.d/tj-books`:

```bash
sudo visudo -f /etc/sudoers.d/tj-books
```

Add the following configuration:

```sudoers
jmayer ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart tj-books.service, /usr/bin/systemctl is-active tj-books.service, /usr/bin/systemctl status tj-books.service, /bin/systemctl restart tj-books.service, /bin/systemctl is-active tj-books.service, /bin/systemctl status tj-books.service
```

Set permissions on the sudoers file:
```bash
sudo chmod 0440 /etc/sudoers.d/tj-books
```

---

## 3. Nginx Reverse Proxy Configuration

Create an Nginx configuration file at `/etc/nginx/sites-available/books.teacherjake.com`:

```nginx
# HTTP - Redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name books.teacherjake.com;

    return 301 https://$host$request_uri;
}

# HTTPS - Proxy to local Express SSR server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name books.teacherjake.com;

    # SSL Certificate Paths
    ssl_certificate /etc/ssl/certs/cloudflare_origin.crt;
    ssl_certificate_key /etc/ssl/private/cloudflare_origin.key;

    # SSL Security Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Max Upload Size (for cover uploads / sync)
    client_max_body_size 10M;

    # Proxy to Node application
    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;

        # Header Forwarding
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/books.teacherjake.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Environment Variables Reference & Best Practices

Managing secrets with `EnvironmentFile=/opt/tj-books/.env` in `tj-books.service` provides the best balance:

- Systemd automatically passes all variables to `process.env`.
- Secrets stay in `/opt/tj-books/.env` (permissions `600` or `640`).
- App code works consistently in dev and prod without hardcoding service configs.

Sample `/opt/tj-books/.env` contents on server:

```ini
PORT=3009
NODE_ENV=production
DEPLOY_SERVICE_NAME=tj-books.service
VITE_BACKEND_PROVIDER=pocketbase
VITE_POCKETBASE_URL=https://pb.teacherjake.com
POCKETBASE_ADMIN_EMAIL=...
POCKETBASE_ADMIN_PASSWORD=...
TJ_GEN_URL=https://gen.teacherjake.com
```
