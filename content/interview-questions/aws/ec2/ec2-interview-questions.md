---
title: "AWS EC2 Basic Interview Questions & Answers (2026)"
description: "50+ AWS EC2 interview questions covering instance types, Auto Scaling, AMIs, pricing models, networking, storage, and troubleshooting — Basic to Advanced."
date: 2025-01-20
author: "DB"
tags: ["aws", "ec2", "interview", "certification"]
tool: "aws"
level: "All Levels"
question_count: 50
---

<div class="qa-list">

{{< qa num="1" q="What is Amazon EC2 and what problems does it solve?" level="basic" >}}
**Amazon EC2 (Elastic Compute Cloud)** provides resizable virtual servers in the AWS cloud.

**Problems it solves:**
- Eliminates upfront hardware investment (CapEx → OpEx)
- Scales compute capacity in minutes, not months
- Pay-as-you-go — no cost for idle capacity
- Global availability across 30+ AWS Regions
- Managed hypervisor, physical security, and networking

**Key capabilities:** Choose OS, instance type, storage, networking, and have root access.
{{< /qa >}}

{{< qa num="2" q="Explain On-Demand, Reserved, Spot, and Savings Plans pricing." level="basic" >}}
| Pricing Model | Savings | Commitment | Best For |
|--------------|---------|------------|----------|
| **On-Demand** | 0% (baseline) | None | Unpredictable loads, dev/test |
| **Reserved (1yr)** | ~40% | 1 year | Steady-state production workloads |
| **Reserved (3yr)** | ~60% | 3 years | Long-term stable workloads |
| **Spot** | 70–90% | None (interruptible) | Batch jobs, stateless apps |
| **Savings Plans** | ~66% | 1–3 year $/hr commit | Flexible — covers EC2 + Lambda |

**Strategy:** Run baseline on Savings Plans, burst with Spot, ad-hoc with On-Demand.
{{< /qa >}}

{{< qa num="3" q="What is an AMI and what does it contain?" level="basic" >}}
An **Amazon Machine Image (AMI)** is the template used to launch EC2 instances.

**Contents:**
- Root volume snapshot (OS + pre-installed software)
- Launch permissions (public, private, or shared with specific accounts)
- Block device mapping (which EBS volumes to attach + sizes)

**AMI types:**
- **EBS-backed** (default) — root on EBS, persists when stopped
- **Instance store-backed** — ephemeral root, lost on stop/terminate

**Create custom AMI:**
```bash
aws ec2 create-image \
  --instance-id i-0abc123 \
  --name "WebApp-$(date +%Y%m%d)" \
  --no-reboot
```
{{< /qa >}}

{{< qa num="4" q="What is the difference between stopping and terminating an EC2 instance?" level="basic" >}}
| Action | EBS Root | Instance Store | Public IP | Billing |
|--------|----------|---------------|-----------|---------|
| **Stop** | Preserved | **Lost** | Released | No compute charge (EBS billed) |
| **Terminate** | **Deleted** (unless DeleteOnTermination=false) | Lost | Released | All charges stop |
| **Hibernate** | Preserved + RAM snapshot | N/A | Released | No compute charge |

**Key points:**
- Stopped instances can be restarted — they may land on a **different physical host**
- Use `--disable-api-termination` to protect critical instances
- Hibernate preserves in-memory state (RAM to EBS) for fast resume
{{< /qa >}}

{{< qa num="5" q="What is a Security Group and how does it work?" level="basic" >}}
A **Security Group** is a virtual stateful firewall that controls inbound and outbound traffic for EC2 instances.

**Key characteristics:**
- **Stateful** — if you allow inbound traffic, the response is automatically allowed
- Rules are **allow-only** — you cannot create deny rules
- Applied at the **instance/ENI level**
- Multiple security groups can be attached to one instance

**Example — allow SSH and HTTP:**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 22 --cidr 203.0.113.0/32

aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
```
{{< /qa >}}

{{< qa num="6" q="What is an Elastic IP and when should you use it?" level="basic" >}}
An **Elastic IP (EIP)** is a static, public IPv4 address you can associate with any EC2 instance or NAT Gateway.

**When to use:**
- You need a **fixed public IP** that survives instance stop/start
- Failover — quickly remap to a standby instance
- Whitelisting by partners or firewalls that require a known IP

**Important billing note:**
> AWS charges for EIPs that are **allocated but not associated** with a running instance (~$0.005/hr).

```bash
# Allocate
aws ec2 allocate-address --domain vpc

# Associate
aws ec2 associate-address \
  --instance-id i-0abc123 \
  --allocation-id eipalloc-0abc123
```

**Best practice:** Use EIP only when required. For most web apps, use a Load Balancer DNS name instead.
{{< /qa >}}

{{< qa num="7" q="What are EC2 instance types and families?" level="basic" >}}
EC2 instances are grouped into **families** optimised for specific workloads:

| Family | Optimised For | Examples |
|--------|--------------|---------|
| **General Purpose** | Balanced CPU/memory/network | t3, t4g, m6i, m7g |
| **Compute Optimised** | High-performance processors | c6i, c7g, c7n |
| **Memory Optimised** | Large in-memory datasets | r6i, r7g, x2idn |
| **Storage Optimised** | High sequential I/O, NVMe | i3, i4i, d3 |
| **Accelerated Computing** | GPU/FPGA/ML inference | p4, g5, trn1, inf2 |
| **HPC Optimised** | Tightly coupled HPC | hpc6a, hpc7g |

**Naming convention:** `m7g.2xlarge`
- `m` = family (general purpose)
- `7` = generation
- `g` = processor (Graviton)
- `2xlarge` = size
{{< /qa >}}

{{< qa num="8" q="What is EC2 User Data and how is it used?" level="basic" >}}
**User Data** is a script that runs **once automatically at instance first launch** via cloud-init.

**Use cases:**
- Install packages and dependencies
- Pull application code from S3 or Git
- Configure system settings
- Register with a load balancer or service mesh

**Example — Bootstrap a web server:**
```bash
#!/bin/bash
yum update -y
yum install -y httpd
echo "<h1>Hello from $(hostname -f)</h1>" > /var/www/html/index.html
systemctl enable --now httpd
```

**View logs:**
```bash
cat /var/log/cloud-init-output.log
```

**Note:** User Data runs as **root**. It is limited to **16 KB**. For larger scripts, store in S3 and download via User Data.
{{< /qa >}}

{{< qa num="9" q="What is EC2 Instance Metadata and how do you access it?" level="basic" >}}
**Instance Metadata** is data about your running instance accessible from within the instance at a link-local IP address.

**Available data includes:** instance ID, AMI ID, IAM role credentials, hostname, public IP, AZ, and more.

**Access via IMDSv2 (recommended):**
```bash
# Step 1: Get session token
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Step 2: Query metadata
curl -sH "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id

curl -sH "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

**IMDSv2 vs IMDSv1:**
| | IMDSv1 | IMDSv2 |
|--|--------|--------|
| Auth | None | Session token required |
| SSRF protection | No | Yes |
| AWS recommendation | Disable | Use always |
{{< /qa >}}

{{< qa num="10" q="What is a Key Pair and how is it used for EC2 access?" level="basic" >}}
A **Key Pair** consists of a public key (held by AWS) and a private key (held by you), used for passwordless SSH authentication.

**How it works:**
1. Create a key pair — AWS stores the public key
2. Specify it when launching an instance
3. AWS places the public key in `~/.ssh/authorized_keys` on the instance
4. You authenticate using the `.pem` private key

**SSH access:**
```bash
chmod 400 my-key.pem
ssh -i my-key.pem ec2-user@<public-ip>   # Amazon Linux
ssh -i my-key.pem ubuntu@<public-ip>     # Ubuntu
ssh -i my-key.pem centos@<public-ip>     # CentOS
```

> If you lose your private key, AWS **cannot** recover it. Use **EC2 Instance Connect** or **SSM Session Manager** as alternatives.
{{< /qa >}}

{{< qa num="11" q="What is the difference between a Public, Private, and Elastic IP in EC2?" level="basic" >}}
| IP Type | Assigned By | Persists After Stop? | Publicly Routable? |
|---------|-------------|---------------------|-------------------|
| **Public IP** | AWS (auto) | No — changes on restart | Yes |
| **Private IP** | VPC CIDR | Yes | No (RFC 1918) |
| **Elastic IP** | AWS (manual) | Yes | Yes |

**Private IP** — always present, used for internal VPC communication.
**Public IP** — auto-assigned in public subnets, ephemeral.
**Elastic IP** — static public IP, manually attached; incurs cost when unassociated.
{{< /qa >}}

{{< qa num="12" q="What is EC2 Hibernate and when would you use it?" level="basic" >}}
**EC2 Hibernate** suspends an instance and saves its **RAM contents** to the encrypted EBS root volume.

**Stop vs Hibernate:**
| | Stop | Hibernate |
|--|------|-----------|
| RAM preserved | No | Yes |
| Resume time | Full boot | Seconds |
| EBS required | Yes | Yes (encrypted) |

**Use cases:**
- Long-running in-memory computations you want to pause
- Applications with slow startup or warm-up time
- Dev environments — resume exactly where you left off

**Requirements:**
- Root EBS volume must be **encrypted**
- RAM size must be **≤ 150 GB**
- Supported instance families: C3, C4, C5, M3, M4, M5, R3, R4, R5, T2, T3
- Not supported on bare metal instances
{{< /qa >}}

{{< qa num="1" q="How does Auto Scaling work? Explain the different scaling policies." level="intermediate" >}}
**Auto Scaling Group (ASG)** automatically adjusts instance count based on demand.

**Key components:**
- **Launch Template** — defines what to launch (AMI, type, SG, user data)
- **ASG** — min/max/desired capacity, health check config
- **Scaling Policy** — when and how much to scale

**Policy Types:**

**1. Target Tracking** (recommended for most workloads)
```
Goal: Keep average CPU utilization at 60%
AWS adds/removes instances automatically to maintain the target.
```

**2. Step Scaling** (fine-grained control)
```
CPU 70–85%  → add 2 instances
CPU 85–100% → add 4 instances
CPU < 30% (10 min) → remove 1 instance
```

**3. Scheduled Scaling**
```bash
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name prod-asg \
  --scheduled-action-name morning-scale-up \
  --recurrence "0 8 * * MON-FRI" \
  --desired-capacity 10
```

**4. Predictive Scaling** — ML-based, forecasts 24h ahead and scales proactively.
{{< /qa >}}

{{< qa num="2" q="What is the difference between a Security Group and a Network ACL?" level="intermediate" >}}
| Feature | Security Group | Network ACL |
|---------|---------------|-------------|
| **Applied at** | Instance/ENI level | Subnet level |
| **Stateful?** | Yes — return traffic auto-allowed | No — must allow both directions |
| **Rule types** | Allow only | Allow and Deny |
| **Rule evaluation** | All rules evaluated | Numbered rules, lowest first |
| **Default inbound** | Deny all | Allow all (default VPC NACL) |
| **Default outbound** | Allow all | Allow all |

**When to use NACLs:** Block specific IPs/CIDRs at subnet level (e.g., known bad actors). Use SGs for normal per-app access control.

**Best practice:** SGs as primary control, NACLs as supplementary subnet-level guardrails.
{{< /qa >}}

{{< qa num="3" q="What are EC2 Placement Groups?" level="intermediate" >}}
Placement groups control **physical placement** of instances on AWS infrastructure.

**Cluster** — all in same AZ, same rack
- Ultra-low latency, 25 Gbps enhanced networking
- Risk: single rack failure affects all instances
- Use: HPC, tightly-coupled distributed systems

**Spread** — each instance on different hardware
- Max 7 per AZ per group
- Use: critical instances (ZooKeeper, master nodes)

**Partition** — logical partitions, each on separate rack
- Up to 7 partitions per AZ, hundreds of instances
- Use: Hadoop, Cassandra, HDFS

```bash
aws ec2 create-placement-group \
  --group-name hpc-cluster \
  --strategy cluster
```
{{< /qa >}}

{{< qa num="4" q="What is the difference between EBS and Instance Store?" level="intermediate" >}}
| Feature | EBS (Elastic Block Store) | Instance Store |
|---------|--------------------------|----------------|
| **Persistence** | Survives stop/start | Ephemeral — lost on stop/terminate |
| **Performance** | Up to 256,000 IOPS (io2) | Very high NVMe SSD |
| **Snapshots** | S3 snapshots supported | Manual copy needed |
| **Cost** | Billed separately per GB | Included in instance price |
| **Use case** | OS, databases, persistent data | Cache, buffers, temp scratch space |
| **Detachable** | Yes | No |

**When to use Instance Store:** Applications that replicate data across nodes (Redis cluster, Kafka, Cassandra) where speed matters and data loss is tolerable.
{{< /qa >}}

{{< qa num="5" q="What are the EBS volume types and when do you use each?" level="intermediate" >}}
| Volume Type | Category | Max IOPS | Max Throughput | Use Case |
|-------------|----------|----------|----------------|---------|
| **gp3** | SSD | 16,000 | 1,000 MB/s | General purpose, boot volumes (default) |
| **gp2** | SSD | 16,000 | 250 MB/s | Legacy general purpose |
| **io2 Block Express** | SSD | 256,000 | 4,000 MB/s | Mission-critical databases (Oracle, SAP) |
| **io1** | SSD | 64,000 | 1,000 MB/s | I/O-intensive databases |
| **st1** | HDD | 500 | 500 MB/s | Big data, data warehouses, log processing |
| **sc1** | HDD | 250 | 250 MB/s | Cold data, infrequent access |

**gp3 vs gp2:** gp3 is cheaper and allows independent IOPS/throughput configuration. Always prefer gp3 for new volumes.
{{< /qa >}}

{{< qa num="6" q="What is an IAM Role for EC2 and why is it better than storing access keys?" level="intermediate" >}}
An **IAM Role** attached to an EC2 instance grants the instance permissions to call AWS APIs **without storing any credentials** on disk.

**Why better than access keys:**
- No static credentials to rotate or accidentally leak
- Temporary credentials are automatically rotated every few hours
- Credentials delivered via IMDS — not stored in files
- Easy to audit permissions via CloudTrail

**How it works:**
```
EC2 Instance → assumes IAM Role → gets temp credentials via IMDS
Application → reads credentials from SDK default credential chain
SDK → calls AWS API using those credentials
```

**Attach a role via CLI:**
```bash
aws ec2 associate-iam-instance-profile \
  --instance-id i-0abc123 \
  --iam-instance-profile Name=MyEC2Role
```

> Never store `aws_access_key_id` in `.env` or config files on an EC2 instance.
{{< /qa >}}

{{< qa num="7" q="What is an EC2 Launch Template and how does it differ from a Launch Configuration?" level="intermediate" >}}
| Feature | Launch Template | Launch Configuration |
|---------|----------------|---------------------|
| **Versioning** | Multiple versions supported | Immutable |
| **Spot + On-Demand mix** | Supported | Not supported |
| **EC2 Fleet support** | Yes | No |
| **Parameter inheritance** | Can inherit from base template | No |
| **AWS recommendation** | Preferred | Deprecated |

**Create a Launch Template:**
```bash
aws ec2 create-launch-template \
  --launch-template-name "prod-web" \
  --version-description "v1" \
  --launch-template-data '{
    "ImageId": "ami-0abc123",
    "InstanceType": "m6i.large",
    "KeyName": "my-key",
    "SecurityGroupIds": ["sg-0abc123"],
    "UserData": "BASE64_ENCODED_SCRIPT"
  }'
```
{{< /qa >}}

{{< qa num="8" q="What are EC2 Spot Instances and how do you handle interruptions?" level="intermediate" >}}
**Spot Instances** use spare AWS capacity at up to **90% discount**. AWS can reclaim them with a **2-minute warning**.

**Interruption handling best practices:**
- Poll for termination notice every 5 seconds:
```bash
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 30")
curl -sH "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/spot/termination-time
```
- Use **EventBridge + Lambda** to drain ELB targets before interruption
- Enable **checkpointing** to save progress to S3 or EFS
- Use **Spot Fleet** with `capacity-optimized` strategy across multiple instance types and AZs
- Mix Spot with On-Demand for baseline capacity

**Best workloads for Spot:** CI/CD workers, batch processing, ML training, rendering, big data.
{{< /qa >}}

{{< qa num="9" q="What is EC2 Auto Scaling warm-up and cooldown?" level="intermediate" >}}
**Cooldown Period** — after a scaling activity, ASG waits before triggering another scaling action. Prevents thrashing.
- Default: **300 seconds**
- Apply shorter cooldowns for scale-out, longer for scale-in

**Instance Warm-Up** — time allowed for a new instance to start contributing metrics before being counted in scaling decisions.
- Used with Target Tracking and Step Scaling
- Prevents new (not-yet-ready) instances from triggering premature scale-out

**Lifecycle Hooks** — pause instance transitions to run custom actions:
```
Launching   → Pending:Wait → [run bootstrap] → Pending:Proceed   → InService
Terminating → Terminating:Wait → [drain]     → Terminating:Proceed → Terminated
```

```bash
aws autoscaling put-lifecycle-hook \
  --lifecycle-hook-name "install-agent" \
  --auto-scaling-group-name prod-asg \
  --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
  --heartbeat-timeout 300
```
{{< /qa >}}

{{< qa num="10" q="What is Elastic Load Balancing and what are the types?" level="intermediate" >}}
**ELB** distributes incoming traffic across multiple EC2 instances, containers, or Lambda functions.

| Type | Layer | Protocol | Key Feature |
|------|-------|----------|------------|
| **ALB** | 7 (Application) | HTTP/HTTPS/gRPC | Path/host-based routing, WebSocket |
| **NLB** | 4 (Network) | TCP/UDP/TLS | Ultra-low latency, static IP, millions of RPS |
| **GWLB** | 3 (Gateway) | IP | Inline network appliances (firewall, IDS) |
| **CLB** | 4 and 7 | HTTP/TCP | Legacy — avoid for new deployments |

**ALB routing rules example:**
```
/api/*              → Target Group: API servers
/images/*           → Target Group: Static servers
Host: admin.example.com → Target Group: Admin servers
```

**Best practice:** Use **ALB** for web apps and microservices, **NLB** for TCP/UDP services needing extreme performance or fixed IPs.
{{< /qa >}}

{{< qa num="11" q="What is the EC2 Nitro System?" level="intermediate" >}}
The **AWS Nitro System** is the underlying hypervisor platform for all modern EC2 instances. It offloads virtualisation functions to dedicated Nitro hardware.

**Components:**
- **Nitro Cards** — dedicated hardware for VPC networking and EBS I/O
- **Nitro Security Chip** — hardware root of trust, cryptographic attestation
- **Nitro Hypervisor** — lightweight, minimal attack surface

**Advantages over Xen:**
- Near **bare-metal performance** (less than 2% virtualisation overhead)
- Higher network bandwidth (up to 400 Gbps with EFA)
- Hardware-enforced security isolation
- Enables **Bare Metal instances** (i3.metal, m5.metal, etc.)
- Foundation for **Nitro Enclaves** (isolated secure compute)

All instances from 5th generation onwards (m5, c5, r5, etc.) run on Nitro.
{{< /qa >}}

{{< qa num="12" q="How do you take EBS Snapshots and what are best practices?" level="intermediate" >}}
**EBS Snapshots** are incremental backups stored in S3 (managed by AWS, not visible in your S3 console).

**Create a snapshot:**
```bash
aws ec2 create-snapshot \
  --volume-id vol-0abc123 \
  --description "Daily backup $(date +%Y-%m-%d)"
```

**Best practices:**
- Use **Amazon Data Lifecycle Manager (DLM)** to automate snapshot schedules and retention
- Take snapshots during low I/O periods to reduce performance impact
- Enable **EBS Snapshot Archive** to move cold snapshots to cheaper storage (75% cost saving)
- Copy snapshots cross-region for disaster recovery

**Restore from snapshot:**
```bash
aws ec2 create-volume \
  --snapshot-id snap-0abc123 \
  --availability-zone us-east-1a \
  --encrypted
```
{{< /qa >}}

{{< qa num="13" q="What is Enhanced Networking and when should you enable it?" level="intermediate" >}}
**Enhanced Networking** uses **SR-IOV** (Single Root I/O Virtualisation) to provide higher bandwidth, higher packet-per-second rates, and lower latency — at no extra cost.

| Technology | Max Bandwidth | Use Case |
|-----------|--------------|---------|
| **ENA** (Elastic Network Adapter) | 100 Gbps | All modern instances (5th gen+) |
| **EFA** (Elastic Fabric Adapter) | 400 Gbps | HPC, MPI, ML distributed training |
| **Intel 82599 VF** | 10 Gbps | Older instance families (c3, i2) |

**Check ENA support:**
```bash
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].EnaSupport'

# Enable on a stopped instance
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --ena-support
```

**Use EFA for:** Tightly-coupled MPI workloads and distributed deep learning (PyTorch DDP, Megatron-LM).
{{< /qa >}}

{{< qa num="1" q="How do you troubleshoot an EC2 instance that fails status checks?" level="advanced" >}}
**Two types of status checks:**

**System Status Check** = AWS infrastructure problem (hardware/hypervisor)
```bash
# Fix: Stop then Start (moves to new physical host)
aws ec2 stop-instances --instance-ids i-xxx
aws ec2 start-instances --instance-ids i-xxx
```

**Instance Status Check** = OS/software problem
```bash
# Step 1: Get console output
aws ec2 get-console-output --instance-id i-xxx --output text

# Step 2: Get screenshot
aws ec2 get-console-screenshot --instance-id i-xxx
```

**Common causes and fixes:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| `0/2 system checks` | Hardware failure | Stop/Start instance |
| `1/2 checks (instance)` | Kernel panic / OOM | Check console output |
| SSH timeout | SG missing port 22 | Add port 22 inbound rule |
| SSH auth failure | Wrong key or username | Use `ec2-user` (AL2), `ubuntu` (Ubuntu) |
| Full disk | `/` or `/var` full | Extend EBS, clean up logs |

**Debug without SSH:**
```bash
aws ssm start-session --target i-xxx
```
{{< /qa >}}

{{< qa num="2" q="How do you design a highly available EC2 architecture?" level="advanced" >}}
**Core HA principles:** Eliminate single points of failure, deploy across multiple AZs.

**Reference architecture:**
```
Route 53 (latency/failover routing)
        |
  CloudFront (CDN + WAF)
        |
Application Load Balancer (multi-AZ)
      /             \
AZ-1 (us-east-1a)   AZ-2 (us-east-1b)
Auto Scaling Group   Auto Scaling Group
  EC2 x 2             EC2 x 2
        \               /
   Multi-AZ RDS (synchronous replication)
   ElastiCache (Multi-AZ with replication)
```

**Checklist:**
- Min 2 AZs for all compute and data tiers
- ASG with health checks replacing unhealthy instances automatically
- ALB health checks draining targets gracefully before replacement
- Multi-AZ RDS with automated failover
- S3 for static assets (11 nines durability)
- CloudWatch alarms and SNS for incident notification
- Route 53 health checks for DNS-level failover
{{< /qa >}}

{{< qa num="3" q="What is EC2 Fleet and how does it differ from Spot Fleet?" level="advanced" >}}
| Feature | EC2 Fleet | Spot Fleet |
|---------|-----------|-----------|
| **Purchase types** | On-Demand + Spot + Reserved | Primarily Spot |
| **Target unit types** | vCPUs, Memory, Units | Instances, Spot units |
| **API** | `create-fleet` | `request-spot-fleet` |
| **AWS recommendation** | Yes (preferred) | Older API |

**EC2 Fleet config example:**
```json
{
  "TargetCapacitySpecification": {
    "TotalTargetCapacity": 100,
    "OnDemandTargetCapacity": 20,
    "SpotTargetCapacity": 80
  },
  "SpotOptions": {
    "AllocationStrategy": "capacity-optimized"
  },
  "LaunchTemplateConfigs": [{
    "LaunchTemplateSpecification": {
      "LaunchTemplateId": "lt-xxx",
      "Version": "1"
    },
    "Overrides": [
      { "InstanceType": "m5.xlarge", "WeightedCapacity": 4 },
      { "InstanceType": "m5a.xlarge", "WeightedCapacity": 4 },
      { "InstanceType": "m6i.xlarge", "WeightedCapacity": 4 }
    ]
  }]
}
```

**Spot allocation strategies:**
- `capacity-optimized` — reduces interruption risk (recommended)
- `price-capacity-optimized` — balance of price and availability
- `lowest-price` — cheapest pool (higher interruption risk)
{{< /qa >}}

{{< qa num="4" q="How do you optimise EC2 costs at scale?" level="advanced" >}}
**Multi-layer cost optimisation strategy:**

**1. Right-Sizing with Compute Optimizer:**
```bash
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=Overprovisioned
```

**2. Purchase option mix:**
```
70% Compute Savings Plans (baseline, 3-year)
20% Spot Instances (flexible workloads)
10% On-Demand (true burst / unpredictable)
```

**3. Graviton migration (up to 40% price/performance improvement):**
```bash
aws ec2 modify-instance-attribute \
  --instance-id i-xxx \
  --instance-type "{\"Value\": \"m7g.large\"}"
```

**4. Scheduling non-production instances:**
- Use **AWS Instance Scheduler** to stop dev/test instances nights and weekends
- Typical saving: ~65% on non-prod compute

**5. Storage cleanup:**
```bash
# Find unattached EBS volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].{ID:VolumeId,Size:Size}'
```
{{< /qa >}}

{{< qa num="5" q="What are EC2 Capacity Reservations and how do they differ from Reserved Instances?" level="advanced" >}}
| Feature | Capacity Reservation | Reserved Instance |
|---------|---------------------|-------------------|
| **Purpose** | Guarantees capacity in an AZ | Billing discount |
| **Commitment** | None — cancel anytime | 1 or 3 years |
| **Billing when unused** | Charged at On-Demand rate | Charged regardless |
| **Capacity guarantee** | Yes | No |
| **Discount** | None | Up to 72% |

**Best practice — combine both:**
```
Capacity Reservation → guarantees physical capacity exists in AZ
+
Reserved Instance / Savings Plan → applies billing discount
= Guaranteed capacity at discounted price
```

```bash
aws ec2 create-capacity-reservation \
  --instance-type m6i.large \
  --instance-platform Linux/UNIX \
  --availability-zone us-east-1a \
  --instance-count 10 \
  --instance-match-criteria targeted
```
{{< /qa >}}

{{< qa num="6" q="What is AWS Nitro Enclaves and when would you use it?" level="advanced" >}}
**Nitro Enclaves** are isolated, hardened virtual machines within an EC2 instance for processing **highly sensitive data**.

**Key properties:**
- No persistent storage, no external networking, no interactive access
- Communicates with parent instance only via **vsock**
- Cryptographically attested using **AWS KMS**
- Memory and CPU fully isolated from parent instance and AWS operators

**Use cases:**
- Processing PII/PHI (HIPAA, PCI-DSS workloads)
- Secure cryptographic key operations
- ML inference on confidential data (medical images, financial records)
- Digital rights management (DRM)

```bash
# Enable Nitro Enclaves on instance
aws ec2 modify-instance-attribute \
  --instance-id i-xxx \
  --enclave-options 'Enabled=true'

# Build and run enclave image
nitro-cli build-enclave \
  --docker-uri myapp:latest \
  --output-file myapp.eif

nitro-cli run-enclave \
  --eif-path myapp.eif \
  --memory 2048 \
  --cpu-count 2 \
  --enclave-cid 16
```
{{< /qa >}}

{{< qa num="7" q="How does EC2 Auto Scaling integrate with ELB health checks?" level="advanced" >}}
ASG supports two types of health checks:

| Health Check Type | What it checks | When to use |
|-------------------|---------------|-------------|
| **EC2 (default)** | Instance reachability only | Basic setups |
| **ELB** | Application-level health (HTTP 200) | Production — more accurate |

**Enable ELB health checks on ASG:**
```bash
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name prod-asg \
  --health-check-type ELB \
  --health-check-grace-period 300
```

**Flow when an instance fails ELB health check:**
```
1. ALB marks target unhealthy
2. ALB stops sending new requests to that instance
3. In-flight requests complete (connection draining)
4. ASG detects unhealthy instance and terminates it
5. ASG launches replacement instance in same or different AZ
6. New instance registers with ALB, passes health check, receives traffic
```

**Grace period** = time ASG waits before starting health checks on a new instance. Set slightly longer than your application startup time.
{{< /qa >}}

{{< qa num="8" q="What is EC2 Image Builder and how does it automate AMI management?" level="advanced" >}}
**EC2 Image Builder** automates the creation, testing, patching, and distribution of AMIs on a schedule.

**Pipeline stages:**
```
Base Image (source AMI or OS)
      |
Build Components (AWSTOE documents)
  - Install packages
  - Harden OS (CIS benchmarks)
  - Install agents (SSM, CloudWatch)
      |
Test Components
  - Boot test
  - Custom validation scripts
      |
Distribution
  - Copy AMI to multiple regions
  - Share with member accounts
  - Update Launch Templates
```

**Benefits:**
- Automated patch management — always start from a patched base
- Centralised golden AMI governance
- Integrated with AWS Organizations for multi-account distribution
- Built-in CIS hardening components available

```bash
aws imagebuilder start-image-pipeline-execution \
  --image-pipeline-arn arn:aws:imagebuilder:us-east-1:123:image-pipeline/my-pipeline
```
{{< /qa >}}

{{< qa num="9" q="How do you securely connect to EC2 instances without exposing SSH to the internet?" level="advanced" >}}
**Three secure access patterns — no inbound port 22 required:**

**1. AWS Systems Manager Session Manager (recommended):**
```bash
# No SG inbound rules needed, no key pair, full audit trail in CloudTrail
aws ssm start-session --target i-0abc123

# Port forwarding via SSM
aws ssm start-session \
  --target i-0abc123 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3306"],"localPortNumber":["3306"]}'
```

**2. EC2 Instance Connect:**
```bash
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-0abc123 \
  --instance-os-user ec2-user \
  --ssh-public-key file://temp-key.pub

ssh -i temp-key.pem ec2-user@<ip>
```
The temporary key is valid for **60 seconds** only.

**3. Bastion Host (jump box) in public subnet:**
```bash
ssh -J ec2-user@<bastion-ip> ec2-user@<private-ip>
```

**Security comparison:**
| Method | Key Pair | Inbound Rule | Audit Trail |
|--------|---------|-------------|------------|
| SSM Session Manager | Not needed | Not needed | CloudTrail |
| EC2 Instance Connect | Temporary | Port 22 required | CloudTrail |
| Bastion Host | Required | Port 22 required | Partial |
{{< /qa >}}

{{< qa num="10" q="What is the difference between vertical and horizontal scaling in EC2?" level="intermediate" >}}
| Aspect | Vertical Scaling (Scale Up) | Horizontal Scaling (Scale Out) |
|--------|-----------------------------|-----------------------------|
| **Method** | Increase instance size | Add more instances |
| **Downtime** | Required (stop/start) | None with ASG |
| **Limit** | Hardware ceiling (largest instance) | Virtually unlimited |
| **High Availability** | Single point of failure | Multi-AZ resilient |
| **App changes needed** | None | App must be stateless/distributed |

**Vertical scale (resize instance):**
```bash
aws ec2 stop-instances --instance-ids i-xxx
aws ec2 modify-instance-attribute \
  --instance-id i-xxx \
  --instance-type "{\"Value\": \"m6i.4xlarge\"}"
aws ec2 start-instances --instance-ids i-xxx
```

**AWS recommendation:** Prefer **horizontal scaling** for resilience. Use vertical scaling only for stateful workloads (e.g., single-node databases) that cannot be distributed.
{{< /qa >}}

{{< qa num="11" q="How does EC2 burstable performance work (T-series instances)?" level="intermediate" >}}
**T-series instances** (t3, t3a, t4g) earn **CPU credits** when idle and spend them during bursts.

**Credit mechanics:**
- Each vCPU earns credits at a fixed rate when CPU usage is below baseline
- 1 CPU credit = 1 vCPU at 100% for 1 minute
- Credits accumulate up to a maximum balance (varies by instance size)

| Instance | Baseline CPU | Credits Earned/hr | Max Credits |
|----------|-------------|-------------------|-------------|
| t3.micro | 10% | 6 | 144 |
| t3.medium | 20% | 24 | 576 |
| t3.large | 30% | 36 | 864 |

**Standard vs Unlimited mode:**
- **Standard** — instance throttled when credits exhausted
- **Unlimited** — bursts beyond credit balance at extra cost ($0.05/vCPU-hr)

```bash
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name prod-asg \
  --health-check-type ELB
```

**Monitor credit balance:**
```
CloudWatch metric: CPUCreditBalance
Alert when < 20 credits to prevent throttling
```
{{< /qa >}}

{{< qa num="12" q="What are EC2 instance lifecycle states?" level="basic" >}}
An EC2 instance transitions through several states:

```
pending → running → stopping → stopped
                  → shutting-down → terminated
                  → hibernating → stopped (hibernated)
```

| State | Description | Billed? |
|-------|-------------|---------|
| **pending** | Instance booting, resources provisioning | No |
| **running** | Normal operation | Yes |
| **stopping** | Graceful shutdown in progress | No |
| **stopped** | Powered off, EBS retained | EBS only |
| **shutting-down** | Termination in progress | No |
| **terminated** | Deleted | No |

**Key rule:** You are billed only in the **running** state (per second, minimum 60 seconds).

**Protect from accidental termination:**
```bash
aws ec2 modify-instance-attribute \
  --instance-id i-xxx \
  --disable-api-termination
```
{{< /qa >}}

{{< qa num="13" q="How do you encrypt an existing unencrypted EBS volume?" level="intermediate" >}}
You **cannot** directly encrypt an existing unencrypted EBS volume. The process requires a snapshot copy:

**Step-by-step:**
```bash
# 1. Create snapshot of unencrypted volume
aws ec2 create-snapshot \
  --volume-id vol-unencrypted \
  --description "Pre-encryption snapshot"

# 2. Copy snapshot with encryption enabled
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-xxx \
  --encrypted \
  --kms-key-id alias/aws/ebs \
  --description "Encrypted copy"

# 3. Create new volume from encrypted snapshot
aws ec2 create-volume \
  --snapshot-id snap-encrypted \
  --availability-zone us-east-1a \
  --encrypted

# 4. Stop instance, detach old volume, attach new encrypted volume
```

**Prevent future unencrypted volumes account-wide:**
```bash
aws ec2 enable-ebs-encryption-by-default --region us-east-1
```
{{< /qa >}}

{{< qa num="14" q="What is EC2 Serial Console and when do you use it?" level="advanced" >}}
**EC2 Serial Console** provides access to the serial port of an instance — useful when the OS is unresponsive, SSH is broken, or the network is misconfigured.

**Enable at account level:**
```bash
aws ec2 enable-serial-console-access
```

**Connect:**
```bash
aws ec2-instance-connect send-serial-console-ssh-public-key \
  --instance-id i-xxx \
  --serial-port 0 \
  --ssh-public-key file://my-key.pub

ssh -p 9001 i-xxx.port0@serial-console.ec2-instance-connect.us-east-1.aws
```

**Use cases:**
- Fix misconfigured `/etc/ssh/sshd_config`
- Debug kernel panic or boot failures
- Fix `iptables` rules that locked out SSH
- Access GRUB menu to boot into single-user/rescue mode
- Fix misconfigured network interface configuration

**Requirements:** Instance must be Nitro-based and have a user password set (or use EC2 Instance Connect key).
{{< /qa >}}

{{< qa num="15" q="What is Amazon EC2 Auto Scaling predictive scaling?" level="advanced" >}}
**Predictive Scaling** uses ML to forecast future traffic and proactively scales your ASG **before** demand hits.

**How it works:**
1. Analyses CloudWatch metrics history (minimum 14 days required)
2. Forecasts load 48 hours ahead
3. Schedules scaling actions in advance
4. Can be combined with dynamic scaling policies

**Modes:**
| Mode | Behaviour |
|------|----------|
| **Forecast only** | Shows predictions, takes no action |
| **Forecast and scale** | Automatically schedules scaling actions |

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name prod-asg \
  --policy-name predictive-cpu \
  --policy-type PredictiveScaling \
  --predictive-scaling-configuration '{
    "MetricSpecifications": [{
      "TargetValue": 60,
      "PredefinedMetricPairSpecification": {
        "PredefinedMetricType": "ASGCPUUtilization"
      }
    }],
    "Mode": "ForecastAndScale",
    "SchedulingBufferTime": 300
  }'
```

**`SchedulingBufferTime`** — how many seconds before predicted peak to start scaling (allow for instance boot and app warm-up time).
{{< /qa >}}

{{< qa num="16" q="What is the difference between an ENI, ENA, and EFA?" level="advanced" >}}
These are three different EC2 networking concepts — often confused in interviews:

| | ENI | ENA | EFA |
|--|-----|-----|-----|
| **Full name** | Elastic Network Interface | Elastic Network Adapter | Elastic Fabric Adapter |
| **What it is** | Virtual NIC (software construct) | SR-IOV driver for enhanced networking | High-performance RDMA-capable NIC |
| **Max bandwidth** | Depends on instance | Up to 100 Gbps | Up to 400 Gbps |
| **Latency** | Standard | Lower than legacy VF | Under 15 µs (MPI-level) |
| **Use case** | All EC2 networking | Modern instances (default on 5th gen+) | HPC, distributed ML training |

**ENI** — logical network interface attached to instances. Every instance has at least one. Can be detached and moved (useful for failover with fixed private IPs).

**ENA** — the SR-IOV driver that makes networking fast on Nitro instances. Enabled by default on 5th gen+ instances.

**EFA** — optional adapter for HPC workloads using MPI/NCCL. Bypasses the OS kernel for inter-node communication using the SRD protocol.
{{< /qa >}}

{{< qa num="17" q="What is EC2 Auto Scaling Instance Refresh?" level="advanced" >}}
**Instance Refresh** replaces instances in an ASG in a rolling fashion — useful for updating AMI, instance type, or User Data without manual intervention.

**Trigger a refresh:**
```bash
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name prod-asg \
  --desired-configuration '{
    "LaunchTemplate": {
      "LaunchTemplateId": "lt-xxx",
      "Version": "$Latest"
    }
  }' \
  --preferences '{
    "MinHealthyPercentage": 80,
    "InstanceWarmup": 300,
    "SkipMatching": true
  }'
```

**Key preferences:**
| Preference | Description |
|-----------|-------------|
| `MinHealthyPercentage` | Minimum % healthy during refresh (controls blast radius) |
| `InstanceWarmup` | Seconds before counting new instance as healthy |
| `SkipMatching` | Skip instances already on the correct template version |
| `CheckpointPercentages` | Pause at these % for manual validation |

**Monitor progress:**
```bash
aws autoscaling describe-instance-refreshes \
  --auto-scaling-group-name prod-asg
```
{{< /qa >}}

{{< qa num="18" q="What CloudWatch metrics are available for EC2 by default vs what requires the CloudWatch Agent?" level="intermediate" >}}
**Default metrics (no agent needed) — 5-minute intervals:**

| Metric | Description |
|--------|-------------|
| `CPUUtilization` | Percentage of CPU used |
| `NetworkIn / NetworkOut` | Bytes transferred in and out |
| `DiskReadOps / WriteOps` | Instance store disk I/O |
| `StatusCheckFailed` | 0 or 1 |

**Requires CloudWatch Agent (not available by default):**

| Metric | Why it needs the agent |
|--------|----------------------|
| `mem_used_percent` | OS-level memory — hypervisor cannot see this |
| `disk_used_percent` | Per-filesystem disk usage |
| `swap_used` | Swap utilisation |
| Custom app logs | Application-specific metrics and log ingestion |

**Install agent via SSM:**
```bash
aws ssm send-command \
  --document-name "AWS-ConfigureAWSPackage" \
  --targets "Key=instanceids,Values=i-xxx" \
  --parameters '{"action":["Install"],"name":["AmazonCloudWatchAgent"]}'
```
{{< /qa >}}

{{< qa num="19" q="What is EC2 Dedicated Host vs Dedicated Instance?" level="intermediate" >}}
| Feature | Dedicated Instance | Dedicated Host |
|---------|-------------------|----------------|
| **Isolation** | Dedicated hardware, AWS manages placement | Full physical server dedicated to you |
| **Visibility** | No host details | Full visibility (host ID, sockets, cores) |
| **BYOL support** | Not supported | Supported (Windows, SQL Server, Oracle) |
| **Placement control** | No | Yes — target a specific host |
| **Billing** | Per instance | Per host per hour |
| **Compliance** | Basic isolation | Strict regulatory requirements |

**Use Dedicated Host when:**
- Bring Your Own License (BYOL) is required
- Compliance mandates physical server isolation
- You need to demonstrate hardware tenancy to auditors

```bash
aws ec2 allocate-hosts \
  --instance-type m6i.large \
  --quantity 1 \
  --availability-zone us-east-1a \
  --auto-placement on
```
{{< /qa >}}

{{< qa num="20" q="How do you perform an instance type change with zero or minimal downtime?" level="advanced" >}}
EC2 does not support hot resizing, but you can achieve **near-zero downtime** using these strategies:

**Strategy 1 — Instance Refresh on ASG (recommended):**
```bash
# Update Launch Template with new instance type, then:
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name prod-asg \
  --preferences '{
    "MinHealthyPercentage": 90,
    "InstanceWarmup": 300,
    "CheckpointPercentages": [25, 50, 75, 100],
    "CheckpointDelay": 120
  }'
```
ASG replaces instances in rolling batches, ALB handles traffic shifting automatically.

**Strategy 2 — Blue/Green with separate ASG:**
```
1. Launch new ASG with the new instance type
2. Register new ASG with same Target Group (weighted)
3. Gradually shift ALB weight: 90/10 → 50/50 → 0/100
4. Decommission old ASG once traffic is fully shifted
```

**Strategy 3 — Standby for single instance:**
```
1. Launch new instance with correct type
2. Register with Target Group, wait for health check
3. Deregister old instance (connection draining runs)
4. Terminate old instance
```
{{< /qa >}}

{{< qa num="21" q="What are Graviton-based EC2 instances and what are the benefits?" level="advanced" >}}
**AWS Graviton** processors are ARM64-based chips designed by AWS, offering improved price-performance over x86.

| Dimension | Graviton (ARM64) | Intel / AMD (x86_64) |
|-----------|-----------------|---------------------|
| **Architecture** | ARM64 | x86_64 |
| **Price/performance** | Up to 40% better | Baseline |
| **Generation examples** | m7g, c7g, r7g, t4g | m7i, c7a, r7i |
| **OS support** | Amazon Linux 2/2023, Ubuntu 20.04+, RHEL 8+, Windows | Universal |
| **Energy efficiency** | Up to 60% less power | Baseline |

**Migration steps:**
```bash
# 1. Build Docker images for ARM64
docker buildx build --platform linux/arm64 -t myapp:arm64 .

# 2. Test on t4g.micro (Graviton2, free tier eligible)

# 3. Switch Launch Template to Graviton instance type
aws ec2 modify-launch-template \
  --launch-template-id lt-xxx \
  --launch-template-data '{"InstanceType":"m7g.large"}'
```

**Best suited for Graviton:** Web services, microservices, containerised apps, Java workloads, open-source databases (MySQL, PostgreSQL, Redis).
{{< /qa >}}

{{< qa num="22" q="What is EC2 instance tenancy and what are the options?" level="intermediate" >}}
**Tenancy** controls whether your instance runs on shared or dedicated hardware.

| Tenancy | Hardware | Cost | Use Case |
|---------|---------|------|---------|
| **default** | Shared with other AWS customers | Standard pricing | Most workloads |
| **dedicated** | Dedicated hardware, AWS manages placement | ~10% premium | Compliance, isolation requirements |
| **host** | Specific physical host you control | Higher | BYOL, strict regulatory audits |

**Set at instance level:**
```bash
aws ec2 run-instances \
  --instance-type m6i.large \
  --placement '{"Tenancy":"dedicated"}' \
  --image-id ami-xxx
```

**Set at VPC level** (forces all instances in VPC to use dedicated tenancy):
```bash
aws ec2 modify-vpc-tenancy \
  --vpc-id vpc-xxx \
  --instance-tenancy dedicated
```

> You can change from `dedicated` to `default` tenancy (stop required), but **not** from `default` to `dedicated` on a running instance.
{{< /qa >}}

{{< qa num="23" q="How does IAM instance profile differ from an IAM role?" level="intermediate" >}}
These three terms are technically distinct but often used interchangeably:

```
IAM Role
  |-- Trust Policy (allows ec2.amazonaws.com to assume this role)
  |-- Permission Policies (what actions the role can perform)
        |
Instance Profile (container that holds the role for EC2)
        |
EC2 Instance (applications read credentials from IMDS)
```

- **IAM Role** — the set of permissions (policies attached)
- **Instance Profile** — the wrapper that allows a role to be assigned to an EC2 instance
- In the AWS Console, creating an EC2 role auto-creates an instance profile with the same name
- Via CLI you must create them separately:

```bash
aws iam create-role \
  --role-name EC2S3ReadRole \
  --assume-role-policy-document file://ec2-trust.json

aws iam create-instance-profile \
  --instance-profile-name EC2S3ReadProfile

aws iam add-role-to-instance-profile \
  --instance-profile-name EC2S3ReadProfile \
  --role-name EC2S3ReadRole

aws ec2 associate-iam-instance-profile \
  --instance-id i-xxx \
  --iam-instance-profile Name=EC2S3ReadProfile
```
{{< /qa >}}

{{< qa num="24" q="What are EC2 Spot capacity pools and how do you pick the right pool?" level="advanced" >}}
A **Spot capacity pool** is a set of unused EC2 instances of the same instance type in the same AZ. Each pool has its own price and interruption rate.

**Key insight:** Interruption frequency is driven by demand for a specific pool, not just price.

**Choosing pools wisely:**

**1. Use Spot Instance Advisor:**
- Shows historical interruption rates (less than 5%, 5-10%, etc.) per pool
- Check before choosing instance types

**2. Diversify across pools:**
```json
"Overrides": [
  { "InstanceType": "m5.xlarge",  "SubnetId": "subnet-az1" },
  { "InstanceType": "m5a.xlarge", "SubnetId": "subnet-az1" },
  { "InstanceType": "m4.xlarge",  "SubnetId": "subnet-az1" },
  { "InstanceType": "m5.xlarge",  "SubnetId": "subnet-az2" },
  { "InstanceType": "m5a.xlarge", "SubnetId": "subnet-az2" }
]
```

**3. Use `capacity-optimized` allocation strategy:**
- AWS selects the pool with the most available capacity
- Lowest interruption probability (not lowest price)

**4. Avoid pools with less than 5 available instances** — high interruption risk.
{{< /qa >}}

{{< qa num="25" q="What is EC2 network bandwidth bursting and how does it work?" level="advanced" >}}
Many EC2 instances support **network bandwidth bursting** — they can temporarily exceed their baseline network bandwidth for short periods.

**How it works:**
- Instances earn and spend **network I/O credits** similar to CPU credits on T-series
- Bursting applies when the instance has been idle and accumulated credits
- Sustained traffic is capped at the baseline bandwidth

**Example (m5.large):**
| Metric | Value |
|--------|-------|
| Baseline bandwidth | Up to 10 Gbps (baseline) |
| Burst bandwidth | 10 Gbps |
| Burst availability | Based on credit accumulation |

**Check current bandwidth limits:**
```bash
aws ec2 describe-instance-types \
  --instance-types m5.large \
  --query 'InstanceTypes[].NetworkInfo'
```

**Best practices:**
- For sustained high-throughput workloads, choose instances with dedicated (non-burstable) bandwidth (m5.4xlarge and above)
- Use **Placement Groups (Cluster)** to maximise intra-cluster bandwidth
- Monitor `NetworkIn` and `NetworkOut` in CloudWatch to detect sustained saturation
- Enable **Jumbo Frames (9001 MTU)** within a VPC to reduce overhead:
```bash
ip link set eth0 mtu 9001
```
{{< /qa >}}

</div>
