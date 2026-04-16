---
title: "Docker Complete Guide: Containers from Zero to Production"
description: "Master Docker with hands-on examples — Dockerfiles, multi-stage builds, Docker Compose, networking, volumes, and production security best practices."
date: 2024-02-01
author: "DB"
tags: ["docker", "containers", "devops", "dockerfile", "docker-compose"]
series: "Docker Mastery"
level: "Beginner to Advanced"
---

## What is Docker?

Docker packages your application and all its dependencies into a **container** — a lightweight, isolated, portable unit that runs identically on any machine.

{{< callout type="tip" title="Container vs VM" >}}
Containers share the host OS kernel (seconds to start, ~MB). VMs run a full OS (minutes to start, ~GB). Docker gives you isolation at a fraction of the overhead.
{{< /callout >}}

## Install Docker

```bash
# Ubuntu / Debian (one-liner)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker version
docker run --rm hello-world
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Image** | Read-only template (built from Dockerfile) |
| **Container** | Running instance of an image |
| **Dockerfile** | Instructions to build an image |
| **Registry** | Storage for images (Docker Hub, AWS ECR, GHCR) |
| **Volume** | Persistent data storage |
| **Network** | Communication layer between containers |

## Write a Production Dockerfile

```dockerfile
# Dockerfile — Node.js Application
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production image (minimal)
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps     /app/node_modules ./node_modules
COPY --from=builder  /app/dist         ./dist

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

```bash
# Build
docker build -t myapp:1.0.0 .
docker build -t myapp:1.0.0 --platform linux/amd64 .  # for M1/M2 Macs

# Run
docker run -d -p 3000:3000 --name myapp \
  --env-file .env \
  --memory 512m --cpus 0.5 \
  myapp:1.0.0

# Inspect
docker logs -f myapp
docker stats myapp
docker exec -it myapp /bin/sh
```

## Docker Compose — Multi-Container Apps

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build: { context: ., target: production }
    ports: ["3000:3000"]
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_started }
    restart: unless-stopped
    networks: [app-net]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB:       myapp
      POSTGRES_USER:     appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [app-net]

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb
    volumes: [redis_data:/data]
    networks: [app-net]

  nginx:
    image: nginx:1.25-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on: [app]
    networks: [app-net]

volumes:
  pg_data:
  redis_data:

networks:
  app-net:
    driver: bridge
```

```bash
docker compose up -d           # start all services
docker compose logs -f app     # follow app logs
docker compose ps              # status
docker compose exec app sh     # shell into app
docker compose down -v         # stop + remove volumes
```

## Essential Commands

```bash
# === Images ===
docker pull nginx:alpine
docker build -t myapp:latest .
docker images
docker rmi myapp:latest
docker image prune -a          # remove unused images

# === Containers ===
docker run -d -p 80:80 --name web nginx:alpine
docker ps -a
docker stop web && docker rm web
docker restart web
docker inspect web

# === Volumes ===
docker volume create appdata
docker run -v appdata:/data nginx

# === Networks ===
docker network create mynet
docker run --network mynet --name db postgres:16
docker network inspect mynet

# === Registry ===
docker login ghcr.io
docker tag myapp:latest ghcr.io/username/myapp:v1.0
docker push ghcr.io/username/myapp:v1.0
```

## .dockerignore

```
node_modules/
.git/
.github/
*.md
.env
.env.*
Dockerfile*
docker-compose*
coverage/
dist/
.DS_Store
```

{{< callout type="warn" title="Production Security Checklist" >}}
- ✅ Never run as root — always add `USER` directive
- ✅ Use specific image tags — never `latest` in prod
- ✅ Scan images: `docker scout cves myapp:1.0.0`
- ✅ Secrets via env files or Docker Secrets — never baked into image
- ✅ Read-only filesystem: `--read-only` with tmpfs for writable dirs
- ✅ Resource limits: `--memory` and `--cpus`
{{< /callout >}}

## Best Practices Summary

1. **Multi-stage builds** — dramatically reduce final image size
2. **Non-root user** — `RUN adduser` + `USER` directive
3. **HEALTHCHECK** — define in every production Dockerfile
4. **Layer caching** — copy `package.json` before source code
5. **Specific tags** — pin exact versions for reproducible builds
6. **Scan images** — integrate Docker Scout or Trivy in CI/CD
