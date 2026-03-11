---
title: "AWS EC2 Interview Questions & Answers (2024)"
description: "40+ AWS EC2 interview questions covering instance types, Auto Scaling, AMIs, pricing models, networking, and troubleshooting — Basic to Advanced."
date: 2024-01-20
author: "CloudOps Hub"
tags: ["aws", "ec2", "interview", "certification"]
tool: "aws"
level: "All Levels"
question_count: 12
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

{{< qa num="5" q="How does Auto Scaling work? Explain the different scaling policies." level="intermediate" >}}
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
Cooldown: scaleIn=300s, scaleOut=60s
```

**2. Step Scaling** (fine-grained control)
```
CPU 70–85% → add 2 instances
CPU 85–100% → add 4 instances
CPU < 30% (10 min) → remove 1 instance
```

**3. Scheduled Scaling**
```bash
# Pre-scale before peak traffic every weekday 8am
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name prod-asg \
  --scheduled-action-name morning-scale-up \
  --recurrence "0 8 * * MON-FRI" \
  --desired-capacity 10
```

**4. Predictive Scaling** — ML-based, forecasts 24h ahead and scales proactively.
{{< /qa >}}

{{< qa num="6" q="What is the difference between a Security Group and a Network ACL?" level="intermediate" >}}
| Feature | Security Group | Network ACL |
|---------|---------------|-------------|
| **Applied at** | Instance/ENI level | Subnet level |
| **Stateful?** | ✅ Yes — return traffic auto-allowed | ❌ No — must allow both directions |
| **Rule types** | Allow only | Allow **and** Deny |
| **Rule evaluation** | All rules evaluated | Numbered rules, lowest first |
| **Default inbound** | Deny all | Allow all (default VPC NACL) |
| **Default outbound** | Allow all | Allow all |

**When to use NACLs:** Block specific IPs/CIDRs at subnet level (e.g., known bad actors). Use SGs for normal per-app access control.

**Best practice:** SGs as primary control, NACLs as supplementary subnet-level guardrails.
{{< /qa >}}

{{< qa num="7" q="What are EC2 Placement Groups?" level="intermediate" >}}
Placement groups control **physical placement** of instances on AWS infrastructure.

**Cluster** — all in same AZ, same rack
- Ultra-low latency, 25 Gbps enhanced networking
- Risk: single rack failure
- Use: HPC, tightly-coupled distributed systems

**Spread** — each instance on different hardware
- Max 7 per AZ per group
- Use: critical instances (ZooKeeper, master nodes)

**Partition** — logical partitions, each on separate rack
- Up to 7 partitions per AZ, hundreds of instances
- Use: Hadoop, Cassandra, HDFS

```bash
aws ec2 create-placement-group --group-name hpc-cluster --strategy cluster
```
{{< /qa >}}

{{< qa num="8" q="How do you troubleshoot an EC2 instance that fails status checks?" level="advanced" >}}
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

# Step 3: Check CloudWatch metrics (CPU, disk, network)
```

**Common causes and fixes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| `0/2 system checks` | Hardware failure | Stop/Start instance |
| `1/2 checks (instance)` | Kernel panic / OOM | Check console output |
| SSH timeout | Security group rule missing | Add port 22 from your IP |
| SSH auth failure | Wrong key/username | Use `ec2-user` (AL2), `ubuntu` (Ubuntu) |
| Full disk | `/` or `/var` full | Attach new EBS, resize |

**Debug without SSH:**
```bash
# Use SSM Session Manager (no SSH keys needed)
aws ssm start-session --target i-xxx
```
{{< /qa >}}

</div>
