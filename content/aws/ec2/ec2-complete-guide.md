---
title: "AWS EC2 Complete Guide: Launch, Configure & Secure Instances"
description: "Step-by-step guide to launching EC2 instances, configuring security groups, attaching EBS storage, setting up Auto Scaling, and connecting securely."
date: 2024-01-15
author: "CloudOps Hub"
tags: ["ec2", "aws", "compute", "auto-scaling", "security-groups"]
series: "AWS Fundamentals"
level: "Beginner"
---

## What is Amazon EC2?

Amazon **Elastic Compute Cloud (EC2)** provides resizable virtual servers — called **instances** — in the AWS cloud. Launch in minutes, scale instantly, and pay only for what you use.

{{< callout type="aws" title="AWS Free Tier" >}}
New accounts get **750 hours/month** of `t2.micro` or `t3.micro` free for 12 months — perfect for learning.
{{< /callout >}}

## EC2 Instance Types

| Family | Optimized For | Examples | Use Case |
|--------|--------------|---------|----------|
| **t3/t4g** | Burstable general | t3.micro, t4g.small | Web servers, dev/test |
| **m6i/m7i** | Balanced | m6i.large | App servers, databases |
| **c6i/c7i** | Compute | c6i.2xlarge | HPC, ML training |
| **r6i/r7i** | Memory | r6i.4xlarge | In-memory DBs, SAP |
| **g4dn/g5** | GPU | g4dn.xlarge | ML inference, rendering |
| **i3/i4i** | Storage IOPS | i3.large | NoSQL, data warehousing |

## Step 1: Launch an Instance via AWS CLI

```bash
# Create a key pair
aws ec2 create-key-pair \
  --key-name my-key \
  --query 'KeyMaterial' \
  --output text > my-key.pem
chmod 400 my-key.pem

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WebServer}]' \
  --user-data file://bootstrap.sh
```

## Step 2: Configure Security Groups

Security groups are **stateful virtual firewalls** attached at the instance/ENI level.

```bash
# Create security group
aws ec2 create-security-group \
  --group-name web-sg \
  --description "Web server SG" \
  --vpc-id vpc-xxxxxxxx

# Allow SSH from your IP only
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp --port 22 --cidr ${MY_IP}/32

# Allow HTTP/HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

{{< callout type="warn" title="Never expose SSH to 0.0.0.0/0" >}}
Use **AWS Systems Manager Session Manager** for production instances — no bastion host, no SSH keys, full audit logging.
{{< /callout >}}

## Step 3: Bootstrap with User Data

Run scripts automatically on first boot:

```bash
#!/bin/bash
# bootstrap.sh
set -e
dnf update -y
dnf install -y nginx
systemctl enable --now nginx

# Write a simple page
cat > /usr/share/nginx/html/index.html << 'HTML'
<h1>CloudOps Hub — Running on EC2</h1>
<p>Instance ID: $(TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600") && curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)</p>
HTML
```

## Step 4: Attach EBS Storage

```bash
# Create a 50GB gp3 volume
aws ec2 create-volume \
  --size 50 --volume-type gp3 \
  --availability-zone us-east-1a \
  --iops 3000 --throughput 125

# Attach to instance
aws ec2 attach-volume \
  --volume-id vol-xxxxxxxxx \
  --instance-id i-xxxxxxxxx \
  --device /dev/sdf

# On the instance: format and mount
sudo mkfs -t xfs /dev/nvme1n1
sudo mkdir /data
sudo mount /dev/nvme1n1 /data

# Persist across reboots
echo "UUID=$(blkid -s UUID -o value /dev/nvme1n1)  /data  xfs  defaults,nofail  0  2" | sudo tee -a /etc/fstab
```

## Step 5: Auto Scaling Group

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name webapp-lt \
  --launch-template-data '{
    "ImageId": "ami-0c02fb55956c7d316",
    "InstanceType": "t3.micro",
    "KeyName": "my-key",
    "SecurityGroupIds": ["sg-xxxxxxxxx"],
    "IamInstanceProfile": {"Name": "WebServerRole"},
    "UserData": "'$(base64 -w0 bootstrap.sh)'"
  }'

# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name webapp-asg \
  --launch-template "LaunchTemplateName=webapp-lt,Version=\$Latest" \
  --min-size 2 --max-size 8 --desired-capacity 2 \
  --vpc-zone-identifier "subnet-aaa,subnet-bbb,subnet-ccc" \
  --health-check-type ELB --health-check-grace-period 300

# Add target tracking scaling policy — keep CPU at 60%
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name webapp-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
    "TargetValue": 60.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

{{< callout type="tip" title="Cost Tip: Spot Instances" >}}
Use **Spot Instances** for stateless workloads to save up to 90% vs On-Demand. Configure a mixed instances policy in your ASG: 70% Spot, 30% On-Demand for high availability.
{{< /callout >}}

## Summary

| Topic | Key Takeaway |
|-------|-------------|
| Instance Types | Choose family based on CPU/Memory/Storage ratio needs |
| Security Groups | Stateful — allow only required ports, restrict SSH source |
| User Data | Bootstrap scripts run once at launch as root |
| EBS | Use gp3 by default; provision IOPS only when needed |
| Auto Scaling | Target tracking is simpler and more reliable than step policies |
| Spot Instances | 70-90% savings for fault-tolerant/stateless workloads |
