---
title: "Ec2 Scenario Based Interview Questions"
description: "Scenario based EC2 Interview Questions and Answers"
date: 2026-04-06T15:00:28+05:30
author: "DB"
tags: []
tool: ["AWS","EC2"]       # aws | docker | kubernetes | jenkins | prometheus | grafana
level: "All Levels"
question_count: 30
draft: false
---

<div class="qa-list">

---

## 🟢 Basic Level

{{< details summary="Q1. Your manager asks you to explain EC2 to a non-technical stakeholder. How do you explain it?" >}}

**Answer:**

Think of EC2 like renting a computer in Amazon's data center. Instead of buying your own physical server (which costs thousands of dollars and takes weeks to set up), EC2 lets you rent one in minutes and pay only for what you use — like electricity.

**Simple analogy for stakeholders:**

> *"Imagine you need office space. You could buy a building (own a server), or you could rent a desk in a co-working space (EC2). You get all the power of a full computer, but you only pay for the time you use it, and you can get more desks instantly if your team grows."*

**Key points to highlight:**
- You choose the size (CPU, RAM, storage)
- You can start/stop it anytime
- Pay-as-you-go pricing
- AWS handles the physical hardware maintenance

{{< /details >}}

---

{{< details summary="Q2. A startup says they need a server for a web app but aren't sure how much traffic they'll get. What EC2 instance type do you recommend and why?" >}}

**Answer:**

For a startup with unpredictable traffic, I recommend starting with a **T-series (Burstable) instance** — specifically `t3.small` or `t3.medium`.

**Why T3?**
- Designed for workloads with variable CPU usage
- Earns CPU credits during idle periods, uses them during traffic spikes
- Cost-effective — you're not paying for peak capacity 24/7
- Easy to resize later as traffic patterns become clear

**Recommendation path:**

| Stage | Instance | Why |
|---|---|---|
| MVP / Launch | `t3.small` | Low cost, handles moderate bursts |
| Growing traffic | `t3.medium` or `t3.large` | More credits, more RAM |
| Predictable load | `m6i.large` | Move to general-purpose when traffic stabilizes |

**Additional advice:**
- Enable **Auto Scaling** from day one so new instances launch automatically under load
- Use **CloudWatch** to monitor CPU credit balance
- Consider **Elastic Load Balancer** even for a single instance — easy to add more later

{{< /details >}}

---

{{< details summary="Q3. You have an application running on t2.micro and it keeps crashing due to CPU throttling. What happened and how do you fix it?" >}}

**Answer:**

**What happened — CPU Credit Exhaustion:**

T2/T3 instances use a **burstable CPU credit model**:
- The instance earns credits when CPU usage is below the baseline
- It spends credits when CPU usage spikes above baseline
- `t2.micro` baseline is only **10% CPU**
- Once credits are exhausted, CPU is **hard-throttled** to 10% — causing crashes, timeouts, and slow responses

**How to fix:**

**Option 1 — Enable Unlimited Mode (quickest fix):**
```bash
aws ec2 modify-instance-credit-specification \
  --instance-credit-specifications "InstanceId=i-xxxx,CpuCredits=unlimited"
```
> ⚠️ This prevents throttling but adds a small cost for sustained burst usage.

**Option 2 — Upsize to a non-burstable instance:**
- Move to `m6i.large` or `c6i.large` for consistent CPU workloads
- These have dedicated vCPUs — no credit system

**Option 3 — Offload work:**
- Move heavy processing to a Lambda function or SQS consumer
- Use ElastiCache to reduce CPU-heavy DB queries

**How to detect it proactively:**
- Monitor `CPUCreditBalance` metric in CloudWatch
- Set an alarm when credits drop below 20

{{< /details >}}

---

{{< details summary="Q4. Explain the difference between On-Demand, Reserved, Spot, and Savings Plans. A CTO asks which to use for their production database." >}}

**Answer:**

| Pricing Model | How it Works | Discount vs On-Demand | Best For |
|---|---|---|---|
| **On-Demand** | Pay per hour/second, no commitment | 0% | Unpredictable or short-term workloads |
| **Reserved Instances** | 1 or 3-year commitment | Up to 72% | Steady, predictable production workloads |
| **Spot Instances** | Bid on unused capacity, can be interrupted | Up to 90% | Batch jobs, ML training, fault-tolerant workloads |
| **Savings Plans** | Commit to $/hour spend for 1–3 years | Up to 66% | Flexible across instance types and regions |

**For a production database — recommendation: Reserved Instances (or Compute Savings Plan)**

**Why:**
- Databases run 24/7 — reserved gives maximum savings
- Spot is NOT suitable — AWS can reclaim Spot instances with 2-minute notice, which would kill your DB
- On-Demand is too expensive for always-on workloads
- Savings Plans offer flexibility if instance type may change

**Recommended approach:**
```
Production DB → Reserved Instance (1-year, no upfront or partial upfront)
Dev/Test DB   → On-Demand or Spot (with automated snapshots for safety)
```

{{< /details >}}

---

{{< details summary="Q5. What is the difference between stopping, hibernating, and terminating an EC2 instance? Your team accidentally terminated a production instance — what do you do?" >}}

**Answer:**

| Action | RAM | EBS Root Volume | Public IP | Data |
|---|---|---|---|---|
| **Stop** | Cleared | Retained | Released | EBS data kept |
| **Hibernate** | Saved to EBS | Retained | Released | RAM + EBS kept |
| **Terminate** | Cleared | Deleted (by default) | Released | Lost unless snapshot exists |

**Recovery steps after accidental termination:**

**Step 1 — Check if a snapshot exists:**
```bash
aws ec2 describe-snapshots --filters "Name=description,Values=*i-xxxxxxxx*"
```

**Step 2 — Restore from snapshot:**
```bash
# Create a new volume from the snapshot
aws ec2 create-volume --snapshot-id snap-xxxxxxxx --availability-zone us-east-1a

# Launch a new instance and attach the volume
aws ec2 attach-volume --volume-id vol-xxxxxxxx --instance-id i-newinstance --device /dev/xvda
```

**Step 3 — Check AWS Backup / AMI backups:**
- Go to EC2 → AMIs → look for automated AMIs
- Restore by launching a new instance from that AMI

**Step 4 — Enable Termination Protection going forward:**
```bash
aws ec2 modify-instance-attribute \
  --instance-id i-xxxx \
  --disable-api-termination
```

**Prevention best practices:**
- Always enable **Termination Protection** on production instances
- Schedule regular **EBS snapshots** via Data Lifecycle Manager
- Use **IAM policies** to restrict `ec2:TerminateInstances` permission

{{< /details >}}

---

{{< details summary="Q6. Your company deploys new EC2 instances every week. Each setup takes 45 minutes. How do you reduce this to under 2 minutes?" >}}

**Answer:**

**Root cause:** Manual configuration, software installation, and setup steps are being repeated every time.

**Solution: Create a Golden AMI + Launch Template**

**Step 1 — Build a Golden AMI:**
- Launch a base instance
- Install all required software, agents, configs
- Run your hardening scripts
- Create an AMI from it

```bash
aws ec2 create-image \
  --instance-id i-xxxx \
  --name "golden-ami-v1-$(date +%Y%m%d)" \
  --no-reboot
```

**Step 2 — Create a Launch Template:**
```json
{
  "LaunchTemplateName": "app-server-template",
  "LaunchTemplateData": {
    "ImageId": "ami-xxxxxxxxx",
    "InstanceType": "t3.medium",
    "IamInstanceProfile": { "Name": "AppServerRole" },
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "UserData": "base64-encoded-startup-script"
  }
}
```

**Step 3 — Use User Data for runtime-only config:**
```bash
#!/bin/bash
# Only dynamic steps here — pull config from S3 or Parameter Store
aws s3 cp s3://my-config-bucket/app.conf /etc/app/
systemctl start myapp
```

**Result:**
| Before | After |
|---|---|
| 45 minutes manual setup | < 2 minutes automated launch |
| Human error prone | Consistent, repeatable |
| No audit trail | Version-controlled Launch Template |

**Bonus — Automate AMI refresh with pipelines:**  
Use EC2 Image Builder to rebuild and test your golden AMI automatically when base OS patches are released.

{{< /details >}}

---

{{< details summary="Q7. Your production database crashed and you need to recover data from 2 days ago. Walk me through the recovery process using EBS snapshots." >}}

**Answer:**

**Step 1 — Identify the snapshot from 2 days ago:**
```bash
aws ec2 describe-snapshots \
  --filters "Name=volume-id,Values=vol-xxxxxxxx" \
  --query "Snapshots[?StartTime>='2024-01-01']" \
  --output table
```

**Step 2 — Create a new EBS volume from that snapshot:**
```bash
aws ec2 create-volume \
  --snapshot-id snap-xxxxxxxx \
  --availability-zone us-east-1a \
  --volume-type gp3 \
  --size 100
```

**Step 3 — Attach the restored volume to your DB instance:**
```bash
# Stop the DB instance (or attach as secondary volume)
aws ec2 stop-instances --instance-ids i-xxxx

aws ec2 attach-volume \
  --volume-id vol-newvolume \
  --instance-id i-xxxx \
  --device /dev/xvdb
```

**Step 4 — Mount and verify data:**
```bash
mkdir /mnt/recovery
mount /dev/xvdb /mnt/recovery
ls /mnt/recovery/var/lib/mysql/
```

**Step 5 — Export only the needed data (point-in-time recovery):**
```bash
mysqldump -u root -p --databases mydb > /tmp/recovered.sql
mysql -u root -p production_db < /tmp/recovered.sql
```

**Best practices going forward:**
- Enable **automated EBS snapshots** via AWS Data Lifecycle Manager (DLM)
- For RDS databases, use **automated backups** with point-in-time recovery (PITR)
- Test snapshot restores monthly in a non-prod environment

{{< /details >}}

---

{{< details summary="Q8. You need to copy an EC2 instance from us-east-1 to ap-south-1 for a new regional deployment. How do you do it?" >}}

**Answer:**

**Step 1 — Create an AMI from the source instance:**
```bash
aws ec2 create-image \
  --instance-id i-xxxx \
  --name "migration-ami" \
  --region us-east-1
```

**Step 2 — Copy the AMI to the target region:**
```bash
aws ec2 copy-image \
  --source-image-id ami-xxxxxxxx \
  --source-region us-east-1 \
  --region ap-south-1 \
  --name "migrated-app-ami" \
  --encrypted  # Recommended for security
```

**Step 3 — Copy the KMS key if EBS volumes are encrypted:**
```bash
aws kms create-key --region ap-south-1
# Use this new CMK in the copy-image command with --kms-key-id
```

**Step 4 — Launch a new instance in ap-south-1 using the copied AMI:**
```bash
aws ec2 run-instances \
  --image-id ami-newregionid \
  --instance-type t3.medium \
  --region ap-south-1 \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx
```

**Step 5 — Validate the instance before switching traffic:**
- Run smoke tests
- Verify DB connectivity and app startup
- Update Route 53 with the new regional endpoint

**Key considerations:**
- Security Groups, Key Pairs, and VPCs are region-specific — recreate them
- Check for hardcoded region-specific endpoints in application config
- Update IAM policies if they reference specific region ARNs

{{< /details >}}

---

{{< details summary="Q9. Your application writes massive temporary files during processing and needs the fastest possible disk I/O. What storage do you recommend?" >}}

**Answer:**

**Recommendation: EC2 Instance Store (Ephemeral Storage)**

**Why Instance Store?**
- Physically attached NVMe SSDs directly on the host machine
- Delivers **millions of IOPS** with sub-millisecond latency
- No network overhead — unlike EBS which goes over the network
- Perfect for temporary/scratch data that doesn't need to persist

**Instance types with large Instance Store:**
| Instance Type | Storage | Use Case |
|---|---|---|
| `i4i.xlarge` | 937 GB NVMe SSD | High IOPS I/O intensive |
| `d3.xlarge` | 3 x 2 TB HDD | High throughput, MapReduce |
| `im4gn.xlarge` | 937 GB NVMe | Arm-based, cost effective |

**When to use EBS instead:**
- If the data must **survive instance stop/restart** → use `io2 Block Express` (up to 256,000 IOPS)
- If you need snapshots and backups → EBS only

**Architecture pattern for temp file workloads:**
```
Processing Job Starts
       ↓
Write temp files → Instance Store (ultra-fast)
       ↓
Job completes → Copy final result → S3 or EBS
       ↓
Temp files discarded automatically on stop
```

⚠️ **Critical warning:** Instance Store data is **lost** when the instance stops, terminates, or the host fails. Never store anything you can't recreate there.

{{< /details >}}

---

{{< details summary="Q10. Your developers say the EC2 disk is getting full even though they haven't added data. What are the common causes and how do you fix it?" >}}

**Answer:**

**Common causes of unexpected disk usage:**

**1. Log file accumulation:**
```bash
du -sh /var/log/*
# Fix: Set up log rotation
sudo nano /etc/logrotate.d/myapp
```

**2. Docker images and stopped containers:**
```bash
docker system df
docker system prune -a  # Removes unused images, containers, volumes
```

**3. OS/package update caches:**
```bash
# Ubuntu/Debian
sudo apt clean && sudo apt autoremove

# Amazon Linux / RHEL
sudo yum clean all
```

**4. Application temp/cache files:**
```bash
du -sh /tmp/*
du -sh /var/cache/*
find /tmp -mtime +7 -delete
```

**5. Core dump files:**
```bash
find / -name "core.*" -size +100M 2>/dev/null
```

**6. Old kernel versions:**
```bash
# Ubuntu
sudo apt autoremove --purge
```

**Fix disk full without downtime:**
```bash
# Option 1: Extend EBS volume (no restart needed for gp2/gp3)
aws ec2 modify-volume --volume-id vol-xxxx --size 100

# Then extend filesystem
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1   # ext4
# or
sudo xfs_growfs /           # xfs
```

**Proactive monitoring:**
- Set CloudWatch alarm on `disk_used_percent > 80%`
- Install CloudWatch Agent to collect disk metrics

{{< /details >}}

---

{{< details summary="Q11. When would you choose EFS over EBS? Give a real-world scenario." >}}

**Answer:**

| Feature | EBS | EFS |
|---|---|---|
| **Access** | Single EC2 instance | Multiple EC2 instances simultaneously |
| **Type** | Block storage | Network file system (NFS) |
| **Scaling** | Manual resize | Automatic, scales to petabytes |
| **Protocol** | - | NFSv4 |
| **Cost** | Lower | Higher (~3x EBS) |

**Choose EFS when:**
- Multiple EC2 instances need to **read/write the same files simultaneously**
- You need **automatic scaling** without pre-provisioning
- Running **containerized workloads** (ECS/EKS shared volumes)

**Real-world scenario:**

> A media company runs a video transcoding platform. 10 EC2 instances transcode videos in parallel. All instances need to read the same raw video file and write the output back.

```
Upload raw video → S3 → trigger Lambda
                          ↓
               Copy to EFS shared volume
                          ↓
        10 EC2 transcoding instances ←→ EFS (all read same file)
                          ↓
               Output written back to EFS
                          ↓
               Final upload → S3 / CloudFront
```

**Other EFS use cases:**
- WordPress sites scaled across multiple EC2s (shared `wp-content/uploads`)
- CI/CD build artifact sharing
- Home directories for thousands of users (EFS + AWS Transfer)
- Machine learning training datasets shared across GPU instances

{{< /details >}}

---

## 🟡 Intermediate Level

{{< details summary="Q12. You deployed an EC2 instance but cannot SSH into it. Walk me through your troubleshooting checklist." >}}

**Answer:**

**Systematic SSH Troubleshooting Checklist:**

**1. Check Instance State:**
```bash
aws ec2 describe-instances --instance-ids i-xxxx \
  --query "Reservations[0].Instances[0].State.Name"
# Must be "running"
```

**2. Check Security Group inbound rules:**
- Port **22** must be open from your IP (or `0.0.0.0/0` for testing)
```bash
aws ec2 describe-security-groups --group-ids sg-xxxx
```

**3. Verify the correct Key Pair:**
```bash
ssh -i /path/to/correct-key.pem ec2-user@public-ip
# Wrong key = "Permission denied (publickey)"
```

**4. Check correct username for the AMI:**
| AMI | Username |
|---|---|
| Amazon Linux 2 | `ec2-user` |
| Ubuntu | `ubuntu` |
| RHEL | `ec2-user` or `root` |
| CentOS | `centos` |

**5. Verify the instance has a Public IP:**
```bash
aws ec2 describe-instances --instance-ids i-xxxx \
  --query "Reservations[0].Instances[0].PublicIpAddress"
```

**6. Check the VPC Route Table:**
- Public subnet must have a route `0.0.0.0/0 → Internet Gateway`

**7. Check Network ACLs:**
- NACLs are stateless — ensure **both inbound (port 22) and outbound (ephemeral ports 1024–65535)** are allowed

**8. Check System Log for boot errors:**
```bash
aws ec2 get-console-output --instance-id i-xxxx
```

**9. Use EC2 Instance Connect (browser-based):**
- Works even if SSH key is wrong or lost
- Go to EC2 Console → Select instance → Connect → EC2 Instance Connect

**10. Use SSM Session Manager (no SSH needed):**
```bash
aws ssm start-session --target i-xxxx
```
> Requires SSM Agent running and IAM role with `AmazonSSMManagedInstanceCore`

{{< /details >}}

---

{{< details summary="Q13. What is the difference between Security Groups and Network ACLs? When would you use each?" >}}

**Answer:**

| Feature | Security Group | Network ACL |
|---|---|---|
| **Level** | Instance level | Subnet level |
| **State** | Stateful (return traffic auto-allowed) | Stateless (must define inbound + outbound rules) |
| **Rules** | Allow only | Allow and Deny |
| **Applies to** | ENI / EC2 instance | All resources in the subnet |
| **Rule evaluation** | All rules evaluated together | Rules evaluated in number order (lowest first) |
| **Default** | Deny all inbound, allow all outbound | Allow all inbound and outbound |

**When to use Security Groups:**
- Primary firewall for your EC2 instances
- Allow specific ports per application (port 80, 443, 3306)
- Reference other Security Groups (e.g., allow only ALB SG to reach app SG)

**When to use Network ACLs:**
- Block a specific IP address range at subnet level (e.g., blocking a bad actor's CIDR)
- Add an extra layer of defense-in-depth
- Restrict outbound traffic from an entire subnet

**Real-world example:**
```
Internet
   ↓
[NACL — Block known bad IPs, allow 80/443]
   ↓
[ALB Security Group — Allow 80/443 from 0.0.0.0/0]
   ↓
[App Security Group — Allow 8080 only from ALB SG]
   ↓
[DB Security Group — Allow 3306 only from App SG]
```

**Key tip:** Always put your primary rules in Security Groups. Use NACLs only for broad subnet-level restrictions or emergency IP blocking.

{{< /details >}}

---

{{< details summary="Q14. Your EC2 instance's public IP changes every time it restarts, breaking your DNS configuration. How do you solve this?" >}}

**Answer:**

**Root cause:** By default, EC2 instances get a **dynamic public IP** that changes on every stop/start cycle.

**Solution 1 — Allocate and associate an Elastic IP (EIP):**
```bash
# Allocate a static Elastic IP
aws ec2 allocate-address --domain vpc

# Associate it with your instance
aws ec2 associate-address \
  --instance-id i-xxxx \
  --allocation-id eipalloc-xxxxxxxx
```

Now the public IP is **fixed and persistent** — it won't change on restart.

**Update your DNS:**
- Point your A record to the Elastic IP
- The IP survives stop/start cycles (but not termination)

**Solution 2 — Use Route 53 with a private/internal DNS:**
```bash
# For internal services — use private hosted zone + private IP
# Private IPs don't change on restart (only public ones do)
```

**Solution 3 — Use Route 53 Dynamic DNS (for non-EIP scenarios):**
- Use a Lambda function triggered by CloudWatch Events on instance start
- Lambda reads the new public IP and updates the Route 53 record automatically

**Cost note:**
- Elastic IPs are **free** as long as they're associated with a running instance
- You're charged **~$0.005/hr** if the EIP is allocated but not associated
- Each AWS account gets 5 EIPs per region by default

**Best practice:**
> Use Elastic IPs for external-facing IPs. For internal communication, use **private IPs** (which never change) or **internal load balancers with DNS names**.

{{< /details >}}

---

{{< details summary="Q15. Your e-commerce website crashes every Black Friday due to traffic spikes. Design an auto-scaling solution." >}}

**Answer:**

**Architecture:**

```
Route 53 (DNS)
      ↓
CloudFront (CDN — cache static assets)
      ↓
Application Load Balancer
      ↓
Auto Scaling Group (EC2 fleet)
   ├── Min: 2 instances
   ├── Desired: 4 instances
   └── Max: 50 instances
      ↓
RDS Aurora (Multi-AZ + Read Replicas)
      ↓
ElastiCache (Redis — session + product cache)
```

**Auto Scaling Configuration:**

**Target Tracking Policy (recommended):**
```json
{
  "TargetValue": 60.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ASGAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}
```

**Scheduled Scaling for Black Friday (predictive):**
```bash
# Pre-scale 2 hours before expected traffic surge
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name ecommerce-asg \
  --scheduled-action-name black-friday-scale-out \
  --start-time "2024-11-29T06:00:00Z" \
  --min-size 20 \
  --desired-capacity 30 \
  --max-size 100
```

**Use Predictive Scaling:**
- AWS analyzes historical CloudWatch data
- Pre-launches instances before traffic hits

**Additional optimizations:**
- Store sessions in **ElastiCache** (not local disk) so any instance can serve any user
- Use **SQS** for order processing — decouple checkout from inventory update
- Enable **RDS Proxy** to prevent DB connection exhaustion
- Pre-warm the ALB by contacting AWS support before peak events
- Use **Spot Instances** in a mixed ASG for 70% cost savings during surge

{{< /details >}}

---

{{< details summary="Q16. What is the difference between ALB, NLB, and CLB? A gaming company needs ultra-low latency for real-time multiplayer. Which do you choose?" >}}

**Answer:**

| Feature | ALB | NLB | CLB |
|---|---|---|---|
| **Layer** | Layer 7 (HTTP/HTTPS) | Layer 4 (TCP/UDP) | Layer 4 & 7 (legacy) |
| **Protocols** | HTTP, HTTPS, gRPC, WebSocket | TCP, UDP, TLS | HTTP, HTTPS, TCP |
| **Latency** | ~400ms | ~100 microseconds | Legacy |
| **Static IP** | No (use with NLB) | Yes | No |
| **Path routing** | ✅ Yes | ❌ No | ❌ No |
| **Use case** | Web apps, microservices | Gaming, IoT, real-time | Legacy apps only |

**For a real-time multiplayer gaming company → NLB**

**Why NLB:**
- Operates at **Layer 4** — routes TCP/UDP packets with minimal processing overhead
- Sub-millisecond latency — critical for real-time game state updates
- Supports **UDP** — most game engines use UDP for speed (can tolerate packet loss)
- Provides **static Elastic IPs** — clients can hardcode the IP (no DNS resolution delay)
- Handles **millions of concurrent connections**
- Preserves **source IP** of players — useful for geolocation and anti-cheat systems

**Architecture for gaming:**
```
Player (UDP/TCP)
      ↓
NLB (static IP, ultra-low latency)
      ↓
Game Server Fleet (EC2 C-series — compute optimized)
      ↓
Redis (shared game state)
      ↓
DynamoDB (player data, leaderboards)
```

**When to use ALB:**
- Player login portal (HTTP/HTTPS)
- Game lobby matchmaking API
- Microservices communication

{{< /details >}}

---

{{< details summary="Q17. An Auto Scaling Group keeps launching instances that immediately get marked unhealthy and terminated. What could be wrong?" >}}

**Answer:**

**Common causes and fixes:**

**1. Health Check Failure — Application not starting fast enough:**
- ALB health check hits the instance before the app is ready
- Fix: Increase **health check grace period**
```bash
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --health-check-grace-period 300  # Give app 5 minutes to start
```

**2. Wrong Health Check Path:**
```bash
# ALB target group — verify health check endpoint returns HTTP 200
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...
```
- Fix: Change health check path to a lightweight endpoint like `/health` or `/ping`

**3. User Data Script Failing:**
```bash
# Check user data execution logs
cat /var/log/cloud-init-output.log
cat /var/log/cloud-init.log
```
- Fix: Debug the startup script — missing packages, wrong paths, environment variables

**4. Instance doesn't have required IAM Permissions:**
- App tries to read from S3 / Secrets Manager and fails on startup
- Fix: Attach the correct IAM Instance Profile to the Launch Template

**5. Security Group Blocking Health Check:**
- ALB health checks come from the ALB's security group
- Fix: Allow the **ALB Security Group** as a source in the **EC2 Security Group** for the health check port

**6. Wrong AMI — Missing application:**
- The Golden AMI was updated but app binaries were accidentally removed
- Fix: Always version and test AMIs before updating the Launch Template

**Debugging flow:**
```
Check ASG activity history → identify termination reason
       ↓
Check Target Group health → see failure message
       ↓
Check EC2 System Log → cloud-init errors
       ↓
Temporarily increase grace period → manually inspect a live instance
```

{{< /details >}}

---

{{< details summary="Q18. Design a highly available architecture for a 3-tier web application on EC2." >}}

**Answer:**

**Architecture Overview (Multi-AZ, Multi-tier):**

```
                        Route 53
                           ↓
                     CloudFront (CDN)
                           ↓
               Application Load Balancer
              (spans AZ-1, AZ-2, AZ-3)
                    ↙           ↘
          ┌─── AZ-1 ───┐   ┌─── AZ-2 ───┐
          │  Web Tier   │   │  Web Tier   │   ← Public Subnets
          │ (t3.medium) │   │ (t3.medium) │
          └─────────────┘   └─────────────┘
                    ↓               ↓
          ┌─── AZ-1 ───┐   ┌─── AZ-2 ───┐
          │  App Tier   │   │  App Tier   │   ← Private Subnets
          │ (c5.large)  │   │ (c5.large)  │
          └─────────────┘   └─────────────┘
                    ↓               ↓
          ┌─── AZ-1 ───┐   ┌─── AZ-2 ───┐
          │  RDS Aurora │   │  RDS Aurora │   ← DB Subnets
          │  (Primary)  │   │  (Replica)  │
          └─────────────┘   └─────────────┘
```

**Key components:**

| Component | Service | Purpose |
|---|---|---|
| DNS | Route 53 | Health-based routing, failover |
| CDN | CloudFront | Static asset caching, DDoS protection |
| Load Balancer | ALB | Distribute traffic, SSL termination |
| Web Tier | EC2 ASG | Serve frontend, min 2 instances per AZ |
| App Tier | EC2 ASG | Business logic, private subnet |
| Cache | ElastiCache Redis | Session store, query cache |
| Database | RDS Aurora Multi-AZ | Automatic failover in 30 seconds |
| Storage | S3 | Static files, uploads |
| Secrets | Secrets Manager | DB credentials, API keys |

**Networking:**
- Web tier in **public subnets** (has internet access via IGW)
- App tier in **private subnets** (internet access via NAT Gateway)
- DB tier in **isolated subnets** (no internet access whatsoever)

**High Availability guarantees:**
- Any single AZ failure → traffic shifts to remaining AZs automatically
- Instance failure → ASG replaces it within minutes
- Database failure → Aurora fails over to replica in ~30 seconds

{{< /details >}}

---

{{< details summary="Q19. What is the difference between High Availability and Fault Tolerance? Give an EC2-based example of each." >}}

**Answer:**

| | High Availability (HA) | Fault Tolerance (FT) |
|---|---|---|
| **Goal** | Minimize downtime | Zero downtime, even during failure |
| **Approach** | Detect failure → recover quickly | Redundancy so failure is invisible |
| **Downtime** | Small (seconds to minutes) | None |
| **Cost** | Moderate | High (full redundancy) |
| **Example** | Multi-AZ with failover | Active-active with no single point of failure |

**High Availability — EC2 Example:**

RDS Multi-AZ Database:
- Primary DB in AZ-1, Standby in AZ-2
- If AZ-1 fails, AWS automatically promotes standby in ~30-60 seconds
- Brief downtime during failover — but the system recovers automatically

**Fault Tolerant — EC2 Example:**

Active-Active Auto Scaling Group:
- 6 EC2 instances spread across 3 AZs (2 per AZ)
- ALB distributes traffic across all 6
- If AZ-1 loses both instances, ALB instantly routes to the 4 remaining instances
- Users experience **zero downtime** — no failover needed

```
Fault Tolerant Setup:
ALB
├── AZ-1: Instance 1, Instance 2  ← 2 fail
├── AZ-2: Instance 3, Instance 4  ← traffic redistributes here
└── AZ-3: Instance 5, Instance 6  ← and here
                                     (zero user impact)
```

**Rule of thumb:**
- HA = "we will recover fast" (N+1 redundancy)
- FT = "you will never know we had a problem" (2N redundancy)
- FT costs roughly 2x because you need full standby capacity at all times

{{< /details >}}

---

{{< details summary="Q20. Your application on EC2 needs to read from S3 and write to DynamoDB. A junior engineer hardcoded AWS access keys in the application code. What do you do?" >}}

**Answer:**

**Immediate response — treat as a security incident:**

**Step 1 — Revoke the compromised keys immediately:**
```bash
aws iam update-access-key \
  --access-key-id AKIAXXXXXXXXXXXXXXXX \
  --status Inactive

aws iam delete-access-key \
  --access-key-id AKIAXXXXXXXXXXXXXXXX
```

**Step 2 — Check if keys were exposed:**
- Search git history for the keys
- Check CloudTrail for unauthorized API calls made with those keys
- Check if the repo is public (GitHub secret scanning)
```bash
git log --all -p | grep -i "AKIA"
```

**Step 3 — Rotate and audit:**
- Review CloudTrail logs for the past 90 days for those key's activity
- Check for new IAM users, roles, or policies created — attacker may have escalated privileges

**The right solution — Use IAM Instance Profile (Roles):**

```bash
# Create an IAM role
aws iam create-role \
  --role-name EC2AppRole \
  --assume-role-policy-document file://ec2-trust-policy.json

# Attach permissions
aws iam attach-role-policy \
  --role-name EC2AppRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Attach the role to EC2
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxx \
  --iam-instance-profile Name=EC2AppRole
```

The application then uses the **instance metadata service** to get temporary credentials automatically:
```python
import boto3
# No credentials needed in code — SDK auto-fetches from instance role
s3 = boto3.client('s3')
```

**Prevention going forward:**
- Add **git-secrets** or **truffleHog** to CI/CD pipeline to block credential commits
- Use **AWS Secrets Manager** for third-party API keys
- Enable **AWS Config rule** `iam-no-inline-policy` and credential report alerts
- Set up **GuardDuty** to detect anomalous API usage

{{< /details >}}

---

{{< details summary="Q21. How do you prevent someone from accidentally terminating a critical production EC2 instance?" >}}

**Answer:**

**Layer 1 — Enable EC2 Termination Protection:**
```bash
aws ec2 modify-instance-attribute \
  --instance-id i-xxxx \
  --disable-api-termination
```
Now `ec2:TerminateInstances` will fail with an error unless protection is explicitly disabled first.

**Layer 2 — IAM Policy to restrict termination:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "ec2:TerminateInstances",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Environment": "production"
        }
      }
    }
  ]
}
```
This **denies termination of any instance tagged** `Environment=production` for the attached user/role.

**Layer 3 — Tag-based access control:**
- Tag all prod instances: `Environment=production`, `Critical=true`
- Only `prod-admin` role can terminate production-tagged resources

**Layer 4 — AWS Config rule for automatic detection:**
- Create a Config rule that alerts if termination protection is disabled
- Trigger Lambda to re-enable it automatically

**Layer 5 — CloudTrail + SNS alerts:**
```bash
# Alert when anyone calls DisableApiTermination on production instances
# CloudWatch Events → SNS → PagerDuty/Slack
```

**Full protection stack:**
```
Termination Request
       ↓
IAM Policy Check → DENY (if production tag)
       ↓
Termination Protection Flag → ERROR
       ↓
CloudTrail logs the attempt
       ↓
CloudWatch alert fires → Slack notification
```

{{< /details >}}

---

## 🔴 Advanced Level

{{< details summary="Q22. Your AWS bill shows EC2 costs doubled last month. How do you investigate and reduce costs?" >}}

**Answer:**

**Step 1 — Identify the source using Cost Explorer:**
```bash
# Via CLI
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```
- Break down by **Service**, **Region**, **Instance Type**, **Tag**

**Step 2 — Find idle/underutilized instances:**
```bash
# Use AWS Compute Optimizer
aws compute-optimizer get-ec2-instance-recommendations \
  --account-ids 123456789012
```
- Look for instances with < 5% average CPU utilization
- These are prime candidates for downsizing or termination

**Common culprits:**
| Cause | Detection | Fix |
|---|---|---|
| New instances launched but not tracked | Tag policy / Cost Explorer | Enforce tagging, terminate orphans |
| Dev/test instances running 24/7 | Instance scheduler | Auto-stop nights + weekends |
| Oversized instances | Compute Optimizer | Rightsize to smaller type |
| On-Demand for steady workloads | Cost Explorer | Purchase Reserved Instances or Savings Plan |
| Unattached EBS volumes | `describe-volumes --filters Name=status,Values=available` | Delete or snapshot + delete |
| Idle Elastic IPs | `describe-addresses` | Release unassociated EIPs |
| NAT Gateway data transfer spike | VPC Flow Logs | Move S3/DynamoDB traffic to VPC endpoints |

**Step 3 — Implement cost controls:**
```bash
# Set a billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-Cost-Spike" \
  --metric-name EstimatedCharges \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold
```

**Quick wins checklist:**
- ✅ Purchase 1-year Savings Plan for baseline usage (saves 20–40%)
- ✅ Use Spot Instances for dev/test/batch (saves up to 90%)
- ✅ Schedule non-prod instances to stop nights and weekends (saves 65%)
- ✅ Delete unattached EBS volumes
- ✅ Release unused Elastic IPs
- ✅ Use S3/DynamoDB VPC endpoints (eliminates NAT Gateway data charges)

{{< /details >}}

---

{{< details summary="Q23. Explain Spot Instances. A company wants to run ML model training but has a limited budget. Design a cost-effective solution." >}}

**Answer:**

**What are Spot Instances?**
- AWS sells unused EC2 capacity at discounts of **up to 90%**
- AWS can **reclaim** them with a **2-minute warning** when capacity is needed
- Price fluctuates based on supply and demand

**Architecture for ML Training on Spot:**

```
S3 (training data + model checkpoints)
           ↓
Spot Instance Fleet (GPU instances — p3.2xlarge or g4dn.xlarge)
           ↓
Training script with checkpoint logic
           ↓
S3 (save checkpoint every N steps)
           ↓
If Spot interrupted → new Spot instance launches
                    → resumes from last checkpoint
```

**Spot Interruption Handling:**
```python
import boto3
import requests

def check_spot_interruption():
    try:
        # Check instance metadata for interruption notice
        r = requests.get(
            "http://169.254.169.254/latest/meta-data/spot/interruption-action",
            timeout=1
        )
        if r.status_code == 200:
            # Save checkpoint NOW
            save_model_checkpoint()
    except:
        pass  # No interruption notice
```

**Use a Spot Fleet with diversification:**
```json
{
  "SpotFleetRequestConfig": {
    "AllocationStrategy": "capacityOptimized",
    "TargetCapacity": 10,
    "LaunchSpecifications": [
      {"InstanceType": "p3.2xlarge"},
      {"InstanceType": "g4dn.xlarge"},
      {"InstanceType": "p2.xlarge"}
    ]
  }
}
```

**Cost comparison for a 100-hour training job:**
| Option | Instance | Cost |
|---|---|---|
| On-Demand | p3.2xlarge @ $3.06/hr | ~$306 |
| Spot | p3.2xlarge @ ~$0.92/hr | ~$92 |
| Savings | | **70% reduction** |

**Tools to use:**
- **SageMaker Managed Spot Training** — handles interruptions automatically
- **AWS Batch** — retries Spot jobs seamlessly
- **EC2 Spot Advisor** — shows historical interruption frequency by instance type

{{< /details >}}

---

{{< details summary="Q24. Your EC2 application is running but users say it is slow. How do you diagnose the performance bottleneck?" >}}

**Answer:**

**Systematic Performance Diagnosis:**

**Step 1 — Identify the symptom layer:**
- Slow for all users? → Server-side issue
- Slow for some users? → Regional/CDN issue
- Slow only under load? → Scalability issue

**Step 2 — Check EC2 system metrics (CloudWatch):**
```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 --statistics Average
```

**Metric-to-cause mapping:**
| High Metric | Root Cause | Fix |
|---|---|---|
| CPU > 80% | CPU bound | Upsize, optimize code, add caching |
| Memory > 80% | Memory leak or undersized | Add swap, rightsize, profile app |
| Disk I/O wait | Slow storage | Upgrade gp2 → gp3, or io2 |
| Network in/out | Bandwidth saturation | Move to enhanced networking instance |
| DB connections | Connection pool exhausted | Add RDS Proxy or connection pooling |

**Step 3 — Check application-level metrics:**
```bash
# On the instance
top                    # CPU per process
iostat -x 1            # Disk I/O
netstat -antp          # Network connections
free -m                # Memory usage
vmstat 1               # VM stats
```

**Step 4 — Profile the application:**
- Check application logs for slow queries, timeouts
- Enable **RDS Performance Insights** for DB bottlenecks
- Use **X-Ray** for distributed tracing across services

**Step 5 — Network and latency:**
```bash
# From the instance
curl -o /dev/null -s -w "%{time_total}\n" http://your-api-endpoint
traceroute your-db-endpoint
```

**Common fixes:**
- CPU bottleneck → Add ElastiCache to reduce repeated DB queries
- DB slow → Add read replicas, add indexes
- Disk slow → Switch from gp2 to gp3 (3x IOPS, free)
- Memory leak → Restart app scheduled, then fix the leak

{{< /details >}}

---

{{< details summary="Q25. What is the EC2 Instance Metadata Service and how can it be exploited? How do you protect against it?" >}}

**Answer:**

**What is IMDS?**

The Instance Metadata Service (IMDS) is an HTTP endpoint available from within every EC2 instance:
```
http://169.254.169.254/latest/meta-data/
```

It provides instance info and — critically — **temporary IAM credentials** for the attached role:
```bash
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/MyRole
# Returns: AccessKeyId, SecretAccessKey, Token
```

**The SSRF exploit (Server-Side Request Forgery):**

```
Attacker → Sends request to vulnerable web app:
GET /fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/

Vulnerable app fetches the URL server-side
          ↓
Returns IAM credentials to the attacker
          ↓
Attacker now has full AWS access via those credentials
```

This was the **Capital One breach in 2019** — attacker used SSRF to steal credentials from IMDS.

**Protection — Enforce IMDSv2 (Token-based):**

IMDSv2 requires a PUT request first to get a token — a browser/SSRF can't make cross-origin PUT requests:

```bash
# Enforce IMDSv2 on existing instance
aws ec2 modify-instance-metadata-options \
  --instance-id i-xxxx \
  --http-tokens required \
  --http-endpoint enabled

# Enforce IMDSv2 in Launch Template (all future instances)
aws ec2 create-launch-template \
  --launch-template-data '{
    "MetadataOptions": {
      "HttpTokens": "required",
      "HttpEndpoint": "enabled"
    }
  }'
```

**Enforce organization-wide with SCP:**
```json
{
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Condition": {
    "StringNotEquals": {
      "ec2:MetadataHttpTokens": "required"
    }
  }
}
```

**Additional protections:**
- Apply **least privilege IAM roles** — stolen credentials have limited blast radius
- Use **AWS Config rule** `ec2-imdsv2-check` to detect non-compliant instances
- Deploy **WAF rules** to block SSRF attempts at the ALB level

{{< /details >}}

---

{{< details summary="Q26. You need 50 EC2 instances to automatically configure themselves and deploy your application on every launch. How do you automate this?" >}}

**Answer:**

**Multi-layer automation approach:**

**Layer 1 — User Data (bootstrap script):**
```bash
#!/bin/bash
# Runs once on first boot
set -e

# Pull config from Parameter Store
APP_ENV=$(aws ssm get-parameter --name "/myapp/environment" --query "Parameter.Value" --output text)
DB_URL=$(aws ssm get-parameter --name "/myapp/db_url" --with-decryption --query "Parameter.Value" --output text)

# Pull and start application
aws s3 cp s3://my-artifacts/myapp-latest.tar.gz /opt/
tar -xzf /opt/myapp-latest.tar.gz -C /opt/myapp/
systemctl start myapp
```

**Layer 2 — Systems Manager (SSM) State Manager:**
```bash
# Create an association that runs on all instances in the ASG
aws ssm create-association \
  --name "AWS-RunShellScript" \
  --targets "Key=tag:Role,Values=AppServer" \
  --parameters "commands=['systemctl status myapp']" \
  --schedule-expression "rate(30 minutes)"
```

**Layer 3 — Golden AMI + minimal User Data (fastest approach):**
```
Golden AMI contains:
  - OS hardening
  - All packages installed
  - App binary pre-installed
  - CloudWatch agent configured

User Data only does:
  - Pull environment-specific config from SSM Parameter Store
  - Set environment variables
  - Start application service
```

**Layer 4 — AWS CodeDeploy for continuous deployments:**
```yaml
# appspec.yml
version: 0.0
os: linux
files:
  - source: /
    destination: /opt/myapp
hooks:
  AfterInstall:
    - location: scripts/start_server.sh
      timeout: 60
```
CodeDeploy agent on the instance automatically receives and deploys when triggered.

**Launch Template with all automation baked in:**
```json
{
  "LaunchTemplateData": {
    "IamInstanceProfile": {"Name": "AppServerRole"},
    "UserData": "base64(bootstrap.sh)",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Role", "Value": "AppServer"}]
    }]
  }
}
```

**Result:** New instance launches → runs User Data (< 60 seconds) → SSM picks it up → app is live → ALB health check passes → instance joins fleet.

{{< /details >}}

---

{{< details summary="Q27. You are building an HPC cluster for scientific simulation where network latency between nodes is critical. What EC2 feature do you use?" >}}

**Answer:**

**Primary feature: Placement Groups — Cluster Placement Group**

A Cluster Placement Group places instances **physically close together** on the same high-bisection bandwidth network segment within an AZ.

```bash
# Create a Cluster Placement Group
aws ec2 create-placement-group \
  --group-name hpc-cluster \
  --strategy cluster

# Launch HPC instances into the group
aws ec2 run-instances \
  --instance-type hpc6a.48xlarge \
  --placement "GroupName=hpc-cluster" \
  --count 64 \
  --network-interfaces "DeviceIndex=0,InterfaceType=efa"
```

**Full HPC stack:**

| Feature | Purpose |
|---|---|
| **Cluster Placement Group** | Co-locate instances for lowest latency |
| **Elastic Fabric Adapter (EFA)** | OS-bypass networking, MPI-level latency |
| **HPC Instance Types** (hpc6a, hpc7g) | Purpose-built for HPC with EFA |
| **FSx for Lustre** | High-throughput parallel filesystem |
| **AWS ParallelCluster** | Automated HPC cluster management |

**Elastic Fabric Adapter (EFA):**
- Enables **Message Passing Interface (MPI)** — the standard for HPC communication
- Bypasses the OS kernel for network communication → microsecond latency
- Up to **400 Gbps** network bandwidth on hpc7g instances

**Architecture:**
```
S3 (input datasets)
       ↓
FSx for Lustre (parallel shared filesystem, 1TB/s throughput)
       ↓
64 x hpc6a.48xlarge (EFA, Cluster Placement Group)
├── MPI over EFA network (microsecond latency)
├── All nodes in same AZ, same rack segment
└── SLURM job scheduler (via AWS ParallelCluster)
       ↓
FSx for Lustre (output)
       ↓
S3 (long-term storage)
```

**Placement Group types summary:**
| Strategy | Use Case |
|---|---|
| **Cluster** | HPC, low-latency, high throughput |
| **Spread** | Critical instances must not share hardware |
| **Partition** | Hadoop/Kafka — failure domain isolation |

{{< /details >}}

---

{{< details summary="Q28. Your EC2 application processes SQS messages. Sometimes messages expire or get processed twice. How do you architect this properly?" >}}

**Answer:**

**Problem 1 — Messages processed twice (duplicate processing):**

Caused by: Visibility timeout expires before processing finishes → message becomes visible again → another worker picks it up.

**Fix — Set visibility timeout correctly:**
```bash
# Set visibility timeout > your max processing time
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue \
  --attributes VisibilityTimeout=300  # 5 minutes

# During processing, extend the timeout dynamically if needed
aws sqs change-message-visibility \
  --queue-url $QUEUE_URL \
  --receipt-handle $RECEIPT_HANDLE \
  --visibility-timeout 60
```

**Fix — Idempotent message processing:**
```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ProcessedMessages')

def process_message(message_id, payload):
    # Check if already processed
    try:
        table.put_item(
            Item={'message_id': message_id, 'processed_at': str(datetime.now())},
            ConditionExpression='attribute_not_exists(message_id)'
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        print(f"Message {message_id} already processed — skipping")
        return
    
    # Process the message
    do_work(payload)
```

**Problem 2 — Messages expiring (message retention):**

**Fix — Dead Letter Queue (DLQ):**
```bash
# Create DLQ for failed messages
aws sqs create-queue --queue-name my-queue-dlq

# Configure main queue to send to DLQ after 3 failed attempts
aws sqs set-queue-attributes \
  --queue-url $MAIN_QUEUE_URL \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123:my-queue-dlq\",\"maxReceiveCount\":\"3\"}"
  }'
```

**Complete architecture:**
```
Producer → SQS Queue (visibility: 300s, retention: 14 days)
                ↓
         EC2 Consumer Fleet (ASG)
         - Polls for messages
         - Extends visibility if processing long
         - Marks message processed in DynamoDB
         - Deletes message from SQS on success
                ↓ (on failure after 3 attempts)
         Dead Letter Queue
                ↓
         CloudWatch Alarm → SNS → PagerDuty alert
                ↓
         Manual review or replay tool
```

**Auto-scaling the consumer fleet based on queue depth:**
```bash
aws autoscaling put-scaling-policy \
  --policy-name scale-on-queue-depth \
  --auto-scaling-group-name consumer-asg \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "CustomizedMetricSpecification": {
      "MetricName": "ApproximateNumberOfMessagesVisible",
      "Namespace": "AWS/SQS",
      "Statistic": "Average"
    },
    "TargetValue": 100
  }'
```

{{< /details >}}

---

{{< details summary="Q29. A company needs to migrate 200 on-premises servers to EC2. How do you plan and execute this?" >}}

**Answer:**

**Phase 1 — Discovery and Assessment (Weeks 1–4):**

Use **AWS Application Discovery Service:**
```bash
# Install Discovery Agent on all on-prem servers
# It collects: CPU, memory, disk, network, processes, dependencies
```

Output:
- Server inventory
- Dependency mapping (which servers talk to which)
- Right-sizing recommendations

**Phase 2 — Migration Strategy (7 Rs):**

Assign each server a migration strategy:
| Strategy | When to Use | Tool |
|---|---|---|
| **Rehost (Lift & Shift)** | Most servers (fast, low risk) | AWS MGN |
| **Replatform** | Databases → RDS | DMS |
| **Refactor** | Monolith → microservices | Re-architect |
| **Retire** | Servers no longer needed | Decommission |
| **Retain** | Regulatory, too complex | Keep on-prem |

**Phase 3 — Execution with AWS Application Migration Service (MGN):**

```bash
# Install replication agent on source server
# MGN continuously replicates disk to AWS (sub-second lag)

# Test cutover (no downtime)
aws mgn start-test --instance-ids s-xxxxxxxx

# Final cutover (< 30 minutes downtime)
aws mgn start-cutover --instance-ids s-xxxxxxxx
```

**Migration wave planning (200 servers):**
```
Wave 1 (Week 5-6):   Dev/Test servers (20) — lowest risk
Wave 2 (Week 7-8):   Non-critical production (60)
Wave 3 (Week 9-10):  Business-critical apps (80)
Wave 4 (Week 11-12): Core databases and mainframes (40)
```

**Phase 4 — Database Migration:**
```bash
# Use AWS Database Migration Service (DMS)
aws dms create-replication-task \
  --replication-task-identifier migrate-prod-db \
  --source-endpoint-arn arn:aws:dms:...source \
  --target-endpoint-arn arn:aws:dms:...target \
  --migration-type full-load-and-cdc  # Continuous replication during cutover
```

**Phase 5 — Validation and cutover:**
- Run parallel operations for 2 weeks
- Compare outputs from on-prem and AWS
- Switch DNS when validated
- Keep on-prem as cold backup for 30 days

**Tools summary:**
| Tool | Purpose |
|---|---|
| Application Discovery Service | Inventory and dependency mapping |
| AWS MGN (Migration Service) | Server replication and cutover |
| AWS DMS | Database migration |
| AWS Schema Conversion Tool | Schema translation (Oracle → PostgreSQL) |
| Migration Evaluator | TCO analysis and business case |

{{< /details >}}

---

{{< details summary="Q30. Your compliance team requires: no public IPs on EC2, encrypted EBS volumes, IMDSv2 enforced, and CloudTrail enabled — across 50 AWS accounts. How do you enforce this automatically?" >}}

**Answer:**

**Solution: AWS Organizations + Service Control Policies + AWS Config**

**Step 1 — Prevent launching instances with public IPs (SCP):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicIP",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:network-interface/*",
      "Condition": {
        "Bool": {
          "ec2:AssociatePublicIpAddress": "true"
        }
      }
    }
  ]
}
```

**Step 2 — Require encrypted EBS volumes (SCP):**
```json
{
  "Sid": "DenyUnencryptedVolumes",
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:*:*:volume/*",
  "Condition": {
    "Bool": {
      "ec2:Encrypted": "false"
    }
  }
}
```
Also enable **EBS Encryption by default** via AWS Config automation:
```bash
aws ec2 enable-ebs-encryption-by-default --region us-east-1
```

**Step 3 — Require IMDSv2 (SCP):**
```json
{
  "Sid": "RequireIMDSv2",
  "Effect": "Deny",
  "Action": "ec2:RunInstances",
  "Resource": "arn:aws:ec2:*:*:instance/*",
  "Condition": {
    "StringNotEquals": {
      "ec2:MetadataHttpTokens": "required"
    }
  }
}
```

**Step 4 — Enforce CloudTrail with AWS Config + Remediation:**
```bash
# Config rule to detect if CloudTrail is disabled
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "cloudtrail-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "CLOUD_TRAIL_ENABLED"
    }
  }'

# Auto-remediate with SSM Automation
aws configservice put-remediation-configurations \
  --remediation-configurations '[{
    "ConfigRuleName": "cloudtrail-enabled",
    "TargetType": "SSM_DOCUMENT",
    "TargetId": "AWS-EnableAWSCloudTrail",
    "Automatic": true
  }]'
```

**Step 5 — Deploy across all 50 accounts using CloudFormation StackSets:**
```bash
aws cloudformation create-stack-set \
  --stack-set-name compliance-baseline \
  --template-body file://compliance-stack.yaml \
  --deployment-targets OrganizationalUnitIds=ou-xxxx \
  --regions us-east-1 ap-south-1 eu-west-1
```

**Compliance dashboard:**
- Use **AWS Security Hub** with CIS AWS Foundations Benchmark
- Aggregate findings from all 50 accounts into a central Security Hub account
- Use **AWS Config Aggregator** for a unified compliance view

**Full enforcement stack:**
```
AWS Organizations (root)
├── SCPs — Preventive controls (block non-compliant actions)
├── AWS Config — Detective controls (find violations)
├── Config Remediation — Corrective controls (auto-fix)
├── Security Hub — Aggregated compliance dashboard
└── CloudFormation StackSets — Consistent deployment
```

{{< /details >}}

---

</div>
