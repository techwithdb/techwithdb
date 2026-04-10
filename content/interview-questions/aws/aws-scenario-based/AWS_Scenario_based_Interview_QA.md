---
title: "AWS EC2 Scenario Interview Questions & Answers"
description: "30+ AWS EC2 interview questions covering instance types, Auto Scaling, AMIs, pricing models, networking, storage, and troubleshooting — Basic to Advanced."
date: 2025-01-20
author: "DB"
tags: ["aws", "ec2", "interview", "certification"]
tool: "aws"
level: "All Levels"
question_count: 30
---

<div class="qa-list">

> A comprehensive collection of real-world AWS scenario-based interview questions commonly asked at top tech companies (Amazon, Netflix, Uber, Spotify, etc.) for Senior DevOps / Cloud Engineer roles.

## Scenario based questions


{{< qa num="1" q="Your company's e-commerce application is deployed in a single AWS region (us-east-1). The business wants 99.99% uptime with an RTO of 15 minutes and RPO of 5 minutes. How would you design this?" level="advanced" >}}

**Answer:**

**Architecture Design:**

```
Primary Region (us-east-1)          DR Region (us-west-2)
┌─────────────────────────┐         ┌─────────────────────────┐
│  Route53 (Health Check) │◄───────►│  Route53 Failover       │
│  ALB (Multi-AZ)         │         │  ALB (Warm Standby)     │
│  ASG (3 AZs)            │         │  ASG (Min Capacity)     │
│  RDS Multi-AZ           │────────►│  RDS Read Replica       │
│  ElastiCache Cluster    │         │  ElastiCache (Replica)  │
│  S3 (Source of Truth)   │────────►│  S3 (Cross-Region Rep.) │
└─────────────────────────┘         └─────────────────────────┘
```

**Key Components:**

- **Route 53 with Health Checks** — Latency-based or failover routing policy. Health checks on ALB endpoints every 10 seconds with 3 failure threshold.
- **RDS with Cross-Region Read Replica** — Promote replica to primary during failover. Enable automated backups with 5-minute point-in-time recovery.
- **S3 Cross-Region Replication (CRR)** — Replication time control (RTC) guarantees objects replicated within 15 minutes. Useful for user-generated content.
- **Global Accelerator** — Static anycast IPs that route traffic to the healthiest endpoint. Reduces failover time from DNS TTL issues.
- **Aurora Global Database** — For sub-second RPO; supports cross-region replication lag < 1 second. Can be promoted in < 1 minute (RTO).
- **AMI Replication** — Use EventBridge + Lambda to copy AMIs across regions after every deployment.

**Automation:**
- Use AWS Systems Manager Automation runbooks to handle failover steps.
- Implement a "game day" chaos testing schedule.

**RTO/RPO Achievement:**
| Component | RTO Contribution | RPO Contribution |
|-----------|-----------------|-----------------|
| Route53 Failover | ~1 min | — |
| Aurora Global DB Promote | ~1 min | < 1 sec |
| ASG Scale-up in DR | ~5 min | — |
| Total | ~7-8 min ✅ | < 5 min ✅ |

{{< /qa >}}

{{< qa num="2" q="During a Black Friday sale, your application went down due to a single AZ failure. What went wrong and how do you fix it?" level="advanced" >}}


**Answer:**

**Root Cause Investigation:**
- Single AZ deployment or AZ-pinned resources (e.g., EBS volumes, single-AZ RDS).
- ASG might have only had instances in one AZ.
- ElastiCache or RDS configured as single-AZ.

**Immediate Fix:**
1. Failover RDS to Multi-AZ standby (automated if Multi-AZ was enabled).
2. Force ASG to rebalance across AZs using `aws autoscaling start-instance-refresh`.
3. Verify ALB has subnets in all target AZs.

**Permanent Prevention:**
```hcl
# Terraform example - ASG across 3 AZs
resource "aws_autoscaling_group" "app" {
  vpc_zone_identifier = [
    aws_subnet.private_az1.id,
    aws_subnet.private_az2.id,
    aws_subnet.private_az3.id
  ]
  min_size         = 3
  max_size         = 30
  desired_capacity = 6

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "capacity-optimized"
    }
  }
}
```

- Enable RDS Multi-AZ: `aws rds modify-db-instance --multi-az`
- Set ElastiCache with at least 1 replica per shard.
- Use `aws:RequestedRegion` condition in SCPs to enforce Multi-AZ deployments.

{{< /qa >}}


{{< qa num="3" q="You need to build a zero-downtime deployment pipeline for a microservices application running on EKS. Walk me through your design." level="advanced" >}}


**Answer:**

**Pipeline Architecture:**
```
Developer Push
     │
     ▼
CodeCommit / GitHub
     │
     ▼
CodePipeline
 ├── Stage 1: Source
 ├── Stage 2: Build (CodeBuild)
 │    ├── Unit Tests
 │    ├── SAST (Semgrep/Checkov)
 │    ├── Docker Build & Push to ECR
 │    └── Trivy Image Scan
 ├── Stage 3: Deploy to Dev (kubectl apply)
 ├── Stage 4: Integration Tests
 ├── Stage 5: Deploy to Staging (Blue/Green)
 ├── Stage 6: Load Tests (k6/Gatling)
 └── Stage 7: Deploy to Prod (Canary via Argo Rollouts)
```

**Zero-Downtime Strategy — Canary with Argo Rollouts:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
spec:
  strategy:
    canary:
      steps:
      - setWeight: 5       # 5% traffic to new version
      - pause: {duration: 5m}
      - setWeight: 20
      - pause: {duration: 10m}
      - analysis:          # Auto-rollback if error rate > 1%
          templates:
          - templateName: error-rate-check
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100
```

**Analysis Template (auto-rollback):**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate-check
spec:
  metrics:
  - name: error-rate
    provider:
      prometheus:
        query: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) * 100
    successCondition: result[0] < 1
    failureLimit: 3
```

**Additional Safeguards:**
- PodDisruptionBudget: `minAvailable: 80%`
- Readiness/liveness probes with proper thresholds
- Pre-sync hooks for DB migrations with Flyway
- Slack/PagerDuty notifications at each stage

{{< /qa >}}


{{< qa num="4" q="A developer accidentally pushed secrets (AWS credentials) to a public GitHub repo. What is your immediate response and how do you prevent this in the future?" level="advanced" >}}


**Answer:**

**Immediate Response (within minutes):**

1. **Revoke the credentials immediately:**
   ```bash
   aws iam delete-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --user-name compromised-user
   ```

2. **Check CloudTrail for unauthorized usage:**
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE \
     --start-time 2024-01-01T00:00:00Z
   ```

3. **Invalidate any active sessions (if role-based):**
   ```bash
   aws iam put-role-policy --role-name compromised-role \
     --policy-name DenyAll --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]}'
   ```

4. **Rotate all secrets in the affected environment.**

5. **Notify security team and raise an incident ticket.**

**Investigation:** Review what APIs were called, from which IPs, and assess blast radius.

**Prevention Strategy:**

| Layer | Tool | Action |
|-------|------|---------|
| Developer Machine | git-secrets / truffleHog | Pre-commit hook blocks commits |
| CI/CD Pipeline | GitGuardian / Semgrep | Scan on every PR |
| Repository | GitHub Secret Scanning | Auto-alerts on secret detection |
| AWS Native | AWS Secrets Manager | Store secrets, never in code |
| Monitoring | GuardDuty | Detects anomalous API activity |

**Pre-commit hook setup:**
```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline
# Add to .pre-commit-config.yaml
```
{{< /qa >}}


{{< qa num="5" q="Your team has 500+ Terraform resources and the `terraform plan` takes 45 minutes. How do you fix this?" level="advanced" >}}


**Answer:**

**Root Causes & Solutions:**

**1. Monolithic State File → Break into modules with separate states:**
```
environments/
├── prod/
│   ├── networking/     ← separate state
│   ├── compute/        ← separate state
│   ├── databases/      ← separate state
│   └── security/       ← separate state
└── staging/
    └── ...
```

**2. Use `-target` for focused changes (short-term):**
```bash
terraform plan -target=module.ecs_service
```

**3. Enable provider parallelism:**
```bash
terraform apply -parallelism=20
```

**4. Use `terraform refresh=false` when state is trusted:**
```bash
terraform plan -refresh=false
```

**5. Remote state with S3 + locking via DynamoDB:**
```hcl
terraform {
  backend "s3" {
    bucket         = "my-tfstate-prod"
    key            = "compute/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}
```

**6. Migrate to Terragrunt for DRY configurations and parallel runs:**
```bash
terragrunt run-all plan  # Plans all modules in parallel
```

**7. Use CDK for Terraform (CDKTF) or Pulumi for complex orgs.**

{{< /qa >}}


{{< qa num="6" q="How do you handle Terraform state drift in a production environment?" level="advanced" >}}


**Answer:**

**Detecting Drift:**
```bash
terraform plan -refresh=true  # Detects drift
terraform show                # Current state
```

**AWS Config for continuous drift detection:**
- Enable AWS Config Rules to track resource changes.
- Use `AWS::CloudFormation::Stack` drift detection for CloudFormation.

**Automated Drift Detection Pipeline:**
```yaml
# EventBridge Rule → Lambda → SNS notification
schedule: rate(6 hours)
action: Run terraform plan, parse output, alert if drift detected
```

**Resolution Strategy:**
1. **Import the drifted resource:** `terraform import aws_instance.web i-1234567890abcdef0`
2. **Reconcile state:** Update `.tf` files to match reality.
3. **Apply to enforce desired state:** `terraform apply`

**Prevention:**
- Enforce IaC-only changes via SCPs: deny console changes to tagged production resources.
- Tag all IaC resources and use AWS Config to alert on untagged changes.
- Implement `tf-drift` GitHub Action on a schedule.

{{< /qa >}}


{{< qa num="7" q="Your EKS pods are getting OOMKilled frequently in production. How do you diagnose and resolve this?" level="advanced" >}}


**Answer:**

**Diagnosis:**
```bash
# Check OOMKilled events
kubectl get pods --all-namespaces | grep OOMKilled
kubectl describe pod <pod-name> | grep -A 10 "Last State"

# Check actual memory usage vs limits
kubectl top pods --sort-by=memory

# Check node memory pressure
kubectl describe nodes | grep -A 5 "Conditions"
```

**Metrics to check in CloudWatch Container Insights:**
- `pod_memory_working_set` vs `pod_memory_limit`
- `node_memory_utilization`

**Resolution Steps:**

**1. Right-size resource requests/limits:**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"   # Set limit = 2x request initially
    cpu: "500m"
```

**2. Use Vertical Pod Autoscaler (VPA) in recommendation mode:**
```bash
kubectl apply -f vpa.yaml   # mode: Off (just recommends)
kubectl get vpa my-app -o yaml | grep recommendation
```

**3. Check for memory leaks in application:**
- Enable heap profiling (Java: JVM flags, Node: `--inspect`)
- Review application logs for GC pressure

**4. Enable KEDA for event-driven scaling to distribute load.**

**5. Use Karpenter for better node bin-packing:**
```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
spec:
  requirements:
  - key: node.kubernetes.io/instance-type
    operator: In
    values: ["m5.xlarge", "m5.2xlarge", "m6i.xlarge"]
```
{{< /qa >}}


{{< qa num="8" q="How would you migrate from ECS Fargate to EKS with zero downtime?" level="advanced" >}}


**Answer:**

**Migration Strategy — Strangler Fig Pattern:**

```
Phase 1: Side-by-side (Week 1-2)
  ├── ECS: 100% traffic
  └── EKS: 0% traffic (setup & validation)

Phase 2: Canary (Week 3-4)
  ├── ECS: 90% traffic
  └── EKS: 10% traffic (via Route53 weighted)

Phase 3: Gradual shift (Week 5-6)
  ├── ECS: 50% → 20% → 5%
  └── EKS: 50% → 80% → 95%

Phase 4: Full cutover (Week 7)
  └── EKS: 100% traffic, ECS decommissioned
```

**Key Steps:**
1. **Containerize ECS task definitions → Kubernetes manifests** (use `kompose` or manual translation).
2. **Set up EKS cluster** with managed node groups and Karpenter.
3. **Replicate networking:** VPC CNI, security groups for pods, ALB Ingress Controller.
4. **Migrate secrets:** AWS Secrets Manager → External Secrets Operator in EKS.
5. **Set up observability:** Prometheus + Grafana or CloudWatch Container Insights.
6. **Parallel run validation:** Compare latency, error rates, and resource usage.
7. **Traffic shifting:** Use Route53 weighted routing or AWS Global Accelerator.

{{< /qa >}}


{{< qa num="9" q="You discover that an EC2 instance in your VPC has been communicating with a known malicious IP. Walk through your incident response." level="advanced" >}}


**Answer:**

**Immediate Containment (first 15 minutes):**

```bash
# 1. Isolate the instance - attach restrictive security group
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --groups sg-quarantine-id

# 2. Take a snapshot for forensics
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "Forensics-$(date +%Y%m%d)"

# 3. Preserve memory (if needed) - stop, don't terminate
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
```

**Investigation:**
```bash
# GuardDuty findings
aws guardduty list-findings --detector-id <id>

# VPC Flow Logs analysis
aws logs filter-log-events \
  --log-group-name /aws/vpc/flowlogs \
  --filter-pattern "[..., dstaddr=203.0.113.100, ...]"

# CloudTrail - what API calls did this instance make?
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=i-1234567890abcdef0
```

**Eradication:**
1. Terminate compromised instance.
2. Rotate all credentials that instance had access to.
3. Revoke instance profile permissions.
4. Update WAF/NACL rules to block the malicious IP range.

**Recovery:**
1. Deploy a clean instance from a known-good AMI (golden AMI).
2. Apply all patches.
3. Re-run Ansible/SSM hardening playbook.

**Post-Incident:**
- Enable GuardDuty EC2 malware protection.
- Implement automated remediation with Lambda + EventBridge on GuardDuty findings.
- Add the IP to AWS Network Firewall threat intelligence feed.

{{< /qa >}}

{{< qa num="10" q="Design an IAM strategy for a 500-engineer organization with strict compliance requirements (SOC2, PCI-DSS)." level="advanced" >}}

**Answer:**

**Multi-Account Strategy with AWS Organizations:**

```
Management Account (billing only)
├── Security OU
│   ├── Log Archive Account (CloudTrail, Config)
│   └── Security Tooling Account (GuardDuty, Security Hub)
├── Infrastructure OU
│   ├── Network Account (Transit Gateway, VPCs)
│   └── Shared Services Account (ECR, artifact repos)
├── Production OU
│   ├── Prod-App-1 Account
│   └── Prod-App-2 Account
├── Non-Production OU
│   ├── Dev Account
│   └── Staging Account
└── Sandbox OU
    └── Engineer Sandbox Accounts (time-limited)
```

**IAM Principles:**
- **No long-lived credentials** — All access via SSO (AWS IAM Identity Center).
- **Least privilege** — Permission boundaries on all roles.
- **Break-glass accounts** — Emergency admin access with MFA + CloudTrail alert.

**SCPs for Compliance:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonCompliantRegions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2"]
        }
      }
    },
    {
      "Sid": "RequireMFAForConsole",
      "Effect": "Deny",
      "Action": ["iam:*"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}
      }
    }
  ]
}
```

**Role Structure:**
| Role | Access Level | MFA Required | Max Session |
|------|-------------|--------------|-------------|
| ReadOnly | S3, CloudWatch | No | 8 hours |
| Developer | Deploy to non-prod | Yes | 4 hours |
| DBA | RDS (no delete) | Yes | 2 hours |
| Ops | EC2, ECS management | Yes | 4 hours |
| Admin | All (with boundary) | Yes + approval | 1 hour |
| BreakGlass | Full admin | Hardware MFA | 1 hour |


{{< /qa >}}

{{< qa num="11" q="Your AWS bill jumped 40% last month. How do you investigate and reduce costs?" level="advanced" >}}


**Answer:**

**Investigation (Day 1):**
```bash
# Use Cost Explorer API
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Check for anomalies
aws ce get-anomalies \
  --date-interval-filter StartDate=2024-01-01,EndDate=2024-02-01
```

**Common Culprits & Fixes:**

| Issue | Detection | Fix |
|-------|-----------|-----|
| NAT Gateway data transfer | Cost Explorer by service | VPC Endpoints for S3/DynamoDB |
| Oversized EC2 instances | Compute Optimizer | Rightsize or Graviton |
| Unattached EBS volumes | AWS Config rule | Lambda cleanup automation |
| Idle RDS instances | CloudWatch CPU < 5% | Aurora Serverless v2 |
| S3 storage class | S3 Analytics | Intelligent Tiering |
| Data transfer costs | Cost Explorer by usage type | CloudFront caching |
| Forgotten dev resources | Resource Tagging | Nightly cleanup Lambda |

**Savings Implementation:**

```python
# Lambda to stop dev instances at 7 PM
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Environment', 'Values': ['dev']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )
    ids = [i['InstanceId'] for r in instances['Reservations'] for i in r['Instances']]
    if ids:
        ec2.stop_instances(InstanceIds=ids)
    return f"Stopped {len(ids)} instances"
```

**Long-term Strategy:**
- **Savings Plans:** Compute Savings Plans (covers EC2, Fargate, Lambda) — 1- or 3-year commitment.
- **Spot Instances:** For stateless workloads, batch jobs — up to 90% savings.
- **Graviton3:** 20-40% better price/performance vs x86.
- **S3 Intelligent Tiering:** Automatic cost optimization.
- **FinOps practice:** Weekly cost review meetings, per-team tagging, budget alerts.

{{< /qa >}}


{{< qa num="0" q="Design the VPC architecture for a multi-tier application that needs to be PCI-DSS compliant." level="advanced" >}}


**Answer:**

```
VPC: 10.0.0.0/16
│
├── Public Subnets (10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24) — 3 AZs
│   ├── ALB (internet-facing)
│   ├── NAT Gateway (HA across AZs)
│   └── Bastion Host (Session Manager preferred)
│
├── Private App Subnets (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24)
│   ├── ECS/EKS Worker Nodes
│   └── Lambda Functions (VPC-attached)
│
├── Private Data Subnets (10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24)
│   ├── RDS Cluster (Multi-AZ)
│   ├── ElastiCache
│   └── OpenSearch
│
└── Isolated PCI Subnet (10.0.30.0/24) — Card Data Environment (CDE)
    ├── Payment Processing Service ONLY
    ├── No internet route — ever
    └── Dedicated NACLs + Security Groups
```

**PCI-DSS Controls:**

```hcl
# NACL for PCI subnet - deny all by default, explicit allow only
resource "aws_network_acl_rule" "pci_deny_all_inbound" {
  network_acl_id = aws_network_acl.pci.id
  rule_number    = 32766
  egress         = false
  protocol       = "-1"
  rule_action    = "deny"
  cidr_block     = "0.0.0.0/0"
}
```

**Additional PCI Controls:**
- WAF with OWASP rule set on ALB.
- VPC Flow Logs → CloudWatch → Security Hub.
- AWS Shield Advanced for DDoS protection.
- VPC Endpoints for all AWS services (no internet egress for data).
- Secrets Manager for all credentials (no hardcoding).
- AWS Config Rules: `restricted-ssh`, `no-unrestricted-admin-ports`, `encrypted-volumes`.

{{< /qa >}}

{{< qa num="12" q="Your application latency increased after migrating from EC2 to ECS Fargate. How do you debug this?" level="advanced" >}}


**Answer:**

**Systematic Debugging Approach:**

**1. Isolate where latency is introduced:**
```bash
# X-Ray trace analysis
aws xray get-service-graph \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s)
```

**2. Common Fargate Latency Issues & Fixes:**

| Root Cause | Symptom | Fix |
|-----------|---------|-----|
| Cold starts | Spiky latency on new connections | Increase `desiredCount`, use connection keep-alive |
| DNS resolution delays | Latency on first request | Enable DNS caching in app / use `enableDnsSupport` |
| VPC endpoint missing | Traffic going over internet | Add PrivateLink endpoints |
| Task size undersized | High CPU/memory | Increase task CPU/memory |
| No HTTP/2 on ALB | Inefficient connections | Enable HTTP/2 on ALB target group |
| NIC bandwidth limit | High throughput tasks | Use larger Fargate task (more vCPU = more network) |

**3. Compare baseline metrics:**
```bash
# CloudWatch metrics comparison
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --statistics Average \
  --period 300
```

**4. Check ENI attachment time (Fargate cold start):**
- Fargate networking uses `awsvpc` mode — each task gets its own ENI.
- ENI creation can take 5-20 seconds → use `ECS Service Connect` or keep tasks warm.

**5. Enable X-Ray for distributed tracing** across services to pinpoint exact bottleneck.

{{< /qa >}}

{{< qa num="13" q="Design an observability stack for a microservices platform with 50+ services on EKS." level="advanced" >}}


**Answer:**

**Three Pillars of Observability:**

```
┌────────────────────────────────────────────────┐
│              GRAFANA (Unified UI)               │
├───────────────┬────────────────┬────────────────┤
│    METRICS    │     LOGS       │    TRACES      │
│  Prometheus   │ Elasticsearch  │   Jaeger /     │
│  + Thanos     │  (OpenSearch)  │   Tempo        │
│               │  or Loki       │                │
└───────────────┴────────────────┴────────────────┘
         │               │               │
         ▼               ▼               ▼
   Instrumented     Fluentbit       OpenTelemetry
   Applications    DaemonSet          Agent
```

**Implementation:**

```yaml
# OpenTelemetry Collector config
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
    - action: insert
      key: cluster.name
      value: prod-eks-us-east-1

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  otlp/tempo:
    endpoint: tempo:4317
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheus]
```

**SLO/SLA Monitoring:**
```yaml
# Prometheus SLO alert
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum(rate(http_requests_total[5m])) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Error rate above SLO (1%)"
```

**Key Dashboards:**
- **RED Method per service:** Rate, Errors, Duration
- **USE Method per node:** Utilization, Saturation, Errors
- **SLO burn rate dashboards**
- **Cost per service** (from Kubecost)


{{< /qa >}}

{{< qa num="14" q="Your DynamoDB table is experiencing hot partition issues during flash sales. How do you solve this?" level="advanced" >}}


**Answer:**

**Diagnosis:**
```bash
# Check consumed capacity per partition
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=products
```

**Root Cause:** All writes going to same partition key (e.g., `productId=SALE-ITEM-001`).

**Solutions:**

**1. Write Sharding — Add random suffix to partition key:**
```python
import random

def get_partition_key(product_id):
    shard = random.randint(1, 10)
    return f"{product_id}#SHARD{shard}"

# When reading, query all shards and merge
def get_product_data(product_id):
    results = []
    for shard in range(1, 11):
        key = f"{product_id}#SHARD{shard}"
        result = table.get_item(Key={'PK': key})
        results.append(result)
    return merge(results)
```

**2. DAX (DynamoDB Accelerator) for read-heavy workloads:**
```hcl
resource "aws_dax_cluster" "products" {
  cluster_name       = "products-dax"
  node_type          = "dax.r4.large"
  replication_factor = 3
  iam_role_arn       = aws_iam_role.dax.arn
}
```

**3. ElastiCache in front for product catalog (read-heavy):**
- Cache popular product data with TTL = 60 seconds.
- Use write-through pattern for updates.

**4. Use SQS to buffer writes during peak:**
- Writes go to SQS → Lambda consumer → DynamoDB at controlled rate.

**5. Switch to on-demand capacity mode** for unpredictable spikes.


{{< /qa >}}


{{< qa num="15" q="Your production database ran out of storage at 3 AM, causing a complete outage. Walk through the incident response and RCA." level="advanced" >}}


**Answer:**

**Incident Response Timeline:**

**T+0 (Alert fires):** PagerDuty wakes on-call engineer.
```bash
# Immediate - free up space
aws rds modify-db-instance \
  --db-instance-identifier prod-postgres \
  --allocated-storage 500 \
  --apply-immediately
```
*Note: Storage scale-up takes 5-10 minutes and does NOT cause downtime on Multi-AZ.*

**T+5:** Communicate status to stakeholders via status page (Statuspage.io).

**T+10:** Identify root cause.
```bash
# Check what consumed space
SELECT pg_size_pretty(pg_database_size('mydb'));
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;
```

**T+20:** Database storage expanded, application recovery begins.

**T+30:** Full service restored. Incident closed, RCA started.

---

**Root Cause Analysis (5 Whys):**

| Why | Answer |
|-----|--------|
| Why did the DB run out of space? | A table grew from 10GB to 490GB overnight |
| Why did it grow so fast? | A logging table wasn't being truncated |
| Why wasn't it truncated? | The cleanup job failed silently 3 weeks ago |
| Why did it fail silently? | No alerting on cron job failures |
| Why was there no storage alert? | CloudWatch alarm threshold was 95%, not 80% |

**Corrective Actions:**
1. Add CloudWatch alarm at **70% storage** (not 95%).
2. Enable **RDS Storage Auto Scaling** (max 1TB).
3. Add monitoring for failed cron/Lambda jobs.
4. Implement log table rotation with TTL or partitioning.
5. Weekly storage growth review in ops meetings.

{{< /qa >}}

{{< qa num="16" q="How would you design a backup strategy for a critical RDS PostgreSQL database (10TB) with a 4-hour RPO and 2-hour RTO?" level="advanced" >}}


**Answer:**

**Multi-Layer Backup Strategy:**

```
Layer 1: RDS Automated Backups (daily + transaction logs)
  └── RPO: 5 minutes (point-in-time recovery)
  └── RTO: 30-90 minutes (restore new instance)
  └── Retention: 35 days
  └── Storage: S3 (managed by AWS)

Layer 2: Manual Snapshots (pre-deployment)
  └── Triggered by CodePipeline before every prod deploy
  └── Retained for 90 days
  └── Cross-region copy to DR region

Layer 3: pgdump exports (weekly full, daily incremental)
  └── Stored in S3 with versioning
  └── Encrypted with KMS
  └── Lifecycle policy: Glacier after 30 days
```

**Cross-Region Copy Automation:**
```python
import boto3

def copy_snapshot_to_dr(event, context):
    rds = boto3.client('rds', region_name='us-west-2')
    snapshot_arn = event['detail']['SourceArn']
    
    rds.copy_db_snapshot(
        SourceDBSnapshotIdentifier=snapshot_arn,
        TargetDBSnapshotIdentifier=f"cross-region-copy-{snapshot_arn.split(':')[-1]}",
        KmsKeyId='arn:aws:kms:us-west-2:123456789:key/abc123',
        CopyTags=True
    )
```

**RTO Achievement with Pre-Warmed Read Replica:**
- Keep a read replica in the DR region (already has latest data).
- Promotion time: ~2-5 minutes.
- Update application connection string via Route53 or Secrets Manager.
- **Total RTO: ~15-30 minutes** ✅ (well within 2 hours).

**Testing:** Run quarterly restore drills, document actual RTOs, and automate with AWS Fault Injection Simulator (FIS).

{{< /qa >}}

{{< qa num="17" q="A Lambda function is timing out intermittently when processing records from a Kinesis stream. How do you debug and fix this?" level="advanced" >}}


**Answer:**

**Diagnosis:**
```bash
# Check timeout errors in CloudWatch Logs Insights
fields @timestamp, @message
| filter @message like /Task timed out/
| stats count(*) by bin(5m)

# Check iterator age (how far behind is Lambda reading?)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name GetRecords.IteratorAgeMilliseconds \
  --statistics Maximum
```

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Lambda timeout too low | Increase timeout (max 15 min) |
| Cold starts | Enable Provisioned Concurrency for predictable workloads |
| Downstream bottleneck | Check DB/API connections; add circuit breaker |
| Large batch size | Reduce `BatchSize` on event source mapping |
| Memory too low | Increase memory (also increases CPU proportionally) |
| VPC networking | ENI warmup issue; pre-allocate ENIs or use SnapStart |

**Optimal Kinesis → Lambda Configuration:**
```bash
aws lambda update-event-source-mapping \
  --uuid <mapping-id> \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5 \
  --parallelization-factor 10 \
  --bisect-batch-on-function-error \
  --maximum-retry-attempts 3 \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:...dead-letter-queue"}}'
```

**`BisectBatchOnFunctionError`** — Splits the failing batch in half to isolate poison pill records.

**Lambda Power Tuning:**
- Use the [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) tool to find optimal memory/cost configuration.

Migrate a legacy monolith application (Java, on-premise) to AWS with minimal downtime. Design the strategy.

**Answer:**

**Migration Strategy — 6 Rs Assessment:**

For this scenario: **Re-platform** (Lift, Tinker, Shift) → eventual **Re-architect**.

**Phase 1: Discovery & Assessment (Weeks 1-2)**
- Use AWS Application Discovery Service to map dependencies.
- Assess database schema, external integrations, licenses.
- Set up AWS Direct Connect or VPN to on-prem.

**Phase 2: Foundation (Weeks 3-6)**
- Set up Landing Zone (Control Tower).
- Network: VPC, subnets, Direct Connect, Transit Gateway.
- Security baseline: GuardDuty, Security Hub, Config.

**Phase 3: Migration (Weeks 7-16)**
```
On-Prem                    AWS
────────                   ────
Oracle DB ──────────────►  RDS Oracle → Aurora (Schema Conversion Tool)
App Server ─────────────►  EC2 (same config, re-platform to ECS later)
File Server ────────────►  EFS / S3
Active Directory ────────► AWS Managed AD (via trust relationship)
```

**Database Migration with Minimal Downtime:**
```
Step 1: Full load with AWS DMS (continuous replication on)
Step 2: Verify data consistency with AWS SCT validation
Step 3: Application cutover:
  a. Stop writes to on-prem (maintenance window: 30 min)
  b. Wait for DMS to catch up (lag = 0)
  c. Update DNS / connection strings
  d. Resume writes to AWS RDS
  e. Monitor for 1 hour
  f. Decommission on-prem DB
```

**Phase 4: Optimize (Months 4-6)**
- Rightsize EC2 instances using Compute Optimizer.
- Break out stateless services to ECS/Lambda.
- Replace Oracle → Aurora PostgreSQL (major cost saving).

{{< /qa >}}


{{< qa num="18" q="How would you implement AWS Control Tower for a 20-account organization, ensuring governance and developer agility?" level="advanced" >}}


**Answer:**

**Control Tower Setup:**

```
Management Account
└── AWS Control Tower
    ├── Log Archive Account (auto-created)
    ├── Audit Account (auto-created)
    └── OUs:
        ├── Security OU (SCPs: deny root access, deny non-compliant regions)
        ├── Infrastructure OU (networking, shared services)
        ├── Workloads OU
        │   ├── Prod OU (strict SCPs)
        │   └── Non-Prod OU (relaxed SCPs)
        └── Sandbox OU (open, time-limited)
```

**Account Vending Machine (Account Factory):**
```python
# Account Factory for Terraform (AFT)
# accounts/my-new-app/account-request.tf
module "account_request" {
  source = "github.com/aws-ia/terraform-aws-control_tower_account_factory//modules/aft-account-request"
  
  control_tower_parameters = {
    AccountEmail              = "team-app@company.com"
    AccountName               = "prod-app-payments"
    ManagedOrganizationalUnit = "Workloads/Prod"
    SSOUserEmail              = "admin@company.com"
  }
  
  custom_fields = {
    team       = "payments"
    cost-center = "CC-1234"
  }
}
```

**Guardrails (SCPs) Strategy:**
| Guardrail | Scope | Type |
|-----------|-------|------|
| Deny root account usage | All OUs | Preventive |
| Require MFA for IAM users | All OUs | Preventive |
| Deny disabling CloudTrail | All OUs | Preventive |
| Deny non-compliant regions | Prod OU | Preventive |
| Require encryption on EBS | All OUs | Detective |
| Detect unrestricted SSH | All OUs | Detective |

**Developer Agility:**
- Self-service sandbox accounts (auto-expire in 30 days).
- Pre-approved service catalog products for common patterns (ECS app, RDS, etc.).
- Developer SSO with appropriate permissions per environment.


{{< /qa >}}

---

## 💡 Bonus: Common Behavioral Questions for Senior DevOps

> These often accompany technical scenarios at FAANG-level interviews.

- **"Tell me about a time you reduced infrastructure costs significantly."** → Prepare a STAR story with actual % savings.
- **"Describe the most complex incident you handled."** → Focus on your decision-making and communication.
- **"How do you balance development speed with operational stability?"** → SRE concepts, error budgets, SLOs.
- **"How do you mentor junior engineers on DevOps practices?"** → Show leadership and knowledge transfer.
- **"Walk me through how you'd introduce observability to a team that has none."** → Prioritization, quick wins, long-term vision.


## 📚 Resources for Preparation

| Resource | Link |
|----------|------|
| AWS Well-Architected Framework | https://aws.amazon.com/architecture/well-architected/ |
| AWS Solutions Library | https://aws.amazon.com/solutions/ |
| AWS Skill Builder | https://skillbuilder.aws |
| The Phoenix Project (Book) | DevOps culture & practices |
| Site Reliability Engineering (Book) | Google SRE principles |
| A Cloud Guru / Pluralsight | Hands-on labs |
| KodeKloud | Kubernetes & DevOps scenarios |
| TechWorld with Nana (YouTube) | DevOps concepts |


## 🏆 Key Principles Examiners Look For

1. **Think aloud** — Senior DevOps engineers explain their reasoning, not just the answer.
2. **Trade-offs** — Always mention cost, complexity, and operational overhead.
3. **Failure modes** — Discuss what happens when components fail.
4. **Observability first** — Every design should include monitoring and alerting.
5. **Security by default** — Never bolt on security; build it in.
6. **Automation mindset** — If you do it twice, automate it.
7. **Cost awareness** — Know the cost implications of every architectural decision.



> ⭐ If this helped you, consider sharing it with your network!

</div>