---
title: "Docker Interview Questions"
description: ""
date: 2026-04-07T14:26:30+05:30
author: "DB"
tags: []
tool: "docker"       # aws | docker | kubernetes | jenkins | prometheus | grafana
level: "All Levels"
question_count: 0
draft: false
---

<div class="qa-list">

## 🟢 Basic

{{< qa num="1" q="What is Docker and why is it used?" level="basic" >}}
**Docker** is an open-source platform that enables developers to build, package, ship, and run applications inside **containers**. Containers are lightweight, portable, and isolated environments that include everything needed to run an application — code, runtime, libraries, and dependencies.

**Why it's used:**
- Eliminates "works on my machine" issues
- Faster deployments and consistent environments
- Efficient resource usage compared to VMs
- Easy scaling and orchestration
{{< /qa >}}

{{< qa num="2" q="What is the difference between a Docker image and a Docker container?" level="basic" >}}
| | **Image** | **Container** |
|---|---|---|
| Definition | Read-only blueprint/template | Running instance of an image |
| State | Static (immutable) | Dynamic (can be started/stopped/deleted) |
| Storage | Stored on disk | Lives in memory + writable layer |

```bash
# Pull an image
docker pull nginx

# Run a container from the image
docker run -d --name my-nginx nginx

# List running containers
docker ps

# List images
docker images
```
{{< /qa >}}

{{< qa num="3" q="What is a Dockerfile and what are its most common instructions?" level="basic" >}}
A **Dockerfile** is a plain-text script containing instructions that Docker uses to build an image automatically.

**Common instructions:**

```dockerfile
FROM node:18-alpine          # Base image
WORKDIR /app                 # Set working directory
COPY package*.json ./        # Copy files into image
RUN npm install              # Execute command during build
COPY . .                     # Copy remaining source code
EXPOSE 3000                  # Document which port the app uses
ENV NODE_ENV=production      # Set environment variable
CMD ["node", "server.js"]    # Default command to run
```
{{< /qa >}}

{{< qa num="4" q="How do you build and run a Docker image?" level="basic" >}}
**Build** an image from a Dockerfile, then **run** a container from it:

```bash
# Build image (tag it with -t)
docker build -t my-app:1.0 .

# Run a container
docker run -d \
  --name my-app-container \
  -p 8080:3000 \
  my-app:1.0

# -d    = detached (background)
# -p    = host_port:container_port
# --name = assign a name
```
{{< /qa >}}

{{< qa num="5" q="What is Docker Hub?" level="basic" >}}
**Docker Hub** is the default public registry for Docker images. It hosts official images (like `nginx`, `postgres`, `node`) and allows users to publish their own images.

```bash
# Login to Docker Hub
docker login

# Tag your image for Docker Hub
docker tag my-app:1.0 yourusername/my-app:1.0

# Push to Docker Hub
docker push yourusername/my-app:1.0

# Pull someone else's image
docker pull yourusername/my-app:1.0
```
{{< /qa >}}

{{< qa num="6" q="How do you list, stop, and remove containers and images?" level="basic" >}}
```bash
# --- Containers ---
docker ps                     # List running containers
docker ps -a                  # List all containers (including stopped)
docker stop <name|id>         # Gracefully stop a container
docker kill <name|id>         # Force stop a container
docker rm <name|id>           # Remove a stopped container
docker rm -f <name|id>        # Force remove (even if running)

# --- Images ---
docker images                 # List all images
docker rmi <image_id>         # Remove an image
docker image prune            # Remove all unused images

# --- Cleanup everything ---
docker system prune -a        # Remove all unused containers, images, networks
```
{{< /qa >}}

{{< qa num="7" q="What is the difference between CMD and ENTRYPOINT in a Dockerfile?" level="basic" >}}
Both define the command that runs when a container starts, but they behave differently:

| | **CMD** | **ENTRYPOINT** |
|---|---|---|
| Purpose | Default arguments (can be overridden) | Fixed executable (cannot be overridden easily) |
| Override | `docker run image <new-cmd>` replaces it | `docker run image arg` appends to it |

```dockerfile
# CMD - easily overridden
CMD ["node", "server.js"]

# ENTRYPOINT - fixed executable
ENTRYPOINT ["node"]
CMD ["server.js"]   # default arg, can be overridden

# Run: docker run my-app debug.js
# → executes: node debug.js
```

**Best practice:** Use `ENTRYPOINT` for the main executable and `CMD` for default arguments.
{{< /qa >}}

---

## 🟡 Intermediate

{{< qa num="8" q="What is Docker Compose and when would you use it?" level="intermediate" >}}
**Docker Compose** is a tool for defining and running **multi-container applications** using a single YAML file (`docker-compose.yml`). It's ideal for local development and testing.

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  pg_data:
```

```bash
docker compose up -d       # Start all services
docker compose down        # Stop and remove containers
docker compose logs -f     # Follow logs
docker compose ps          # Status of services
```
{{< /qa >}}

{{< qa num="9" q="What are Docker volumes and how do they differ from bind mounts?" level="intermediate" >}}
Both are mechanisms for persisting data outside a container's lifecycle, but they differ in where data is stored and who manages it.

| | **Volume** | **Bind Mount** |
|---|---|---|
| Managed by | Docker | Host OS |
| Path | `/var/lib/docker/volumes/` | Any path on host |
| Portability | High | Low |
| Use case | Production, databases | Local dev, live reload |

```bash
# --- Volumes ---
docker volume create my_data
docker run -v my_data:/app/data my-app

# --- Bind Mounts ---
docker run -v $(pwd)/src:/app/src my-app
# or with --mount flag (explicit)
docker run --mount type=bind,source=$(pwd)/src,target=/app/src my-app
```

**Tip:** Prefer **volumes** in production; use **bind mounts** in development for live code reload.
{{< /qa >}}

{{< qa num="10" q="How does Docker networking work? Explain the different network types." level="intermediate" >}}
Docker provides several network drivers:

| Driver | Description | Use Case |
|---|---|---|
| `bridge` | Default isolated network on a single host | Most containers |
| `host` | Container shares host's network stack | Performance-critical apps |
| `none` | No networking | Fully isolated tasks |
| `overlay` | Multi-host networking | Docker Swarm / Kubernetes |

```bash
# Create a custom bridge network
docker network create my-network

# Connect containers to the same network
docker run -d --network my-network --name api my-api
docker run -d --network my-network --name db postgres

# Containers on the same custom network can resolve each other by name
# Inside 'api' container: ping db  → works!

# List networks
docker network ls

# Inspect a network
docker network inspect my-network
```
{{< /qa >}}

{{< qa num="11" q="What is a multi-stage build in Docker and why is it useful?" level="intermediate" >}}
**Multi-stage builds** use multiple `FROM` statements in a single Dockerfile, allowing you to copy only the artifacts you need from earlier stages. This drastically reduces final image size.

```dockerfile
# --- Stage 1: Build ---
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # Produces /app/dist

# --- Stage 2: Production ---
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist   # Only copy build output
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Result:** The final image contains no dev dependencies, source code, or build tools — only what's needed to run.

```bash
docker build --target production -t my-app:prod .
```
{{< /qa >}}

{{< qa num="12" q="How do you pass environment variables to a Docker container?" level="intermediate" >}}
There are multiple ways to inject environment variables:

```bash
# 1. Inline with -e
docker run -e NODE_ENV=production -e PORT=3000 my-app

# 2. From a .env file
docker run --env-file .env my-app

# 3. In docker-compose.yml
```

```yaml
# docker-compose.yml
services:
  app:
    image: my-app
    environment:
      NODE_ENV: production
      PORT: 3000
    env_file:
      - .env.production
```

```dockerfile
# 4. Baked into the image (not recommended for secrets)
ENV NODE_ENV=production
```

> ⚠️ **Never bake secrets** (passwords, API keys) into images. Use `.env` files, Docker secrets, or a secrets manager like Vault.
{{< /qa >}}

{{< qa num="13" q="What is the difference between COPY and ADD in a Dockerfile?" level="intermediate" >}}
Both copy files into the image, but `ADD` has extra functionality:

| Feature | `COPY` | `ADD` |
|---|---|---|
| Copy local files | ✅ | ✅ |
| Auto-extract `.tar` archives | ❌ | ✅ |
| Fetch remote URLs | ❌ | ✅ |
| Recommended for | General use | Archive extraction only |

```dockerfile
# Preferred - explicit and predictable
COPY ./src /app/src
COPY package.json /app/

# Use ADD only when you need tar extraction
ADD app.tar.gz /app/

# Avoid ADD for URLs - use curl/wget in RUN instead
RUN curl -o /tmp/file.zip https://example.com/file.zip
```

**Best practice:** Always prefer `COPY` unless you specifically need `ADD`'s extra features.
{{< /qa >}}

{{< qa num="14" q="How do you inspect and debug a running Docker container?" level="intermediate" >}}
```bash
# Get a shell inside a running container
docker exec -it <container> /bin/sh     # Alpine/minimal images
docker exec -it <container> /bin/bash   # Debian/Ubuntu images

# View real-time logs
docker logs -f <container>
docker logs --tail 100 <container>

# Inspect container config, network, mounts
docker inspect <container>

# Resource usage (CPU, memory, I/O)
docker stats <container>

# Copy files out of a container
docker cp <container>:/app/logs/error.log ./error.log

# View processes inside container
docker top <container>

# View filesystem changes since container started
docker diff <container>
```
{{< /qa >}}

---

## 🔴 Advanced

{{< qa num="15" q="How does the Docker layer caching system work and how do you optimize it?" level="advanced" >}}
Docker builds images in **layers** — each instruction in a Dockerfile creates one layer. Layers are cached and reused if the instruction and its context haven't changed.

**Cache invalidation rule:** Once a layer changes, **all subsequent layers are rebuilt**.

```dockerfile
# ❌ BAD - COPY . . early invalidates cache on every code change
FROM node:18-alpine
WORKDIR /app
COPY . .                    # Invalidated on ANY file change
RUN npm install             # Reinstalls everything each time!

# ✅ GOOD - Copy dependency files first, leverage caching
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./       # Only changes when deps change
RUN npm install             # Cached until package.json changes
COPY . .                    # App code changes don't bust npm cache
RUN npm run build
```

**Other optimization tips:**
- Combine `RUN` commands with `&&` to reduce layers
- Use `.dockerignore` to exclude `node_modules`, `.git`, build artifacts
- Order instructions from least-changing to most-changing
- Use `--mount=type=cache` (BuildKit) for package manager caches

```dockerfile
# BuildKit cache mount for faster builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```
{{< /qa >}}

{{< qa num="16" q="What is Docker Swarm and how does it compare to Kubernetes?" level="advanced" >}}
Both are **container orchestration** platforms, but they differ in complexity and capability:

| Feature | **Docker Swarm** | **Kubernetes** |
|---|---|---|
| Setup complexity | Simple | Complex |
| Learning curve | Low | High |
| Scalability | Moderate | Enterprise-grade |
| Auto-healing | Basic | Advanced |
| Ecosystem | Docker-native | Massive (CNCF) |
| Use case | Small/medium teams | Large-scale production |

```bash
# Initialize a Swarm cluster
docker swarm init --advertise-addr <manager-ip>

# Deploy a stack (like docker-compose for Swarm)
docker stack deploy -c docker-compose.yml myapp

# Scale a service
docker service scale myapp_web=5

# List services
docker service ls

# Rolling update
docker service update --image my-app:2.0 myapp_web
```

**When to choose what:**
- **Swarm** → simpler apps, small teams, already using Docker Compose
- **Kubernetes** → complex microservices, multi-cloud, large engineering teams
{{< /qa >}}

{{< qa num="17" q="How do you manage secrets securely in Docker?" level="advanced" >}}
**Never** store secrets as environment variables in images or plain `docker-compose.yml`. Use proper secrets management:

**Option 1: Docker Secrets (Swarm mode)**
```bash
# Create a secret
echo "super_secret_password" | docker secret create db_password -

# Use in a service
docker service create \
  --name myapp \
  --secret db_password \
  my-app:latest
```

Inside the container, secrets are available at `/run/secrets/db_password`.

**Option 2: Docker Compose secrets (for dev)**
```yaml
services:
  app:
    image: my-app
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt  # Never commit this file!
```

**Option 3: External secrets managers (production)**
```bash
# HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
# Inject at runtime via init containers or sidecar patterns
```

**Best practices:**
- Add secret files to `.gitignore`
- Rotate secrets regularly
- Use least-privilege access
- Audit secret access in production
{{< /qa >}}

{{< qa num="18" q="What are the security best practices for Docker containers?" level="advanced" >}}
```dockerfile
# 1. Use minimal base images
FROM alpine:3.19                     # Small attack surface
FROM gcr.io/distroless/nodejs:18     # Distroless (no shell!)

# 2. Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 3. Drop Linux capabilities
# In docker-compose.yml:
# cap_drop: [ALL]
# cap_add: [NET_BIND_SERVICE]

# 4. Read-only filesystem
# docker run --read-only --tmpfs /tmp my-app

# 5. Avoid storing secrets in ENV or layers
# Use Docker secrets or external vaults

# 6. Pin base image versions
FROM node:18.19.0-alpine3.19         # Pinned, not :latest
```

```bash
# Scan image for vulnerabilities
docker scout cves my-app:latest
# or
trivy image my-app:latest

# Run with security options
docker run \
  --read-only \
  --no-new-privileges \
  --cap-drop ALL \
  --security-opt seccomp=default \
  my-app:latest
```
{{< /qa >}}

{{< qa num="19" q="Explain how Docker uses Linux namespaces and cgroups under the hood." level="advanced" >}}
Docker is not a VM — it uses Linux kernel features to create isolated processes:

**Namespaces** — provide isolation of system resources:

| Namespace | Isolates |
|---|---|
| `pid` | Process IDs (container can't see host processes) |
| `net` | Network interfaces, IP tables, ports |
| `mnt` | Filesystem mount points |
| `uts` | Hostname and domain name |
| `ipc` | Inter-process communication |
| `user` | User and group IDs |

**Control Groups (cgroups)** — limit and account for resource usage:

```bash
# Limit container to 512MB RAM and 1 CPU
docker run \
  --memory="512m" \
  --memory-swap="512m" \
  --cpus="1.0" \
  my-app

# View cgroup info for a container
cat /sys/fs/cgroup/memory/docker/<container-id>/memory.limit_in_bytes
```

**Union Filesystem (OverlayFS)** — layers images efficiently:
- Each Dockerfile instruction creates a new read-only layer
- Running container gets a thin writable layer on top
- Layers are shared between containers using the same image → saves disk space

```bash
# See the layers of an image
docker history my-app:latest

# Inspect overlay filesystem
docker inspect my-app | grep -A5 GraphDriver
```
{{< /qa >}}

{{< qa num="20" q="How do you perform zero-downtime deployments with Docker?" level="advanced" >}}
Zero-downtime deployments require a strategy to transition traffic from old containers to new ones without service interruption.

**Strategy 1: Docker Swarm rolling update**
```bash
docker service update \
  --image my-app:2.0 \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-failure-action rollback \
  myapp_web
```

**Strategy 2: Blue-Green with Nginx + Compose**
```yaml
# docker-compose.blue-green.yml
services:
  app-blue:
    image: my-app:1.0
    networks: [proxy]

  app-green:
    image: my-app:2.0
    networks: [proxy]

  nginx:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    networks: [proxy]
```

```bash
# 1. Start green alongside blue
docker compose up -d app-green

# 2. Health check green
curl http://localhost/health

# 3. Switch Nginx upstream to green (update config + reload)
docker exec nginx nginx -s reload

# 4. Remove blue after confirming green is stable
docker compose stop app-blue
```

**Strategy 3: Kubernetes (Deployment rollout)**
```bash
kubectl set image deployment/my-app my-app=my-app:2.0
kubectl rollout status deployment/my-app
kubectl rollout undo deployment/my-app   # Rollback if needed
```
{{< /qa >}}



</div>
