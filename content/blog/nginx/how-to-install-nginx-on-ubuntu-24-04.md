---
title: "How to Install and configure Nginx on Ubuntu 24 04"
description: "A complete step-by-step guide to installing Nginx on Ubuntu 24.04 LTS — covering installation, firewall setup, virtual hosts, SSL with Let's Encrypt, performance tuning, and production hardening."
date: 2026-04-06T19:44:56+05:30
author: "TechWithDB"
tags: ["Nginx", "Ubuntu", "Linux", "Web Server", "DevOps", "SSL", "TLS"]
series: "Linux Web Server Setup"
level: "Beginner"
draft: false
---

## Overview

**Nginx** (pronounced *engine-x*) is one of the world's most popular open-source web servers. It is also widely used as a **reverse proxy**, **load balancer**, and **HTTP cache**. In this guide you will go from a fresh Ubuntu 24.04 server to a fully configured, SSL-secured, production-ready Nginx setup.

{{< callout type="info" title="What You Will Learn" >}}
- Install Nginx on Ubuntu 24.04 LTS
- Configure UFW firewall rules
- Set up virtual hosts (server blocks)
- Secure your site with free SSL via Let's Encrypt
- Tune Nginx for production performance
- Harden Nginx security headers
{{< /callout >}}

---

## Prerequisites

Before you begin, make sure you have:

- A server running **Ubuntu 24.04 LTS**
- A non-root user with **sudo** privileges
- A domain name pointed at your server's IP (for SSL setup)
- Basic familiarity with the Linux command line

{{< callout type="tip" title="Check Your Ubuntu Version" >}}
Run `lsb_release -a` to confirm you are on Ubuntu 24.04 LTS (Noble Numbat).
{{< /callout >}}

---

## Step 1 — Update the System

Always update your package index before installing anything. This ensures you get the latest stable version of Nginx.

```bash
sudo apt update && sudo apt upgrade -y
```

Check the current system and available Nginx version:

```bash
# Check Ubuntu version
lsb_release -a

# Check available Nginx version
apt-cache policy nginx
```

**Expected output:**
```
nginx:
  Installed: (none)
  Candidate: 1.24.0-2ubuntu7
  Version table:
     1.24.0-2ubuntu7 500
        500 http://archive.ubuntu.com/ubuntu noble/main amd64 Packages
```

---

## Step 2 — Install Nginx

Install Nginx from the official Ubuntu repository:

```bash
sudo apt install nginx -y
```

After installation, verify Nginx is installed and check the version:

```bash
nginx -v
```

```
nginx version: nginx/1.24.0 (Ubuntu)
```

{{< callout type="tip" title="Want the Latest Nginx?" >}}
The Ubuntu repository may not always have the very latest Nginx. To install the latest stable version directly from the official Nginx repository, add the Nginx PPA:

```bash
sudo add-apt-repository ppa:nginx/stable -y
sudo apt update
sudo apt install nginx -y
```
{{< /callout >}}

---

## Step 3 — Start and Enable Nginx

Start the Nginx service and enable it to auto-start on boot:

```bash
# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check the status
sudo systemctl status nginx
```

**Expected output:**
```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Mon 2025-01-20 10:00:00 UTC; 5s ago
```

**Useful Nginx service commands:**

```bash
sudo systemctl start nginx      # Start
sudo systemctl stop nginx       # Stop
sudo systemctl restart nginx    # Restart (drops connections briefly)
sudo systemctl reload nginx     # Reload config (no downtime)
sudo systemctl status nginx     # Check status
sudo nginx -t                   # Test configuration syntax
```

{{< callout type="warn" title="Always Test Before Reloading" >}}
Always run `sudo nginx -t` before reloading Nginx. A bad config will crash Nginx if you reload without testing first.
{{< /callout >}}

---

## Step 4 — Configure UFW Firewall

Ubuntu 24.04 uses **UFW** (Uncomplicated Firewall). Nginx registers itself as an application profile automatically during installation.

```bash
# Check available Nginx profiles
sudo ufw app list
```

```
Available applications:
  Nginx Full
  Nginx HTTP
  Nginx HTTPS
  OpenSSH
```

| Profile | Opens Ports | Use When |
|---------|------------|----------|
| `Nginx HTTP` | Port 80 | HTTP only (no SSL yet) |
| `Nginx HTTPS` | Port 443 | HTTPS only |
| `Nginx Full` | Ports 80 + 443 | Both HTTP and HTTPS |

```bash
# Allow both HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Always keep SSH open or you will be locked out!
sudo ufw allow 'OpenSSH'

# Enable UFW (if not already enabled)
sudo ufw enable

# Verify the rules
sudo ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
Nginx Full                 ALLOW       Anywhere
OpenSSH                    ALLOW       Anywhere
Nginx Full (v6)            ALLOW       Anywhere (v6)
OpenSSH (v6)               ALLOW       Anywhere (v6)
```

{{< callout type="danger" title="Never Lock Yourself Out" >}}
Always allow OpenSSH **before** enabling UFW. If you block port 22, you will lose SSH access to your server and have no way back in without a console.
{{< /callout >}}

Now test the default Nginx page. Open your browser and visit:
```
http://your-server-ip
```

You should see the **"Welcome to nginx!"** default page. ✅

---

## Step 5 — Understand the Nginx Directory Structure

Before editing config files, understand how Nginx is organised on Ubuntu:

```
/etc/nginx/
├── nginx.conf                  ← Main config file
├── conf.d/                     ← Drop-in global configs
├── sites-available/            ← All virtual host configs (enabled or not)
│   └── default                 ← Default server block
├── sites-enabled/              ← Symlinks to active virtual hosts
│   └── default -> ../sites-available/default
├── modules-available/          ← Available modules
├── modules-enabled/            ← Active modules (symlinks)
├── snippets/                   ← Reusable config snippets
│   ├── fastcgi-php.conf
│   └── snakeoil.conf
└── mime.types                  ← MIME type mappings

/var/www/
└── html/                       ← Default web root
    └── index.nginx-debian.html

/var/log/nginx/
├── access.log                  ← All incoming requests
└── error.log                   ← Errors and warnings
```

{{< callout type="info" title="sites-available vs sites-enabled" >}}
- **`sites-available/`** stores all your virtual host config files
- **`sites-enabled/`** contains only symlinks to the configs you want active
- This pattern lets you disable a site by removing the symlink without deleting the config
{{< /callout >}}

---

## Step 6 — Create a Virtual Host (Server Block)

A **server block** in Nginx is the equivalent of a virtual host in Apache. It tells Nginx how to respond to requests for a specific domain.

### 6.1 Create the Web Root Directory

```bash
# Replace yourdomain.com with your actual domain
sudo mkdir -p /var/www/yourdomain.com/html

# Set correct ownership
sudo chown -R $USER:$USER /var/www/yourdomain.com/html

# Set correct permissions
sudo chmod -R 755 /var/www/yourdomain.com
```

### 6.2 Create a Test HTML Page

```bash
nano /var/www/yourdomain.com/html/index.html
```

Paste this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to yourdomain.com</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f0f4f8;
        }
        .container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 { color: #2d6a4f; }
        p  { color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Nginx is Working!</h1>
        <p>yourdomain.com is successfully served by Nginx on Ubuntu 24.04</p>
    </div>
</body>
</html>
```

### 6.3 Create the Server Block Config

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Paste this complete server block:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name yourdomain.com www.yourdomain.com;
    root        /var/www/yourdomain.com/html;
    index       index.html index.htm;

    # Logging
    access_log /var/log/nginx/yourdomain.com.access.log;
    error_log  /var/log/nginx/yourdomain.com.error.log;

    location / {
        try_files $uri $uri/ =404;
    }

    # Deny access to hidden files (e.g. .htaccess, .git)
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 6.4 Enable the Virtual Host

```bash
# Create a symlink in sites-enabled
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Test the config
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
# Reload Nginx to apply the changes
sudo systemctl reload nginx
```

Visit `http://yourdomain.com` — you should see your custom HTML page. ✅

{{< callout type="tip" title="Disable the Default Site" >}}
Remove the default Nginx page to avoid conflicts:
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```
{{< /callout >}}

---

## Step 7 — Install SSL with Let's Encrypt (Free HTTPS)

Let's Encrypt provides **free, auto-renewing SSL certificates** via the `certbot` tool.

### 7.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Obtain and Install the Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
1. Ask for your email address (for renewal reminders)
2. Ask you to agree to the Terms of Service
3. Automatically obtain the certificate
4. Modify your Nginx config to enable HTTPS
5. Set up auto-renewal

**Example interaction:**
```
Enter email address: you@example.com
(A)gree: A
(Y)es/(N)o: Y

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/yourdomain.com/privkey.pem

Deploying certificate to VirtualHost /etc/nginx/sites-enabled/yourdomain.com
Redirecting all traffic on port 80 to ssl in /etc/nginx/sites-enabled/yourdomain.com
```

### 7.3 Verify Auto-Renewal

Let's Encrypt certificates expire every **90 days**. Certbot automatically creates a systemd timer to renew them:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Test renewal (dry run — does not actually renew)
sudo certbot renew --dry-run
```

```
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/yourdomain.com/fullchain.pem (success)
```

{{< callout type="tip" title="Your Final HTTPS Config" >}}
After certbot runs, your `/etc/nginx/sites-available/yourdomain.com` will look like this:
```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/yourdomain.com/html;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;  # Redirect HTTP → HTTPS
}
```
{{< /callout >}}

---

## Step 8 — Configure Nginx as a Reverse Proxy

One of the most common Nginx uses is as a **reverse proxy** — forwarding traffic to a backend app (Node.js, Python, Java, etc.) running on a local port.

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Replace the content with this reverse proxy config:

```nginx
upstream backend {
    server 127.0.0.1:3000;   # Your backend app (e.g. Node.js on port 3000)
    keepalive 32;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Logging
    access_log /var/log/nginx/yourdomain.com.access.log;
    error_log  /var/log/nginx/yourdomain.com.error.log;

    location / {
        proxy_pass         http://backend;
        proxy_http_version 1.1;

        # Pass real client info to backend
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        # Buffer settings
        proxy_buffering    on;
        proxy_buffer_size  4k;
        proxy_buffers      8 4k;
    }

    # Serve static files directly (bypass backend)
    location /static/ {
        alias /var/www/yourdomain.com/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /nginx-health {
        return 200 "OK\n";
        add_header Content-Type text/plain;
        access_log off;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 9 — Performance Tuning

Edit the main Nginx config to tune performance for production:

```bash
sudo nano /etc/nginx/nginx.conf
```

Replace with this optimised configuration:

```nginx
user www-data;

# Set to number of CPU cores (auto detects automatically)
worker_processes auto;

# Max open file descriptors per worker (increase for high traffic)
worker_rlimit_nofile 65535;

error_log /var/log/nginx/error.log warn;
pid       /run/nginx.pid;

events {
    # Max simultaneous connections per worker
    worker_connections 4096;

    # Accept multiple connections at once
    multi_accept on;

    # Most efficient connection method on Linux
    use epoll;
}

http {
    # ── Basic settings ──────────────────────────────────────
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Efficient file transfers (avoids user-space copy)
    sendfile    on;
    tcp_nopush  on;
    tcp_nodelay on;

    # How long to keep idle connections open
    keepalive_timeout  65;
    keepalive_requests 1000;

    # ── Log format ──────────────────────────────────────────
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time';

    access_log /var/log/nginx/access.log main;

    # ── Gzip compression ─────────────────────────────────────
    gzip              on;
    gzip_vary         on;
    gzip_proxied      any;
    gzip_comp_level   6;
    gzip_min_length   256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/woff2;

    # ── Client upload limits ─────────────────────────────────
    client_max_body_size     50M;
    client_body_buffer_size  128k;
    client_header_buffer_size 1k;

    # ── Timeouts ─────────────────────────────────────────────
    client_body_timeout   12s;
    client_header_timeout 12s;
    send_timeout          10s;

    # ── Security: hide Nginx version ─────────────────────────
    server_tokens off;

    # ── Include virtual host configs ─────────────────────────
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 10 — Security Hardening

Create a security snippet that you can include in all your server blocks:

```bash
sudo nano /etc/nginx/snippets/security-headers.conf
```

```nginx
# ── Security Headers ─────────────────────────────────────────
# Prevent clickjacking
add_header X-Frame-Options           "SAMEORIGIN"            always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options    "nosniff"               always;

# Enable XSS protection
add_header X-XSS-Protection          "1; mode=block"         always;

# Force HTTPS for 1 year (includeSubDomains)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Control referrer information
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

# Restrict browser features
add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

# Content Security Policy — adjust as needed
add_header Content-Security-Policy   "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;" always;
```

Create an SSL hardening snippet:

```bash
sudo nano /etc/nginx/snippets/ssl-hardening.conf
```

```nginx
# ── SSL / TLS Hardening ──────────────────────────────────────
# Only allow TLS 1.2 and 1.3
ssl_protocols TLSv1.2 TLSv1.3;

# Strong cipher suites only
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;

# SSL session caching for performance
ssl_session_cache   shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP stapling (faster SSL handshake)
ssl_stapling        on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

Now include these snippets in your server block:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Include security hardening snippets
    include snippets/ssl-hardening.conf;
    include snippets/security-headers.conf;

    # ... rest of your config
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 11 — Set Up Log Rotation

Nginx logs can grow large on busy servers. Configure log rotation:

```bash
cat /etc/logrotate.d/nginx
```

The default config already rotates logs daily. Verify it looks like this:

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

---

## Step 12 — Monitor Nginx

### Enable the Nginx Status Page

```bash
sudo nano /etc/nginx/conf.d/status.conf
```

```nginx
server {
    listen 127.0.0.1:8080;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        allow 127.0.0.1;   # Only allow localhost
        deny all;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx

# Check the status page
curl http://127.0.0.1:8080/nginx_status
```

**Output:**
```
Active connections: 12
server accepts handled requests
 1234 1234 5678
Reading: 0 Writing: 1 Waiting: 11
```

### Useful Monitoring Commands

```bash
# Real-time access log
sudo tail -f /var/log/nginx/access.log

# Real-time error log
sudo tail -f /var/log/nginx/error.log

# Count requests per second (last 1000 lines)
sudo tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Top 10 most visited URLs
sudo awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Check Nginx process and memory
ps aux | grep nginx
```

---

## Troubleshooting

{{< callout type="warn" title="Common Nginx Issues and Fixes" >}}
**Issue: `nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)`**
```bash
# Find what is using port 80
sudo lsof -i :80
sudo systemctl stop apache2   # If Apache is running
```

**Issue: `502 Bad Gateway`**
```bash
# Your backend app is not running or crashed
sudo systemctl status your-app
sudo tail -f /var/log/nginx/error.log
```

**Issue: `403 Forbidden`**
```bash
# Check file permissions
ls -la /var/www/yourdomain.com/html/
sudo chmod -R 755 /var/www/yourdomain.com/
sudo chown -R www-data:www-data /var/www/yourdomain.com/
```

**Issue: Config test fails**
```bash
# See detailed error
sudo nginx -t
# Fix the error shown, then reload
sudo systemctl reload nginx
```
{{< /callout >}}

---

## Summary

| Step | What You Did |
|------|-------------|
| **1** | Updated system packages |
| **2** | Installed Nginx from Ubuntu repository |
| **3** | Started and enabled Nginx as a system service |
| **4** | Configured UFW firewall to allow HTTP and HTTPS |
| **5** | Learnt the Nginx directory structure |
| **6** | Created a virtual host (server block) for your domain |
| **7** | Secured the site with a free Let's Encrypt SSL certificate |
| **8** | Configured Nginx as a reverse proxy for a backend app |
| **9** | Tuned Nginx for production performance |
| **10** | Added security headers and SSL hardening |
| **11** | Verified log rotation is configured |
| **12** | Set up monitoring and real-time log viewing |

{{< callout type="tip" title="Next Steps" >}}
Now that Nginx is running, explore these topics:
- **Load balancing** — distribute traffic across multiple backend servers
- **Rate limiting** — protect your API with `limit_req_zone`
- **Caching** — use `proxy_cache` to cache backend responses
- **HTTP/2** — add `http2` to your listen directives for faster page loads
- **ModSecurity WAF** — add a Web Application Firewall to Nginx
{{< /callout >}}
