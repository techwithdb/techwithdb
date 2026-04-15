---
title: "Kubernetes Interview Questions & Answers (2025)"
description: "50+ Kubernetes interview questions and answers from basic to advanced — covering Pods, Deployments, Services, Networking, RBAC, Helm, Autoscaling, Security, and real-world troubleshooting scenarios."
date: 2025-01-20
author: "DB"
tags: ["Kubernetes", "K8s", "Interview", "DevOps", "Containers", "CKA", "CKAD"]
tool: "kubernetes"
level: "All Levels"
question_count: 50
draft: false
---

<div class="qa-list">

{{< qa num="1" q="What is Kubernetes and why do we use it?" level="basic" >}}
**Kubernetes (K8s)** is an open-source container orchestration platform originally built by Google. It automates the deployment, scaling, and management of containerized applications.

**Why use Kubernetes?**
- **Self-healing** — restarts failed containers, replaces and reschedules pods
- **Auto-scaling** — scales pods up/down based on CPU, memory, or custom metrics
- **Rolling updates** — deploy new versions with zero downtime
- **Load balancing** — distributes traffic across pod replicas automatically
- **Storage orchestration** — mounts local or cloud storage automatically
- **Secret management** — stores and manages sensitive configuration data

**Core architecture:**
```
Control Plane                    Worker Nodes
┌─────────────────┐              ┌────────────────────┐
│  kube-apiserver  │◄────────────│  kubelet           │
│  etcd            │             │  kube-proxy        │
│  kube-scheduler  │             │  container runtime │
│  controller-mgr  │             │  (containerd)      │
└─────────────────┘              └────────────────────┘
```

| Component | Role |
|-----------|------|
| `kube-apiserver` | Entry point for all API requests |
| `etcd` | Distributed key-value store — cluster source of truth |
| `kube-scheduler` | Assigns pods to nodes based on resources |
| `kube-controller-manager` | Runs reconciliation loops (ReplicaSet, Node, etc.) |
| `kubelet` | Node agent — ensures containers run as specified |
| `kube-proxy` | Maintains network rules for Service IPs |
{{< /qa >}}

{{< qa num="2" q="What is a Pod? How is it different from a container?" level="basic" >}}
A **Pod** is the smallest deployable unit in Kubernetes. It wraps one or more containers that share the same network namespace, IP address, and storage volumes.

**Key differences:**

| | Container | Pod |
|-|-----------|-----|
| Unit | Single process | One or more containers |
| Network | Own namespace | Shared namespace — containers use `localhost` |
| Storage | Own filesystem | Shared volumes between containers |
| Managed by | Docker/containerd | Kubernetes |

**Single-container Pod (most common):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "250m"
        memory: "256Mi"
```

**Multi-container Pod (sidecar pattern):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
  - name: app           # Main container
    image: my-app:v1
    ports:
    - containerPort: 8080
  - name: log-shipper   # Sidecar — reads logs from shared volume
    image: fluent-bit:latest
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
  volumes:
  - name: logs
    emptyDir: {}
```

**Pods are ephemeral** — when a pod dies, it is NOT restarted unless managed by a controller (Deployment, StatefulSet, DaemonSet).
{{< /qa >}}

{{< qa num="3" q="What is the difference between a Deployment, StatefulSet, DaemonSet, and Job?" level="basic" >}}
Each workload type serves a different purpose:

| Kind | Use For | Pod Names | Storage | Ordering |
|------|---------|-----------|---------|----------|
| **Deployment** | Stateless apps (APIs, web) | Random | Ephemeral | Any order |
| **StatefulSet** | Stateful apps (DBs, queues) | Stable (`app-0`, `app-1`) | Persistent PVC per pod | Ordered (0→1→2) |
| **DaemonSet** | One pod per node (agents) | One per node | Node-local | N/A |
| **Job** | Run-to-completion tasks | Random | Optional | N/A |
| **CronJob** | Scheduled recurring tasks | Random | Optional | N/A |

**Deployment — stateless, rolling updates:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: my-api:v2
```

**StatefulSet — stable identity for databases:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
  volumeClaimTemplates:          # Each pod gets its own PVC
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

**DaemonSet — one pod per node (log agents, monitoring):**
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
```
{{< /qa >}}

{{< qa num="4" q="What are the types of Kubernetes Services and when do you use each?" level="basic" >}}
A **Service** gives pods a stable network endpoint. Pods come and go, but the Service IP stays constant.

| Type | Accessible From | Port Range | Use Case |
|------|----------------|------------|----------|
| `ClusterIP` | Inside cluster only | Any | Internal service-to-service |
| `NodePort` | Outside via `NodeIP:Port` | 30000–32767 | Dev/test access |
| `LoadBalancer` | External via cloud LB | Any | Production external traffic |
| `ExternalName` | Inside cluster | N/A | Alias to external DNS name |

**ClusterIP (default):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
spec:
  type: ClusterIP       # default — can omit this line
  selector:
    app: backend
  ports:
  - port: 80            # Service port
    targetPort: 8080    # Container port
```

**LoadBalancer (production — AWS NLB example):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-svc
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 443
    targetPort: 8080
    protocol: TCP
```

**Headless Service (StatefulSets — direct pod DNS):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None       # Makes it headless
  selector:
    app: postgres
  ports:
  - port: 5432
# DNS: postgres-0.postgres-headless.default.svc.cluster.local
```
{{< /qa >}}

{{< qa num="5" q="What is a ConfigMap and Secret? How do you use them in a Pod?" level="basic" >}}
**ConfigMap** stores non-sensitive configuration. **Secret** stores sensitive data (base64-encoded, can be encrypted at rest).

**Create ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  config.yaml: |
    server:
      port: 8080
      timeout: 30s
```

**Create Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:              # stringData auto-encodes to base64
  DB_HOST: "postgres.prod.svc.cluster.local"
  DB_USER: "appuser"
  DB_PASS: "supersecretpassword"
```

**Use in Pod — as environment variables:**
```yaml
spec:
  containers:
  - name: app
    image: my-app:v1
    env:
    - name: APP_ENV
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: APP_ENV
    - name: DB_PASS
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: DB_PASS
    envFrom:             # Load ALL keys from ConfigMap as env vars
    - configMapRef:
        name: app-config
```

**Use in Pod — as mounted files:**
```yaml
spec:
  containers:
  - name: app
    image: my-app:v1
    volumeMounts:
    - name: config-vol
      mountPath: /etc/app/config.yaml
      subPath: config.yaml
  volumes:
  - name: config-vol
    configMap:
      name: app-config
```

```bash
# Quick commands
kubectl create configmap app-config --from-file=config.yaml
kubectl create secret generic db-secret --from-literal=DB_PASS=mysecret
kubectl get secret db-secret -o jsonpath='{.data.DB_PASS}' | base64 -d
```
{{< /qa >}}

{{< qa num="6" q="What is a Namespace? Why do we use them?" level="basic" >}}
A **Namespace** is a virtual cluster within a physical cluster. It provides a mechanism for isolating groups of resources.

**Default namespaces:**
```bash
kubectl get namespaces
# NAME              STATUS   AGE
# default           Active   30d   ← where resources go if not specified
# kube-system       Active   30d   ← Kubernetes system components
# kube-public       Active   30d   ← publicly readable resources
# kube-node-lease   Active   30d   ← node heartbeat objects
```

**Create and use a namespace:**
```bash
# Create namespace
kubectl create namespace production
kubectl create namespace staging

# Deploy to a specific namespace
kubectl apply -f deployment.yaml -n production

# Set default namespace for your context
kubectl config set-context --current --namespace=production

# View all resources in a namespace
kubectl get all -n production

# View resources across ALL namespaces
kubectl get pods --all-namespaces
kubectl get pods -A   # shorthand
```

**Namespace with resource quotas:**
```yaml
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
    services: "10"
```

**Key facts:**
- Some resources are cluster-scoped (Nodes, PersistentVolumes, ClusterRoles) — they do NOT belong to a namespace
- DNS format: `service-name.namespace.svc.cluster.local`
- ResourceQuotas and LimitRanges are set per namespace
{{< /qa >}}

{{< qa num="7" q="What are resource requests and limits? What happens when a container exceeds them?" level="basic" >}}
**Requests** = minimum guaranteed resources (used for scheduling).
**Limits** = maximum allowed resources (enforced at runtime).

```yaml
spec:
  containers:
  - name: app
    image: my-app:v1
    resources:
      requests:
        cpu: "250m"       # 0.25 CPU cores — guaranteed
        memory: "256Mi"   # 256 MiB — guaranteed
      limits:
        cpu: "500m"       # 0.5 CPU cores — maximum
        memory: "512Mi"   # 512 MiB — maximum
```

**What happens when limits are exceeded:**

| Resource | Exceeded Behavior |
|----------|------------------|
| **CPU** | Container is **throttled** — slowed down but NOT killed |
| **Memory** | Container is **OOMKilled** (exit code 137) — killed immediately |

```bash
# Check if a pod was OOMKilled
kubectl describe pod <pod-name>
# Look for: OOMKilled in the Last State section

# Check exit code
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'
# 137 = OOMKilled, 1 = app crash, 0 = success
```

**CPU units:**
```
1 CPU    = 1 vCPU = 1 AWS vCPU = 1 GCP Core = 1000m
500m     = 0.5 CPU
100m     = 0.1 CPU (minimum recommended)
```

**Quality of Service (QoS) classes:**
```
Guaranteed  → requests == limits (best — never evicted first)
Burstable   → requests < limits  (middle)
BestEffort  → no requests or limits set (worst — evicted first)
```

```bash
# Check QoS class of a pod
kubectl get pod <pod-name> -o jsonpath='{.status.qosClass}'
```
{{< /qa >}}

{{< qa num="8" q="What is a PersistentVolume (PV) and PersistentVolumeClaim (PVC)?" level="basic" >}}
**PersistentVolume (PV)** — a piece of storage provisioned in the cluster (like an AWS EBS volume).
**PersistentVolumeClaim (PVC)** — a request for storage by a user/pod (like requesting a specific size).

```
Developer creates PVC  →  K8s finds/creates matching PV  →  Pod mounts PVC
```

**Dynamic provisioning (most common — cloud environments):**
```yaml
# 1. StorageClass defines HOW storage is created
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
allowVolumeExpansion: true

---
# 2. PVC requests storage (PV created automatically)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
spec:
  accessModes:
  - ReadWriteOnce      # RWO = one node at a time
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi

---
# 3. Pod mounts the PVC
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: database-pvc
```

**Access modes:**

| Mode | Short | Description |
|------|-------|-------------|
| `ReadWriteOnce` | RWO | Read/write by one node |
| `ReadOnlyMany` | ROX | Read-only by many nodes |
| `ReadWriteMany` | RWX | Read/write by many nodes (NFS, EFS) |

```bash
kubectl get pv               # List all PersistentVolumes
kubectl get pvc              # List all PersistentVolumeClaims
kubectl describe pvc my-pvc  # Check binding status
```
{{< /qa >}}

{{< qa num="9" q="What is an Ingress and how is it different from a Service?" level="intermediate" >}}
A **Service** exposes pods inside the cluster or with a single external IP/port.
An **Ingress** is an API object that manages **HTTP/HTTPS routing** to multiple services from a single entry point — like a smart router.

```
Internet → Ingress Controller (NGINX/ALB) → Ingress Rules → Services → Pods
```

**Without Ingress** — need a LoadBalancer per service (expensive):
```
app.com    → LoadBalancer 1 ($$$) → Service A
api.com    → LoadBalancer 2 ($$$) → Service B
admin.com  → LoadBalancer 3 ($$$) → Service C
```

**With Ingress** — one LoadBalancer, smart routing:
```
                    ┌── /        → Service A (frontend)
LoadBalancer ───────┼── /api/    → Service B (backend)
                    └── /admin/  → Service C (admin)
```

**Ingress resource:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - yourdomain.com
    secretName: tls-cert-secret
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-svc
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-svc
            port:
              number: 8080
```

**Install NGINX Ingress Controller (most common):**
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```
{{< /qa >}}

{{< qa num="10" q="How does Kubernetes networking work? Explain the CNI and how pods communicate." level="intermediate" >}}
Kubernetes networking follows **3 fundamental rules:**
1. Every pod gets its own IP address
2. Pods can communicate with all other pods without NAT
3. Nodes can communicate with all pods without NAT

**CNI (Container Network Interface)** plugins implement these rules:

| CNI Plugin | Use Case | Features |
|------------|----------|----------|
| **Calico** | Most popular | NetworkPolicy, BGP, eBPF |
| **Flannel** | Simple, lightweight | Basic overlay network |
| **Cilium** | High performance | eBPF, L7 policies, observability |
| **Weave** | Easy setup | Encrypted by default |
| **AWS VPC CNI** | EKS native | Pods get real VPC IPs |

**Pod-to-Pod communication:**
```
Same node:    Pod A → veth → cbr0 bridge → veth → Pod B
Across nodes: Pod A → veth → cbr0 → eth0 → [overlay/BGP] → eth0 → cbr0 → Pod B
```

**DNS resolution in the cluster:**
```bash
# Pod DNS format
<pod-ip-dashes>.<namespace>.pod.cluster.local
# Example: 10-0-0-1.default.pod.cluster.local

# Service DNS format
<service-name>.<namespace>.svc.cluster.local
# Example: my-svc.production.svc.cluster.local

# Test DNS from inside a pod
kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup my-svc.production
```

**NetworkPolicy — restrict traffic between pods:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend         # Apply to backend pods
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend    # Only allow traffic from frontend pods
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres    # Backend can only talk to postgres
    ports:
    - protocol: TCP
      port: 5432
```
{{< /qa >}}

{{< qa num="11" q="What is RBAC in Kubernetes? Create a read-only role for a developer." level="intermediate" >}}
**RBAC (Role-Based Access Control)** controls who can do what in Kubernetes. It uses 4 objects:

| Object | Scope | Purpose |
|--------|-------|---------|
| `Role` | Namespace | Defines permissions within a namespace |
| `ClusterRole` | Cluster-wide | Defines cluster-wide permissions |
| `RoleBinding` | Namespace | Binds Role/ClusterRole to users/groups/SAs in a namespace |
| `ClusterRoleBinding` | Cluster-wide | Binds ClusterRole cluster-wide |

**Complete read-only setup for a developer:**
```yaml
# 1. Role — read-only in 'development' namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-readonly
  namespace: development
rules:
- apiGroups: [""]                    # Core API group
  resources: ["pods", "pods/log", "services", "configmaps", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch"]

---
# 2. RoleBinding — attach role to a user
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-readonly-binding
  namespace: development
subjects:
- kind: User
  name: john@company.com   # IAM user or OIDC user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-readonly
  apiGroup: rbac.authorization.k8s.io
```

**Test permissions:**
```bash
# Check what a user can do
kubectl auth can-i list pods -n development --as=john@company.com
# yes

kubectl auth can-i delete pods -n development --as=john@company.com
# no

# List all permissions for a user
kubectl auth can-i --list -n development --as=john@company.com
```
{{< /qa >}}

{{< qa num="12" q="How does HorizontalPodAutoscaler (HPA) work? Write a complete HPA config." level="intermediate" >}}
**HPA** automatically adjusts the number of Pod replicas based on observed metrics (CPU, memory, or custom).

**How it works:**
```
Metrics Server → HPA Controller (polls every 15s) → adjusts replica count
```

**Requirements:**
- Metrics Server must be installed in the cluster
- Pods must define resource `requests` (otherwise HPA cannot calculate utilization)

**Complete HPA with CPU + Memory + Custom metric:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
  # Scale on CPU utilization
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70    # Target 70% CPU across all pods
  # Scale on Memory
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 512Mi       # Target 512Mi per pod
  # Scale on custom metric (requests per second)
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  # Scaling behaviour (prevent flapping)
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60      # Wait 60s before scaling up again
      policies:
      - type: Pods
        value: 4                          # Max 4 pods per scale-up
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300     # Wait 5 min before scaling down
      policies:
      - type: Percent
        value: 10                         # Scale down max 10% at a time
        periodSeconds: 60
```

```bash
# Install Metrics Server (required for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Watch HPA in action
kubectl get hpa -n production -w

# Check current metrics
kubectl top pods -n production
```
{{< /qa >}}

{{< qa num="13" q="What is Helm and why is it used in Kubernetes?" level="intermediate" >}}
**Helm** is the package manager for Kubernetes. It lets you define, install, and upgrade complex Kubernetes applications using **charts** (packaged YAML templates).

**Without Helm** — manually apply 10+ YAML files:
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
# ...and more
```

**With Helm** — one command:
```bash
helm install my-app ./my-chart --namespace production
```

**Chart structure:**
```
my-chart/
├── Chart.yaml         ← Chart metadata (name, version, description)
├── values.yaml        ← Default configuration values
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── _helpers.tpl   ← Reusable template functions
└── charts/            ← Dependency charts
```

**Key Helm commands:**
```bash
# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search for charts
helm search repo nginx

# Install a chart
helm install my-nginx bitnami/nginx \
  --namespace web \
  --create-namespace \
  --set replicaCount=3 \
  --set service.type=LoadBalancer

# Install with custom values file
helm install my-nginx bitnami/nginx -f custom-values.yaml

# Upgrade a release
helm upgrade my-nginx bitnami/nginx --set image.tag=1.25

# Rollback to previous version
helm rollback my-nginx 1

# List all releases
helm list --all-namespaces

# Uninstall a release
helm uninstall my-nginx -n web

# Render templates without installing (dry-run)
helm template my-nginx bitnami/nginx
helm install my-nginx bitnami/nginx --dry-run --debug
```
{{< /qa >}}

{{< qa num="14" q="What are Taints and Tolerations? Give a real-world example." level="intermediate" >}}
**Taints** are applied to **nodes** to repel pods from being scheduled there.
**Tolerations** are applied to **pods** to allow them to schedule on tainted nodes.

```
Taint on node  →  repels all pods
Toleration on pod  →  "I can tolerate this taint, schedule me here"
```

**Taint effects:**

| Effect | Behavior |
|--------|----------|
| `NoSchedule` | New pods without toleration won't schedule here |
| `PreferNoSchedule` | Scheduler tries to avoid, but not guaranteed |
| `NoExecute` | New pods won't schedule AND existing pods are evicted |

**Real-world example — dedicated GPU nodes:**
```bash
# 1. Taint the GPU node
kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule

# 2. View taints on a node
kubectl describe node gpu-node-1 | grep -i taint

# 3. Remove a taint (add minus at the end)
kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule-
```

```yaml
# 4. Pod with toleration can schedule on GPU node
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
  nodeSelector:
    dedicated: gpu           # Also use nodeSelector to ATTRACT to GPU node
  containers:
  - name: training
    image: tensorflow/tensorflow:latest-gpu
    resources:
      limits:
        nvidia.com/gpu: 1
```

**Common real-world taints:**
```bash
# Taint spot instances (avoid running critical workloads)
kubectl taint nodes spot-node-1 spot=true:NoSchedule

# Taint nodes for maintenance
kubectl taint nodes node-1 maintenance=true:NoExecute

# Dedicated nodes for monitoring stack
kubectl taint nodes monitoring-node dedicated=monitoring:NoSchedule
```
{{< /qa >}}

{{< qa num="15" q="What is the difference between liveness, readiness, and startup probes?" level="intermediate" >}}
Kubernetes uses three types of probes to monitor container health:

| Probe | Question | Failure Action | When Used |
|-------|----------|---------------|-----------|
| **Liveness** | Is the app alive? | Restart container | App is stuck/deadlocked |
| **Readiness** | Is the app ready for traffic? | Remove from Service endpoints | App still initializing |
| **Startup** | Has the app started? | Restart container (overrides liveness during startup) | Slow-starting apps |

**Complete probe configuration:**
```yaml
spec:
  containers:
  - name: api
    image: my-api:v1
    ports:
    - containerPort: 8080

    # Startup probe — give app 5 mins to start (30 * 10s)
    # Liveness/Readiness are paused until startup succeeds
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      failureThreshold: 30
      periodSeconds: 10

    # Liveness probe — restart if app is dead
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 10   # Wait 10s after container starts
      periodSeconds: 15         # Check every 15s
      failureThreshold: 3       # Restart after 3 failures
      timeoutSeconds: 5         # Fail if no response in 5s

    # Readiness probe — remove from load balancer if not ready
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3
      successThreshold: 1       # Need 1 success to be marked ready
```

**Probe types:**
```yaml
# HTTP GET — most common
httpGet:
  path: /healthz
  port: 8080
  httpHeaders:
  - name: X-Health-Check
    value: "true"

# TCP Socket — for non-HTTP services
tcpSocket:
  port: 5432     # Just checks if port is open

# Exec command — run a command inside container
exec:
  command:
  - /bin/sh
  - -c
  - "redis-cli ping | grep PONG"
```
{{< /qa >}}

{{< qa num="16" q="What is a ServiceAccount and when do you use it?" level="intermediate" >}}
A **ServiceAccount** provides an identity for processes running inside a Pod to interact with the Kubernetes API. Every pod automatically gets the `default` ServiceAccount if not specified.

**Why use custom ServiceAccounts?**
- Grant specific pods only the permissions they need (least privilege)
- Use with IRSA (IAM Roles for Service Accounts) on EKS for AWS access
- Audit trail — know which pod made which API call

**Create a ServiceAccount with RBAC:**
```yaml
# 1. Create ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployment-manager
  namespace: production

---
# 2. Create Role with needed permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-role
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update", "patch"]

---
# 3. Bind the Role to the ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-role-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: deployment-manager
  namespace: production
roleRef:
  kind: Role
  name: deployment-role
  apiGroup: rbac.authorization.k8s.io

---
# 4. Use ServiceAccount in Pod
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: deployment-manager    # Attach the SA here
  automountServiceAccountToken: true
  containers:
  - name: app
    image: my-app:v1
```

**EKS IRSA — give pods AWS IAM permissions:**
```bash
# Associate ServiceAccount with IAM role (no access keys needed in pods!)
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace production \
  --name s3-access-sa \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve
```
{{< /qa >}}

{{< qa num="17" q="How do rolling updates work in Kubernetes? How do you do a rollback?" level="intermediate" >}}
**Rolling update** replaces old pods with new ones gradually — ensuring zero downtime by keeping some old pods running until new ones are ready.

```
Old pods: [v1] [v1] [v1]
Step 1:   [v1] [v1] [v2]   ← 1 new pod added
Step 2:   [v1] [v2] [v2]   ← 1 old pod removed
Step 3:   [v2] [v2] [v2]   ← update complete
```

**Configure rolling update strategy:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2          # Max 2 extra pods above desired count
      maxUnavailable: 0    # Never go below 6 pods (zero downtime)
  template:
    spec:
      containers:
      - name: web
        image: web-app:v2.0
```

**Perform and monitor an update:**
```bash
# Update the image
kubectl set image deployment/web-app web=web-app:v2.0 -n production

# Or edit deployment directly
kubectl edit deployment web-app -n production

# Watch rollout progress
kubectl rollout status deployment/web-app -n production
# Waiting for deployment "web-app" rollout to finish: 2 out of 6 new replicas...

# View rollout history
kubectl rollout history deployment/web-app

# View details of a specific revision
kubectl rollout history deployment/web-app --revision=2
```

**Rollback:**
```bash
# Rollback to previous version immediately
kubectl rollout undo deployment/web-app -n production

# Rollback to a specific revision
kubectl rollout undo deployment/web-app --to-revision=3

# Pause a rollout (freeze mid-rollout)
kubectl rollout pause deployment/web-app

# Resume a paused rollout
kubectl rollout resume deployment/web-app
```

**Recreate strategy (causes downtime — for stateful apps):**
```yaml
strategy:
  type: Recreate    # All old pods killed, then all new pods started
```
{{< /qa >}}

{{< qa num="18" q="What are Init Containers? Give a real-world use case." level="intermediate" >}}
**Init Containers** run to completion before any application containers start. They run sequentially — each must succeed before the next starts.

**Use cases:**
- Wait for a dependency (database) to be ready
- Download configuration/secrets before app starts
- Set file permissions on shared volumes
- Run database migrations before app starts

**Real-world example — wait for DB + run migrations:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      initContainers:

      # Init 1 — wait for database to be ready
      - name: wait-for-db
        image: busybox:1.36
        command:
        - /bin/sh
        - -c
        - |
          until nc -z postgres-svc 5432; do
            echo "Waiting for database..."
            sleep 5
          done
          echo "Database is ready!"

      # Init 2 — run database migrations
      - name: run-migrations
        image: my-app:v2.0
        command: ["python", "manage.py", "migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: DATABASE_URL

      # Main application container starts ONLY after both inits succeed
      containers:
      - name: web-app
        image: my-app:v2.0
        ports:
        - containerPort: 8000
```

**Key differences from regular containers:**

| | Init Container | Regular Container |
|-|---------------|------------------|
| Runs | Before app containers | Parallel with other containers |
| Completion | Must finish (exit 0) | Runs indefinitely |
| Restart | Restarts until success | Based on `restartPolicy` |
| Probes | No liveness/readiness | Supported |
{{< /qa >}}

{{< qa num="19" q="How do you implement Pod Disruption Budgets (PDB) for high availability?" level="intermediate" >}}
A **PodDisruptionBudget (PDB)** limits the number of pods that can be simultaneously unavailable during **voluntary disruptions** (node drains, upgrades) — ensuring your app stays highly available during maintenance.

**Voluntary disruptions (PDB protects against these):**
- `kubectl drain node` during upgrades
- Cluster autoscaler scaling down nodes
- Node pool upgrades

**Involuntary disruptions (PDB does NOT protect):**
- Node hardware failure
- Kernel panic
- OOMKill

**Create a PDB:**
```yaml
# Option 1: minAvailable — always keep at least N pods running
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2           # Always keep at least 2 pods up
  selector:
    matchLabels:
      app: web-app

---
# Option 2: maxUnavailable — allow at most N pods to be down
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
  namespace: production
spec:
  maxUnavailable: 1         # Allow at most 1 pod to be unavailable
  selector:
    matchLabels:
      app: api-server

---
# Option 3: percentage
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
spec:
  minAvailable: "80%"       # Always keep 80% of pods available
  selector:
    matchLabels:
      app: backend
```

```bash
# View PDBs
kubectl get pdb -n production

# Check PDB status
kubectl describe pdb web-app-pdb -n production
# Shows: Allowed disruptions, Current pods, etc.

# Drain a node (respects PDBs)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
```
{{< /qa >}}

{{< qa num="20" q="How does Kubernetes handle secrets securely? What are the best practices?" level="intermediate" >}}
By default, Kubernetes Secrets are stored **base64-encoded** (NOT encrypted) in etcd. This means anyone with etcd access can read them.

**Best practices for Kubernetes Secret management:**

**1. Enable Encryption at Rest:**
```yaml
# /etc/kubernetes/encryption-config.yaml (on API server)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <base64-encoded-32-byte-key>
  - identity: {}   # Fallback for unencrypted data
```

**2. Use External Secret Managers (recommended for production):**
```yaml
# External Secrets Operator — syncs AWS Secrets Manager → K8s Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: db-secret              # Creates this K8s Secret
  data:
  - secretKey: DB_PASSWORD
    remoteRef:
      key: prod/myapp/database   # AWS Secrets Manager path
      property: password
```

**3. RBAC to limit Secret access:**
```yaml
# Only allow specific service accounts to read secrets
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["db-secret", "api-key"]  # Specific secrets only
  verbs: ["get"]
```

**4. Never do these:**
```yaml
# ❌ Never put secrets in ConfigMaps
# ❌ Never commit secrets to Git
# ❌ Never echo secrets in logs
# ❌ Never use environment variables for very sensitive data
#    (they can appear in process lists)

# ✅ Mount secrets as files instead
volumeMounts:
- name: db-credentials
  mountPath: /etc/secrets
  readOnly: true
volumes:
- name: db-credentials
  secret:
    secretName: db-secret
    defaultMode: 0400    # Read-only for owner only
```

```bash
# Audit who accessed a secret
kubectl get events | grep secret
# Enable audit logs in kube-apiserver for full audit trail
```
{{< /qa >}}

{{< qa num="21" q="How do you troubleshoot a Pod stuck in 'Pending' state?" level="advanced" >}}
A pod in **Pending** means the scheduler cannot find a suitable node. This is always a resource or constraint issue.

**Systematic diagnosis:**
```bash
# Step 1 — describe the pod (most important command)
kubectl describe pod <pod-name> -n <namespace>
# Look at the 'Events' section at the bottom

# Step 2 — check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
kubectl top nodes

# Step 3 — check if PVC is bound (if pod mounts one)
kubectl get pvc -n <namespace>
```

**Common causes and fixes:**

**Cause 1: Insufficient CPU/Memory:**
```bash
# Events will show:
# "0/3 nodes are available: 3 Insufficient cpu"

# Fix: Scale up node group or reduce resource requests
kubectl get nodes
kubectl describe node <node> | grep -A 10 "Allocated resources"

# Check what's using resources
kubectl top pods --all-namespaces --sort-by=cpu
```

**Cause 2: No nodes match nodeSelector/Affinity:**
```bash
# Events: "0/3 nodes are available: 3 node(s) didn't match Pod's node affinity"

# Check node labels
kubectl get nodes --show-labels

# Add missing label to node
kubectl label node <node-name> disktype=ssd
```

**Cause 3: PVC not bound:**
```bash
# Events: "persistentvolumeclaim not found" or PVC stuck in Pending

kubectl describe pvc <pvc-name>
# Check if StorageClass exists
kubectl get storageclass
```

**Cause 4: Taint not tolerated:**
```bash
# Events: "0/3 nodes are available: 3 node(s) had untolerated taint"

kubectl describe nodes | grep -i taint
# Add toleration to pod spec
```

**Cause 5: Too many pods on nodes (maxPods limit):**
```bash
# Each node has a default limit of 110 pods
kubectl describe node <node> | grep "Non-terminated Pods"
```

**Quick diagnosis script:**
```bash
# One command to see all pending pods and their reason
kubectl get pods --all-namespaces --field-selector=status.phase=Pending
kubectl describe pods --all-namespaces | grep -A 10 "Events:"
```
{{< /qa >}}

{{< qa num="22" q="How do you troubleshoot a Pod in 'CrashLoopBackOff'?" level="advanced" >}}
**CrashLoopBackOff** = the container starts, crashes, Kubernetes restarts it — in a loop. The backoff time doubles each time (10s → 20s → 40s → ... up to 5 min).

**Systematic diagnosis:**
```bash
# Step 1 — describe pod for events and exit codes
kubectl describe pod <pod-name> -n <namespace>

# Step 2 — current logs (may be empty if app crashes immediately)
kubectl logs <pod-name> -n <namespace>

# Step 3 — PREVIOUS container logs (before the crash) — most useful
kubectl logs <pod-name> -n <namespace> --previous

# Step 4 — check exit code
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].lastState.terminated}'
```

**Exit code reference:**

| Exit Code | Meaning | Fix |
|-----------|---------|-----|
| `0` | Success (not a crash issue) | Check restart policy |
| `1` | App error | Check app logs |
| `137` | OOMKilled (Out of Memory) | Increase memory limit |
| `139` | Segfault | Bug in app or wrong binary |
| `143` | SIGTERM — graceful shutdown | Check if liveness probe is too aggressive |

**Common fixes:**
```bash
# Fix OOMKill (exit 137) — increase memory limit
kubectl patch deployment <name> -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"1Gi"}}}]}}}}'

# Fix: App can't connect to database
# Check if DB service is reachable from pod
kubectl exec -it <pod-name> -- nc -zv postgres-svc 5432

# Fix: Wrong image command — override to debug
kubectl run debug-pod \
  --image=<same-image> \
  --restart=Never \
  --rm -it \
  --command -- /bin/sh

# Fix: Liveness probe killing app too early — increase initialDelaySeconds
livenessProbe:
  initialDelaySeconds: 60    # Give app more time to start
  failureThreshold: 5

# Fix: Missing environment variable or secret
kubectl exec -it <pod-name> -- env | grep DB_   # Check env vars
kubectl describe pod <pod-name> | grep -A 5 "Environment"
```
{{< /qa >}}

{{< qa num="23" q="How do you perform zero-downtime deployments in Kubernetes?" level="advanced" >}}
Zero-downtime deployments require a combination of correct deployment strategy, pod lifecycle hooks, and health probes.

**Complete zero-downtime deployment configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2          # Can temporarily have 8 pods (6+2)
      maxUnavailable: 0    # Never drop below 6 healthy pods
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      # 1. Give pods time to finish in-flight requests before shutdown
      terminationGracePeriodSeconds: 60

      containers:
      - name: web
        image: web-app:v2.0
        ports:
        - containerPort: 8080

        # 2. Readiness probe — pod only gets traffic when truly ready
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3

        # 3. Liveness probe — restart if pod is dead
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 15

        # 4. preStop hook — wait for traffic to drain before shutdown
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - sleep 15    # Wait 15s for load balancer to remove pod from rotation

        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

**Canary deployment pattern:**
```bash
# Deploy v2 to 10% of traffic first
kubectl scale deployment web-app-v1 --replicas=9    # 9 old pods
kubectl scale deployment web-app-v2 --replicas=1    # 1 new pod (10%)

# If v2 is healthy, gradually increase
kubectl scale deployment web-app-v2 --replicas=5    # 50%
kubectl scale deployment web-app-v2 --replicas=10   # 100%
kubectl scale deployment web-app-v1 --replicas=0    # Remove old
```

**Blue-Green deployment:**
```bash
# Switch Service selector from blue to green instantly
kubectl patch service web-svc \
  -p '{"spec":{"selector":{"version":"v2"}}}'

# Rollback instantly by switching back
kubectl patch service web-svc \
  -p '{"spec":{"selector":{"version":"v1"}}}'
```
{{< /qa >}}

{{< qa num="24" q="How does Kubernetes etcd work? What happens if etcd goes down?" level="advanced" >}}
**etcd** is a distributed, consistent key-value store that serves as Kubernetes' source of truth. Every object (pods, services, configmaps, secrets) is stored in etcd.

**Architecture:**
```
All cluster state stored in etcd:
/registry/pods/default/my-pod
/registry/services/default/my-svc
/registry/deployments/production/web-app
/registry/secrets/default/db-secret
```

**etcd uses the Raft consensus algorithm:**
- Requires a **quorum** (majority) to function: `(n/2) + 1`
- 3 members → can tolerate 1 failure
- 5 members → can tolerate 2 failures
- Always use **odd numbers** of etcd members

| Cluster Size | Quorum | Tolerable Failures |
|-------------|--------|-------------------|
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

**What happens when etcd goes down:**
```
etcd down → API server cannot read/write state
           → No new pods can be scheduled
           → Existing pods keep running (kubelet works independently)
           → kubectl commands fail
           → New deployments fail
```

**Backup etcd (critical for disaster recovery):**
```bash
# Take an etcd snapshot
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify the snapshot
ETCDCTL_API=3 etcdctl snapshot status /backup/etcd-snapshot-$(date +%Y%m%d).db

# Restore from snapshot
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot.db \
  --data-dir=/var/lib/etcd-restored

# Automate daily backups via CronJob
kubectl apply -f etcd-backup-cronjob.yaml
```

**Best practices:**
- Always run etcd on **separate dedicated nodes** from worker nodes
- Use **SSDs** — etcd is I/O intensive
- Monitor etcd latency (should be < 10ms)
- Take snapshots **before every cluster upgrade**
{{< /qa >}}

{{< qa num="25" q="How do you secure a Kubernetes cluster? Walk through the security layers." level="advanced" >}}
Kubernetes security is a **defence-in-depth** approach with multiple layers:

**Layer 1 — API Server security:**
```yaml
# Restrict anonymous access
--anonymous-auth=false

# Enable audit logging
--audit-log-path=/var/log/kubernetes/audit.log
--audit-policy-file=/etc/kubernetes/audit-policy.yaml

# Disable insecure port
--insecure-port=0
```

**Layer 2 — RBAC (least privilege):**
```yaml
# Never use cluster-admin in applications
# Create minimal roles per service

# Audit RBAC permissions
kubectl auth can-i --list --as=system:serviceaccount:production:my-sa
```

**Layer 3 — Network Policies (zero-trust networking):**
```yaml
# Deny all traffic by default, then allow explicitly
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  podSelector: {}          # Applies to ALL pods in namespace
  policyTypes:
  - Ingress
  - Egress
  # No rules = deny all
```

**Layer 4 — Pod Security (Security Context):**
```yaml
spec:
  securityContext:
    runAsNonRoot: true       # Never run as root
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault   # Enable seccomp filtering

  containers:
  - name: app
    image: my-app:v1
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true    # Container cannot write to filesystem
      capabilities:
        drop:
        - ALL                          # Drop all Linux capabilities
        add:
        - NET_BIND_SERVICE             # Add only what you need
```

**Layer 5 — Image Security:**
```bash
# Scan images before pushing
trivy image my-app:v1
grype my-app:v1

# Use Image Policy Webhook to block vulnerable images
# Use private registry — never use :latest tag in production
```

**Layer 6 — Secrets Management:**
```bash
# Enable encryption at rest for etcd
# Use External Secrets Operator with AWS Secrets Manager / Vault
# Rotate secrets regularly
```

**Layer 7 — Runtime Security:**
```bash
# Use Falco for runtime threat detection
helm install falco falcosecurity/falco \
  --namespace falco-system \
  --create-namespace

# Falco detects: shell in containers, privilege escalation,
# unexpected network connections, file system changes
```

**Pod Security Admission (replaces deprecated PodSecurityPolicy):**
```yaml
# Label namespace to enforce security standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted    # Most strict
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```
{{< /qa >}}

{{< qa num="26" q="What is Kubernetes Operator pattern? When would you build a custom operator?" level="advanced" >}}
A **Kubernetes Operator** is a method of packaging, deploying, and managing a Kubernetes application using **Custom Resource Definitions (CRDs)** and custom controllers that encode operational knowledge.

**The Operator pattern:**
```
Human Operator knowledge → encoded in → Custom Controller
                                           ↓
CRD (custom resource) → Controller reconciles → Desired state
```

**When to build a Kubernetes Operator:**
- Managing stateful applications (databases, message queues)
- Automating complex operational tasks (backups, upgrades, failover)
- When your app needs more than Deployment/StatefulSet
- Encoding domain-specific knowledge (e.g., how to scale a database cluster)

**Example CRD — custom database resource:**
```yaml
# 1. Define the Custom Resource Definition
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: postgresclusters.db.example.com
spec:
  group: db.example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              replicas:
                type: integer
              version:
                type: string
              backupSchedule:
                type: string
  scope: Namespaced
  names:
    plural: postgresclusters
    singular: postgrescluster
    kind: PostgresCluster

---
# 2. Use the custom resource (like any K8s object now)
apiVersion: db.example.com/v1
kind: PostgresCluster
metadata:
  name: my-database
  namespace: production
spec:
  replicas: 3
  version: "15.2"
  backupSchedule: "0 2 * * *"    # Operator handles backups automatically
```

**Popular real-world operators:**
```bash
# Install cert-manager operator (manages TLS certificates)
helm install cert-manager jetstack/cert-manager --set installCRDs=true

# Install Prometheus operator (manages monitoring stack)
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack

# Install Strimzi operator (manages Kafka clusters)
helm install strimzi-kafka-operator strimzi/strimzi-kafka-operator
```

**Build your own operator:**
```bash
# Use Operator SDK (most popular framework)
operator-sdk init --domain example.com --repo github.com/example/my-operator
operator-sdk create api --group apps --version v1 --kind MyApp --resource --controller

# Or use Kubebuilder
kubebuilder init --domain example.com
kubebuilder create api --group apps --version v1 --kind MyApp
```
{{< /qa >}}

{{< qa num="27" q="Explain Kubernetes resource management — LimitRange, ResourceQuota, and Priority Classes." level="advanced" >}}
Three mechanisms control resource usage at different levels:

**1. ResourceQuota — limits resources for an entire namespace:**
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Compute resources
    requests.cpu: "20"           # Max 20 CPU cores requested in namespace
    requests.memory: 40Gi        # Max 40Gi memory requested
    limits.cpu: "40"
    limits.memory: 80Gi

    # Object count limits
    pods: "100"
    services: "20"
    persistentvolumeclaims: "30"
    secrets: "50"
    configmaps: "50"

    # Storage limits
    requests.storage: "500Gi"
    storageclass.storage.k8s.io/fast-ssd.requests.storage: "200Gi"
```

**2. LimitRange — sets defaults and limits per Pod/Container:**
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limitrange
  namespace: production
spec:
  limits:
  # Container-level defaults and max/min
  - type: Container
    default:               # Default LIMIT if not specified
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:        # Default REQUEST if not specified
      cpu: "100m"
      memory: "128Mi"
    max:                   # Maximum any container can request
      cpu: "4"
      memory: "8Gi"
    min:                   # Minimum any container must request
      cpu: "50m"
      memory: "64Mi"

  # Pod-level maximum
  - type: Pod
    max:
      cpu: "8"
      memory: "16Gi"

  # PVC storage limits
  - type: PersistentVolumeClaim
    max:
      storage: "100Gi"
    min:
      storage: "1Gi"
```

**3. PriorityClass — controls eviction order during resource pressure:**
```yaml
# High priority — for critical system workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "Critical production services"

---
# Low priority — for batch jobs
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
description: "Batch jobs and non-critical workloads"

---
# Use in Pod
spec:
  priorityClassName: high-priority    # This pod won't be evicted first
  containers:
  - name: critical-app
    image: my-app:v1
```

**Eviction order during node pressure:**
```
BestEffort (no requests/limits) → evicted FIRST
Burstable (requests < limits)   → evicted SECOND
Guaranteed (requests = limits)  → evicted LAST
```
{{< /qa >}}

{{< qa num="28" q="How do you implement GitOps with Kubernetes using ArgoCD?" level="advanced" >}}
**GitOps** is a deployment methodology where Git is the **single source of truth** for cluster state. ArgoCD continuously syncs the cluster to match what's in Git.

**GitOps principles:**
1. Entire system described declaratively in Git
2. Desired state versioned in Git
3. Approved changes automatically applied to the cluster
4. Software agents ensure correctness and alert on divergence

**Install ArgoCD:**
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port-forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**Create an ArgoCD Application:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app-production
  namespace: argocd
spec:
  project: default

  # Source — where your manifests live in Git
  source:
    repoURL: https://github.com/myorg/k8s-configs
    targetRevision: main
    path: apps/web-app/production

  # Destination — where to deploy in the cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: production

  # Sync policy — auto-sync when Git changes
  syncPolicy:
    automated:
      prune: true         # Delete resources removed from Git
      selfHeal: true      # Revert manual changes to cluster
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        maxDuration: 3m
        factor: 2
```

**GitOps workflow:**
```bash
# Developer makes a change
git checkout -b feature/update-image
# Edit k8s/deployment.yaml — change image tag
git commit -m "deploy: bump web-app to v2.5"
git push origin feature/update-image

# Create PR → review → merge to main
# ArgoCD detects the change within 3 minutes
# ArgoCD applies the change to cluster automatically

# Check sync status
argocd app get web-app-production
argocd app sync web-app-production    # Manual sync if needed
argocd app history web-app-production # Deployment history
```
{{< /qa >}}

{{< qa num="29" q="How do you debug a node that is NotReady in Kubernetes?" level="advanced" >}}
**NotReady** means the control plane cannot communicate with the node or the node's conditions are failing.

**Immediate diagnosis:**
```bash
# Step 1 — check node status and conditions
kubectl get nodes
kubectl describe node <node-name>

# Look for conditions:
# Ready = False/Unknown
# MemoryPressure = True
# DiskPressure = True
# PIDPressure = True
# NetworkUnavailable = True
```

**Step 2 — SSH into the node and check:**
```bash
# Check kubelet status (most common cause)
sudo systemctl status kubelet
sudo journalctl -u kubelet -f --no-pager | tail -50

# Common kubelet errors:
# "failed to get node info" → network issue
# "certificate expired" → renew kubelet certificates
# "PLEG is not healthy" → pod lifecycle event generator issues (often disk pressure)

# Check node resources
df -h              # Disk usage (DiskPressure if >85%)
free -m            # Memory (MemoryPressure)
top                # CPU and process check
ps aux | wc -l     # PID count (PIDPressure if >1000)
```

**Fix common causes:**
```bash
# Fix 1: kubelet not running
sudo systemctl restart kubelet

# Fix 2: Disk pressure — clean up
docker system prune -af         # Clean Docker images/containers
crictl rmi --prune              # Clean containerd images
sudo journalctl --vacuum-size=500M    # Clean journal logs

# Fix 3: Certificate expired
sudo kubeadm alpha certs renew all
sudo systemctl restart kubelet

# Fix 4: Network plugin not running
kubectl get pods -n kube-system | grep -E "calico|flannel|cilium"
kubectl delete pod -n kube-system <broken-cni-pod>   # Restart CNI pod

# Fix 5: Node has too many pods — eviction happening
kubectl describe node <node> | grep -i "eviction\|pressure"
```

**Cordon and drain a problematic node:**
```bash
# Prevent new pods from scheduling on this node
kubectl cordon <node-name>

# Move existing pods to other nodes
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force

# After fixing the node, uncordon it
kubectl uncordon <node-name>
```
{{< /qa >}}

{{< qa num="30" q="Design a production-grade Kubernetes cluster architecture for a high-traffic application." level="advanced" >}}
A production-grade Kubernetes architecture for high-traffic needs to address availability, security, scalability, and observability.

**Cluster architecture:**
```
                    ┌─────────────────────────────────┐
                    │   CONTROL PLANE (HA)             │
                    │   3x master nodes (multi-AZ)     │
                    │   etcd cluster (separate nodes)  │
                    └──────────────┬──────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                          ▼
  ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
  │ AZ-1 Nodes  │          │ AZ-2 Nodes  │           │ AZ-3 Nodes  │
  │ App workers │          │ App workers │           │ App workers │
  │ GPU nodes   │          │ GPU nodes   │           │ Spot nodes  │
  └─────────────┘          └─────────────┘           └─────────────┘
```

**Node pool strategy:**
```yaml
# System node pool — control plane components
nodePool: system
  instanceType: m5.xlarge
  count: 3
  taints: [CriticalAddonsOnly=true:NoSchedule]

# Application node pool — production workloads (on-demand)
nodePool: app-ondemand
  instanceType: m5.2xlarge
  minCount: 6
  maxCount: 50
  availabilityZones: [us-east-1a, us-east-1b, us-east-1c]

# Spot node pool — batch/non-critical workloads (80% cheaper)
nodePool: app-spot
  instanceTypes: [m5.2xlarge, m5.4xlarge, m5a.2xlarge]
  spot: true
  minCount: 0
  maxCount: 100
```

**Production deployment configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 9              # 3 per AZ
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 0
  template:
    spec:
      # Spread across zones and nodes
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web-app
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: web-app
      # Don't schedule on spot nodes (critical app)
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node.kubernetes.io/lifecycle
                operator: NotIn
                values: [spot]
      containers:
      - name: web-app
        image: web-app:v3.0
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
        readinessProbe:
          httpGet: {path: /ready, port: 8080}
          periodSeconds: 5
        livenessProbe:
          httpGet: {path: /health, port: 8080}
          periodSeconds: 15
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 60
```

**Observability stack:**
```bash
# Metrics — Prometheus + Grafana
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack

# Logs — EFK or Loki stack
helm install loki grafana/loki-stack --set grafana.enabled=false

# Tracing — Jaeger or Tempo
helm install jaeger jaegertracing/jaeger

# Alerts — configure PagerDuty/Slack in Alertmanager
```

**Key SLOs to monitor:**
```yaml
# Error rate < 0.1%
# P99 latency < 200ms
# Availability > 99.9%
# Pod restart rate < 1/hour
# Node CPU < 70%
# Node Memory < 80%
```
{{< /qa >}}

</div>
