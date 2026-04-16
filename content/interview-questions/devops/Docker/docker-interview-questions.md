---
title: "Docker Interview Questions and Answers"
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
**Ans:** **Docker** is a containerization platform that allows us to package an application along with all its dependencies, libraries, and configurations into a single unit called a container.

The main reason we use Docker is to ensure that the application runs consistently across different environments—like development, testing, and production—without any issues like ‘it works on my machine but not on yours’.

It also helps in faster deployment, better resource utilization compared to virtual machines, and makes scaling applications easier because we can quickly spin up multiple containers when needed.

**For example:** if I build a Docker container for a Node.js app, I can run the same container on my local system, a testing server, or in production, and it will behave exactly the same everywhere.
{{< /qa >}}

{{< qa num="2" q="What is the difference between a Docker image and a Docker container?" level="basic" >}}
**Ans:** The main difference between a Docker image and a Docker container is that an image is a template, while a container is a running instance of that template.

- A Docker image is a read-only package that includes the application code, dependencies, libraries, and environment needed to run the application. It doesn’t change and is used to create containers.

- A Docker container, on the other hand, is the actual running environment created from the image. It is live, can be started or stopped, and you can run multiple containers from the same image.

In simple terms, I think of a Docker image as a blueprint and a Docker container as the actual running application created from that blueprint.


| | **Image** | **Container** |
|---|---|---|
| Definition | Read-only blueprint/template | Running instance of an image |
| State | Static (immutable) | Dynamic (can be started/stopped/deleted) |
| Storage | Stored on disk | Lives in memory + writable layer |

{{< /qa >}}

{{< qa num="3" q="What is a Dockerfile and what are its most common instructions?" level="basic" >}}
**Ans:** A **Dockerfile** is a script or configuration file that contains a set of instructions to build a Docker image.

In a Dockerfile, we define things like the base image, application code, dependencies, environment variables, and the commands needed to run the application.

So instead of manually setting up everything, we just write a Dockerfile, and Docker automatically builds the image from it. This makes the process consistent, repeatable, and easy to automate.

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
**Ans:** To build a Docker image, we use the **Dockerfile** and run the *docker build* command. This command reads the instructions from the Dockerfile and creates an image.

```bash
# Build image (tag it with -t)
docker build -t my-app:1.0 .

# Run a container
docker run -d --name my-app-container  -p 8080:3000 my-app:1.0

# -d    = detached (background)
# -p    = host_port:container_port
# --name = assign a name
```
{{< /qa >}}

{{< qa num="5" q="What is Docker Hub?" level="basic" >}}
**Ans:** **Docker Hub** is the default public registry for Docker images. It hosts official images (like `nginx`, `postgres`, `node`) and allows users to publish their own images.

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
**Ans:**

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

---

## 🟡 Intermediate

{{< qa num="1" q="What is Docker Compose and when would you use it?" level="intermediate" >}}
**Ans:** **Docker Compose** is a tool for defining and running **multi-container applications** using a single YAML file (`docker-compose.yml`). It's ideal for local development and testing.

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

{{< qa num="2" q="What are Docker volumes and how do they differ from bind mounts?" level="intermediate" >}}
**Ans:** **Docker volumes** and **bind mounts** are both used to persist data outside the container, but the main difference is in how they are managed.

- Docker volumes are managed by Docker itself. They are stored in a specific location on the host and are easier to manage, more secure, and work well across different environments. They are generally the preferred way to persist data in production.

- Bind mounts, on the other hand, directly map a file or directory from the host machine into the container. This gives more control, but it also depends on the host’s file structure, so it’s less portable and can cause issues if the path doesn’t exist.

In short, volumes are Docker-managed and more portable, while bind mounts are host-managed and more flexible but less portable

| | **Volume** | **Bind Mount** |
|---|---|---|
| Managed by | Docker | Host OS |
| Path | `/var/lib/docker/volumes/` | Any path on host |
| Portability | High | Low |
| Use case | Production, databases | Local dev, live reload |


**Tip:** Prefer **volumes** in production; use **bind mounts** in development for live code reload.
{{< /qa >}}

{{< qa num="3" q="How does Docker networking work? Explain the different network types." level="intermediate" >}}
**Ans:** Docker networking allows containers to communicate with each other, as well as with the host machine and external networks.

By default, Docker creates a network so that containers can talk to each other using IP addresses or container names. It basically handles isolation and communication between containers.

- Docker Network Types:
  - Bridge
  - Host
  - None
  - Overlay

| Driver   | Description | Use Case |
|----------|-------------|----------|
| `bridge` | This is the default network. Containers on the same bridge network can communicate with each other, and we can expose ports to access them from the host. | Most containers |
| `host` | the container shares the host’s network directly, so there’s no isolation. It’s faster, but less secure because the container uses the host’s ports. | Performance-critical apps |
| `none` | In this case, the container has no network access at all. It’s completely isolated. | Fully isolated tasks |
| `overlay` | This is used in multi-host environments like Docker Swarm. It allows containers running on different machines to communicate with each other. | Docker Swarm / Kubernetes |


{{< /qa >}}

{{< qa num="4" q="What is a multi-stage build in Docker and why is it useful?" level="intermediate" >}}
**Ans:** **Multi-stage builds** use multiple `FROM` statements in a single Dockerfile, allowing you to copy only the artifacts you need from earlier stages. This drastically reduces final image size.

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

{{< qa num="5" q="How do you pass environment variables to a Docker container?" level="intermediate" >}}
**Ans:** There are multiple ways to inject environment variables:

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

{{< qa num="6" q="What is the difference between COPY and ADD in a Dockerfile?" level="intermediate" >}}
**Ans:** Both copy files into the image, but `ADD` has extra functionality:

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

{{< qa num="7" q="How do you inspect and debug a running Docker container?" level="intermediate" >}}
**Ans:**
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

{{< qa num="1" q="How does the Docker layer caching system work and how do you optimize it?" level="advanced" >}}
**Ans:** Docker builds images in **layers** — each instruction in a Dockerfile creates one layer. Layers are cached and reused if the instruction and its context haven't changed.

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

{{< qa num="2" q="What is Docker Swarm and how does it compare to Kubernetes?" level="advanced" >}}
**Ans:** Both are **container orchestration** platforms, but they differ in complexity and capability:

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

{{< qa num="3" q="How do you manage secrets securely in Docker?" level="advanced" >}}
**Ans:** **Never** store secrets as environment variables in images or plain `docker-compose.yml`. Use proper secrets management:

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

{{< qa num="4" q="What are the security best practices for Docker containers?" level="advanced" >}}
**Ans:**
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

{{< qa num="5" q="Explain how Docker uses Linux namespaces and cgroups under the hood." level="advanced" >}}
**Ans:** Docker is not a VM — it uses Linux kernel features to create isolated processes:

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

{{< qa num="6" q="How do you perform zero-downtime deployments with Docker?" level="advanced" >}}
**Ans:** Zero-downtime deployments require a strategy to transition traffic from old containers to new ones without service interruption.

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

{{< qa num="7" q="What is the difference between CMD and ENTRYPOINT in a Dockerfile?" level="Advanced" >}}
**Ans:**
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

</div>
