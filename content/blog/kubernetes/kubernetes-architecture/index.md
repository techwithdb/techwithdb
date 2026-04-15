---
title: "Kubernetes Architecture Deep Dive: Everything You Need to Know"
description: "The latest articles, deep dives, and tutorials on AWS and DevOps topics."
date: "2026-04-08"
author: "DB"
tags: ["Kubernetes", "DevOps", "Container Orchestration", "Cloud Native", "K8s"]
readTime: "18 min read"
---

# ☸️ Kubernetes Architecture Deep Dive (2025): Everything You Need to Know

> *A comprehensive guide to understanding how Kubernetes works under the hood — from the Control Plane to the Worker Nodes, and everything in between.*

---

## 🌐 What is Kubernetes?

**Kubernetes** (also known as **K8s**) is an open-source container orchestration platform originally developed by Google, now maintained by the **Cloud Native Computing Foundation (CNCF)**. It automates the deployment, scaling, and management of containerized applications.

Before Kubernetes, running containers at scale was chaotic — containers had to be manually started, monitored, and restarted when they crashed. Kubernetes solves all of this declaratively: you describe the *desired state* of your system, and Kubernetes continuously works to maintain it.

![Kubernetes Architecture](cover.svg)


### Why Kubernetes?

| Challenge | Without K8s | With K8s |
|-----------|-------------|----------|
| Container crashes | Manual restart | Auto-healing (self-healing) |
| Traffic spikes | Manual scaling | Horizontal auto-scaling |
| Deployments | Risky, manual | Rolling updates & rollbacks |
| Service discovery | Hand-crafted DNS/IPs | Built-in service discovery |
| Load balancing | External tools needed | Native load balancing |
| Config management | Baked into images | ConfigMaps & Secrets |

---


## 🏗️ High-Level Architecture Overview

At its core, a Kubernetes cluster is made up of two types of machines:


- **Control Plane** — The brain 🧠 of Kubernetes. Makes global decisions about the cluster (scheduling, detecting and responding to events).
- **Worker Nodes** — The muscle 💪 of Kubernetes. Run the actual application workloads (Pods).

{{< mermaid >}}
graph TB

%% Control Plane
subgraph Control Plane
    B1[API Server]
    B2[Scheduler]
    B3[Controller Manager]
    B4[(etcd)]
end

%% Worker Nodes
subgraph Worker Node 1
    C1[Kubelet]
    C2[Kube Proxy]
    C3[Pod]
end

subgraph Worker Node 2
    D1[Kubelet]
    D2[Kube Proxy]
    D3[Pod]
end

%% Flow
B2 --> B1
B3 --> B1
B4 --> B1

B1 --> C1
B1 --> D1

C1 --> C3
D1 --> D3


{{< /mermaid >}}





---

## 🧠 Control Plane Components

The Control Plane manages the overall state of the cluster. In production, it runs on dedicated machines (often 3 for high availability).

### 1. kube-apiserver

The **API Server** is the front-door to the entire Kubernetes control plane. Every single operation — from `kubectl get pods` to a Pod being scheduled — goes through it.

**Key responsibilities:**
- Exposes the Kubernetes REST API
- Authenticates and authorizes all requests
- Validates and persists API objects to etcd
- Acts as the central communication hub for all components

```bash
# All kubectl commands hit the API server
kubectl get pods -n production
# → HTTPS request → kube-apiserver → etcd → response
```

> 💡 **Did you know?** The API server is the **only** component that talks directly to etcd. All other components communicate through the API server.

---

### 2. etcd

**etcd** is a distributed, consistent key-value store that serves as Kubernetes' backing store for all cluster data. Think of it as the cluster's "single source of truth".

**What's stored in etcd?**
- All Kubernetes objects (Pods, Services, Deployments, etc.)
- Cluster configuration
- Node information
- Secrets (encrypted at rest)
- RBAC policies

```
Key: /registry/pods/production/my-app-pod
Value: {
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": { "name": "my-app-pod", ... },
  "spec": { "containers": [...] },
  "status": { "phase": "Running", ... }
}
```

> ⚠️ **Critical:** Back up etcd regularly in production. If etcd data is lost, the entire cluster state is gone.

```bash
# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

---

### 3. kube-scheduler

The **Scheduler** watches for newly created Pods with no assigned node and selects the best node for them to run on.

**Scheduling decision factors:**
- **Resource requirements** — CPU and memory requests
- **Node affinity/anti-affinity** — Rules about which nodes a pod prefers or must avoid
- **Taints and tolerations** — Node restrictions
- **Pod affinity/anti-affinity** — Rules about co-location with other pods
- **Resource availability** — Current node utilization
- **Priority and preemption** — High-priority pods can evict lower-priority ones

**Scheduling Algorithm (simplified):**

```
1. FILTERING (Predicates)
   ├── Does the node have enough CPU/memory?
   ├── Does the node match node selectors?
   ├── Does the node satisfy taints/tolerations?
   └── Are all volumes available on this node?

2. SCORING (Priorities)
   ├── Least-requested resource (prefer less-loaded nodes)
   ├── Image locality (prefer nodes with image cached)
   ├── Pod topology spread
   └── Custom scoring plugins

3. BINDING
   └── Assign the highest-scored node to the Pod
```

---

### 4. kube-controller-manager

The **Controller Manager** runs a collection of controllers — each is a control loop that watches the cluster state and tries to move it towards the desired state.

**Key controllers:**

| Controller | Responsibility |
|-----------|----------------|
| **Node Controller** | Monitors node health; marks unreachable nodes |
| **ReplicaSet Controller** | Ensures the correct number of Pod replicas are running |
| **Deployment Controller** | Manages rolling updates and rollbacks |
| **Endpoints Controller** | Populates Service endpoint objects |
| **ServiceAccount Controller** | Creates default ServiceAccounts in new namespaces |
| **Job Controller** | Manages batch Jobs to completion |
| **CronJob Controller** | Schedules Jobs on a time-based schedule |
| **Namespace Controller** | Cleans up resources when namespaces are deleted |

**Control Loop Pattern:**

```
┌─────────────────────────────────────────┐
│            Control Loop                  │
│                                          │
│  Observe → Diff → Act → Observe → ...   │
│                                          │
│  1. Observe: Watch desired & actual state│
│  2. Diff:    Compare them               │
│  3. Act:     Take action if different   │
└─────────────────────────────────────────┘
```

---

### 5. Cloud Controller Manager

The **Cloud Controller Manager (CCM)** is an optional component that integrates Kubernetes with cloud provider APIs (AWS, GCP, Azure, etc.).

**What it manages:**

- **Node Controller** — Checks the cloud provider if a node stops responding
- **Route Controller** — Sets up network routes in the cloud infrastructure
- **Service Controller** — Creates, updates, and deletes cloud load balancers

```yaml
# When you create a LoadBalancer Service,
# the CCM provisions a real AWS ELB / GCP GLB / Azure LB
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: LoadBalancer      # ← CCM handles this
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

---

## ⚙️ Worker Node Components

Worker nodes are where your application containers actually run. Each node runs three key components:

### 1. kubelet

The **kubelet** is the primary agent running on every worker node. It's the bridge between the control plane and the node.

**Key responsibilities:**
- Watches the API server for Pods assigned to its node
- Starts and stops containers via the Container Runtime
- Continuously reports node and Pod status back to the API server
- Runs container health checks (liveness, readiness, startup probes)
- Manages container lifecycle

```yaml
# kubelet enforces health probes defined in Pod spec
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 3
```

> 💡 **Note:** The kubelet does **not** manage containers that were not created by Kubernetes.

---

### 2. kube-proxy

**kube-proxy** runs on every node and maintains network rules that allow communication to your Pods from inside or outside the cluster.

**How it works:**

| Mode | Description | Performance |
|------|-------------|-------------|
| **iptables** (default) | Uses Linux iptables rules | Good for < 1000 Services |
| **ipvs** | Uses Linux IPVS (IP Virtual Server) | Better for large clusters |
| **userspace** | Legacy mode, routes through a proxy process | Avoid in production |

```bash
# kube-proxy mode can be configured
# Check current mode
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode
```

**Service routing example:**

```
Client Pod → Service ClusterIP:80
    ↓ (iptables/IPVS rule)
One of the backend Pod IPs:8080 (load balanced)
```

---

### 3. Container Runtime

The **Container Runtime** is the software responsible for actually running containers. Kubernetes uses the **Container Runtime Interface (CRI)** to support multiple runtimes.

**Supported runtimes:**

| Runtime | Description |
|---------|-------------|
| **containerd** | Industry-standard, recommended |
| **CRI-O** | Lightweight, designed for Kubernetes |
| **Docker Engine** | Via dockershim (deprecated in K8s 1.24+) |

```bash
# Check which runtime your cluster uses
kubectl get nodes -o wide
# CONTAINER-RUNTIME column shows: containerd://1.7.x
```

---

## 📦 Core Kubernetes Objects

### Pods

A **Pod** is the smallest deployable unit in Kubernetes. It wraps one or more containers that share:
- The same network namespace (same IP address)
- The same storage volumes
- The same lifecycle

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  labels:
    app: my-app
    environment: production
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
```

> 💡 **Best Practice:** Never deploy bare Pods in production. Use a Deployment to ensure resiliency.

---

### ReplicaSets

A **ReplicaSet** ensures a specified number of Pod replicas are running at any given time. If a Pod dies, the ReplicaSet creates a new one.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-app-rs
spec:
  replicas: 3              # Always maintain 3 Pods
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: nginx:1.25
```

> 💡 **Note:** In practice, you rarely create ReplicaSets directly. Use Deployments instead — they manage ReplicaSets for you.

---

### Deployments

A **Deployment** is the most common way to run stateless applications. It provides:
- Declarative updates for Pods and ReplicaSets
- Rolling updates with zero downtime
- Easy rollback to previous versions

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # Allow 1 extra Pod during update
      maxUnavailable: 0    # Never go below desired replica count
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        version: "2.0"
    spec:
      containers:
        - name: app
          image: my-app:2.0
```

```bash
# Rolling update
kubectl set image deployment/my-app app=my-app:2.1

# Check rollout status
kubectl rollout status deployment/my-app

# Rollback to previous version
kubectl rollout undo deployment/my-app

# Rollback to a specific revision
kubectl rollout undo deployment/my-app --to-revision=3
```

---

### Services

A **Service** provides a stable network identity for a set of Pods (which come and go). Services use label selectors to find their Pods.

**Service Types:**

```
ClusterIP (default)
└── Accessible only within the cluster
    Use case: Internal microservice communication

NodePort
└── Exposes the Service on each Node's IP at a static port
    Use case: Development, simple external access

LoadBalancer
└── Provisions a cloud load balancer (AWS ELB, GCP LB, etc.)
    Use case: Production external traffic

ExternalName
└── Maps the Service to a DNS name (CNAME record)
    Use case: Integrating external services
```

```yaml
# ClusterIP Service — internal communication
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  selector:
    app: backend          # Targets all Pods with this label
  ports:
    - port: 80            # Service port
      targetPort: 8080    # Container port
```

---

### ConfigMaps & Secrets

**ConfigMaps** store non-sensitive configuration data as key-value pairs.  
**Secrets** store sensitive data (passwords, tokens, certificates) — base64 encoded by default, encrypt-at-rest recommended.

```yaml
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "postgres-service"
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "100"
```

```yaml
# Secret (base64 encoded values)
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: YWRtaW4=        # echo -n 'admin' | base64
  password: cGFzc3dvcmQ=    # echo -n 'password' | base64
```

```yaml
# Using them in a Pod
spec:
  containers:
    - name: app
      image: my-app:latest
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: db-credentials
```

---

### Namespaces

**Namespaces** provide a mechanism for isolating groups of resources within a single cluster. They are useful for:
- Multi-team environments
- Multi-environment clusters (dev/staging/prod)
- Resource quota management

```bash
# Default namespaces in Kubernetes
kubectl get namespaces
# NAME                STATUS   AGE
# default             Active   10d    ← Default for user resources
# kube-system         Active   10d    ← Kubernetes system resources
# kube-public         Active   10d    ← Publicly accessible resources
# kube-node-lease     Active   10d    ← Node heartbeat objects
```

```yaml
# Applying resource quotas per namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
```

---

### Volumes & Persistent Volumes

Kubernetes volumes decouple storage from the Pod lifecycle.

```
Volume Types:
├── emptyDir       — Temporary, exists as long as Pod lives
├── hostPath       — Mounts a file/directory from the host node
├── configMap      — Mounts a ConfigMap as files
├── secret         — Mounts a Secret as files
├── persistentVolumeClaim (PVC) — Requests durable storage
└── Cloud volumes  — awsElasticBlockStore, gcePersistentDisk, etc.
```

```yaml
# PersistentVolume (provisioned by admin or dynamically)
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  hostPath:
    path: /data/my-pv

---
# PersistentVolumeClaim (requested by developer)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard
```

---

## 🌐 Kubernetes Networking Model

Kubernetes follows a flat networking model with these fundamental rules:

```
4 Networking Rules:
  1. Every Pod gets its own unique IP address
  2. Pods on the same node can communicate without NAT
  3. Pods on different nodes can communicate without NAT
  4. The IP a Pod sees itself as = the IP others use to reach it
```

**Network Layers:**

```
┌──────────────────────────────────────────────────────┐
│ LAYER 4: Ingress Controller (nginx, traefik, etc.)   │
│   External traffic → hostname/path routing → Service │
├──────────────────────────────────────────────────────┤
│ LAYER 3: Services                                    │
│   ClusterIP / NodePort / LoadBalancer                │
│   Stable virtual IP → Pod IPs (via kube-proxy)       │
├──────────────────────────────────────────────────────┤
│ LAYER 2: Pod Network (CNI Plugin)                    │
│   Calico / Flannel / Cilium / Weave                  │
│   Each Pod gets a routable IP                        │
├──────────────────────────────────────────────────────┤
│ LAYER 1: Node Network                                │
│   Physical / virtual machine network                 │
└──────────────────────────────────────────────────────┘
```

**DNS in Kubernetes:**

Every Service gets a DNS entry automatically via CoreDNS:

```
my-service.my-namespace.svc.cluster.local
     ↑            ↑          ↑        ↑
  Service      Namespace  Resource  Cluster
   name          name      type     domain
```

```bash
# From within the same namespace, just use the service name
curl http://backend-service

# From a different namespace
curl http://backend-service.production.svc.cluster.local
```

---

## 🔄 How a Pod Gets Scheduled — Step by Step

Let's trace the full lifecycle of `kubectl apply -f deployment.yaml`:

```
Step 1: kubectl apply
  └── kubectl → HTTPS POST → kube-apiserver
      └── Authenticate & Authorize request
      └── Validate the Deployment object
      └── Persist to etcd
      └── Return 200 OK

Step 2: Controller Manager reacts
  └── Deployment Controller watches API server
      └── Sees new Deployment → Creates a ReplicaSet
      └── ReplicaSet Controller sees new RS
      └── Creates 3 Pod objects (status: Pending)
      └── Persists Pods to etcd via API server

Step 3: Scheduler assigns nodes
  └── kube-scheduler watches for Pending pods
      └── Runs filtering → scoring algorithm
      └── Selects best node for each Pod
      └── Updates Pod.spec.nodeName via API server

Step 4: kubelet starts containers
  └── kubelet on selected node watches API server
      └── Sees Pod assigned to its node
      └── Calls Container Runtime (containerd) to pull image
      └── Creates container with requested resources
      └── Sets up networking via CNI plugin
      └── Updates Pod status → Running via API server

Step 5: Service routes traffic
  └── Endpoint Controller sees Running Pods
      └── Adds Pod IPs to Service Endpoints
      └── kube-proxy updates iptables/IPVS rules
      └── Traffic can now reach the Pods ✅
```

---

## 🔌 Kubernetes Add-ons

Beyond the core components, these add-ons are essential in production clusters:

| Add-on | Purpose | Popular Options |
|--------|---------|-----------------|
| **CNI Plugin** | Pod networking | Calico, Cilium, Flannel |
| **DNS** | Service discovery | CoreDNS |
| **Ingress Controller** | HTTP routing | NGINX, Traefik, AWS ALB |
| **Metrics Server** | Resource metrics (HPA) | metrics-server |
| **Dashboard** | Web UI | kubernetes-dashboard |
| **Storage** | Dynamic provisioning | Rook-Ceph, Longhorn |
| **Certificate Manager** | TLS cert automation | cert-manager |
| **GitOps** | Continuous delivery | ArgoCD, Flux |
| **Monitoring** | Metrics & alerting | Prometheus + Grafana |
| **Logging** | Log aggregation | EFK Stack, Loki |
| **Service Mesh** | mTLS, observability | Istio, Linkerd |

---

## ✅ Architecture Best Practices

### 🔐 Security

```yaml
# Always set security context on Pods
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```

### 📊 Resource Management

```yaml
# Always set requests and limits
resources:
  requests:
    cpu: "100m"      # 0.1 CPU cores — guaranteed
    memory: "128Mi"  # guaranteed
  limits:
    cpu: "500m"      # 0.5 CPU cores — max burst
    memory: "256Mi"  # max — OOMKilled if exceeded
```

### 🔁 High Availability

```yaml
# Spread Pods across nodes and zones
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: my-app
        topologyKey: "kubernetes.io/hostname"

# Use PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2    # Always keep at least 2 Pods running
  selector:
    matchLabels:
      app: my-app
```

### 📈 Auto-scaling

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 🎯 Key Takeaways

```
☸️  Kubernetes Architecture at a Glance

Control Plane (The Brain 🧠)
  ├── kube-apiserver   → Single entry point, validates & persists all objects
  ├── etcd             → Distributed key-value store, the cluster's memory
  ├── kube-scheduler   → Decides WHERE Pods run
  └── controller-mgr   → Reconciles desired vs actual state

Worker Nodes (The Muscle 💪)
  ├── kubelet          → Runs on every node, executes Pod specs
  ├── kube-proxy       → Manages networking rules for Services
  └── Container Runtime → Actually runs the containers (containerd)

Core Objects
  ├── Pod              → Smallest unit, wraps containers
  ├── ReplicaSet       → Ensures N replicas of a Pod
  ├── Deployment       → Manages RS + rolling updates
  ├── Service          → Stable network endpoint for Pods
  ├── ConfigMap/Secret → Externalized configuration
  ├── Namespace        → Logical cluster partitioning
  └── PVC/PV           → Persistent storage abstraction
```

Kubernetes' power comes from its **declarative model** and **reconciliation loops** — you declare what you want, and Kubernetes continuously works to make it so. Understanding this architecture is the foundation for building resilient, scalable systems in the cloud-native world.

---

## 📚 Further Reading

- 📖 [Official Kubernetes Documentation](https://kubernetes.io/docs/)
- 📖 [Kubernetes: Up and Running (O'Reilly)](https://www.oreilly.com/library/view/kubernetes-up-and/9781098110192/)
- 🎓 [CNCF Kubernetes Training](https://www.cncf.io/certification/cka/)
- 🛠️ [Play with Kubernetes (Interactive Lab)](https://labs.play-with-k8s.com/)
- 📊 [CNCF Cloud Native Landscape](https://landscape.cncf.io/)

---

*Published on April 8, 2026 · 18 min read · Tags: `Kubernetes` `DevOps` `Cloud Native` `Container Orchestration` `K8s`*

---

> 💬 **Found this helpful?** Share it with your team and star the repo!  
> 🐛 **Spotted an error?** Open an issue or submit a PR.
