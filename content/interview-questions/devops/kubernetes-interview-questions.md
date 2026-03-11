---
title: "Kubernetes Interview Questions & Answers (2024)"
description: "50+ Kubernetes interview questions covering Pods, Deployments, Services, RBAC, Helm, networking, autoscaling, and troubleshooting — Basic to Advanced."
date: 2024-02-10
author: "CloudOps Hub"
tags: ["kubernetes", "k8s", "interview", "devops", "containers"]
tool: "kubernetes"
level: "All Levels"
question_count: 10
---

<div class="qa-list">

{{< qa num="1" q="What is Kubernetes and what are its core components?" level="basic" >}}
**Kubernetes (K8s)** is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications.

**Control Plane components:**
- **kube-apiserver** — HTTP API gateway; all interactions go through here
- **etcd** — distributed key-value store; source of truth for cluster state
- **kube-scheduler** — assigns Pods to nodes based on resource requirements
- **kube-controller-manager** — runs controllers (ReplicaSet, Deployment, Node, etc.)
- **cloud-controller-manager** — integrates with cloud provider (AWS, GCP, Azure)

**Worker Node components:**
- **kubelet** — agent on each node; ensures containers run as specified
- **kube-proxy** — network proxy; implements Service virtual IPs
- **Container Runtime** — runs containers (containerd, CRI-O)
{{< /qa >}}

{{< qa num="2" q="What is the difference between a Pod, Deployment, and StatefulSet?" level="basic" >}}
**Pod** — smallest deployable unit; 1+ containers sharing network and storage
```yaml
# Ephemeral — if deleted, not recreated
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: nginx:1.25
```

**Deployment** — manages **stateless** Pods; supports rolling updates and rollback
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**StatefulSet** — for **stateful** apps (databases)
- Pods get stable names: `postgres-0`, `postgres-1`, `postgres-2`
- Ordered startup/shutdown (0→1→2)
- Persistent volumes survive pod restarts

**DaemonSet** — runs one pod per node (log collectors, monitoring agents)
**Job / CronJob** — run-to-completion tasks; scheduled tasks
{{< /qa >}}

{{< qa num="3" q="Explain the types of Kubernetes Services." level="basic" >}}
| Type | Scope | Use Case |
|------|-------|----------|
| **ClusterIP** | Internal cluster only | Service-to-service communication |
| **NodePort** | `<NodeIP>:<30000-32767>` | Dev/test direct access |
| **LoadBalancer** | Cloud LB (ELB, GLB) | Production external traffic |
| **ExternalName** | DNS CNAME alias | Pointing to external services |

```yaml
# Production LoadBalancer (AWS NLB)
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
```
{{< /qa >}}

{{< qa num="4" q="How does Kubernetes RBAC work? Create a read-only service account." level="intermediate" >}}
**RBAC** (Role-Based Access Control) restricts what users and service accounts can do.

**Objects:**
- **Role** — namespace-scoped permissions
- **ClusterRole** — cluster-wide permissions
- **RoleBinding** — bind Role to subjects in a namespace
- **ClusterRoleBinding** — bind ClusterRole cluster-wide

```yaml
# 1. Create Role with read-only permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]

---
# 2. Bind to a service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: monitoring-sa
  namespace: monitoring
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Verify permissions
kubectl auth can-i list pods -n production --as=system:serviceaccount:monitoring:monitoring-sa
# yes

kubectl auth can-i delete pods -n production --as=system:serviceaccount:monitoring:monitoring-sa
# no
```
{{< /qa >}}

{{< qa num="5" q="How does HorizontalPodAutoscaler (HPA) work?" level="intermediate" >}}
HPA automatically adjusts Pod replicas based on observed metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 512Mi
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
```

**Requirements:** Metrics Server must be running; Pods must define resource `requests`.

**VPA (Vertical Pod Autoscaler)** automatically adjusts CPU/memory requests — complementary to HPA.
{{< /qa >}}

{{< qa num="6" q="How do you troubleshoot a Pod stuck in CrashLoopBackOff?" level="advanced" >}}
**CrashLoopBackOff** = container starts, crashes, K8s restarts it — in a loop.

**Systematic diagnosis:**
```bash
# 1. Describe pod — check Events section
kubectl describe pod <name> -n <ns>

# 2. Current logs
kubectl logs <name> -n <ns>

# 3. Previous container logs (before crash)
kubectl logs <name> -n <ns> --previous

# 4. Resource usage
kubectl top pod <name> -n <ns>
```

**Common causes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Exit code 137 | OOMKilled | Increase memory limit |
| "executable not found" | Wrong CMD | Fix `command:` in spec |
| "connection refused" | DB/dep not ready | Add `initContainers` or retry logic |
| "file not found" | Missing ConfigMap mount | Create ConfigMap/Secret |
| Liveness probe failing | App slow to start | Increase `initialDelaySeconds` |

```bash
# Debug: run container with override command
kubectl run debug --image=<same-image> -it --rm --restart=Never \
  --command -- /bin/sh
```
{{< /qa >}}

</div>
