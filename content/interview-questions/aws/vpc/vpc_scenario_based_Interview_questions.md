---
title: "AWS VPC Scenario Based Interview Questions & Answers (2026)"
description: "14+ VPC scenario based interview questions and answers— Basic to Advanced."
date: 2026-04-09
author: "DB"
tags: ["aws", "vpc", "subnet", "interview", "networking"]
tool: "aws"
level: "All Levels"
question_count: 65
---


## Senior DevOps / Cloud Engineer Edition — Real-World Examples

> Comprehensive AWS VPC scenarios asked at top tech companies.
> Every answer includes architecture diagrams, real CLI commands,
> Terraform code, and production war-story explanations.

---

{{< qa num="1" q="Design a production-grade VPC architecture for a three-tier web application (web, app, database) that is highly available, secure, and scalable. The app handles 100,000 daily users." level="advanced" >}}

**Ans:** 

**Architecture Overview:**

```
Region: us-east-1
VPC CIDR: 10.0.0.0/16  (65,536 IPs)
│
├── Availability Zone A (us-east-1a)
│   ├── Public Subnet A      10.0.0.0/24    (254 IPs)  → ALB, NAT GW, Bastion
│   ├── Private App Subnet A 10.0.10.0/24   (254 IPs)  → EC2/ECS App Servers
│   └── Private DB Subnet A  10.0.20.0/24   (254 IPs)  → RDS Primary, ElastiCache
│
├── Availability Zone B (us-east-1b)
│   ├── Public Subnet B      10.0.1.0/24    (254 IPs)  → ALB, NAT GW
│   ├── Private App Subnet B 10.0.11.0/24   (254 IPs)  → EC2/ECS App Servers
│   └── Private DB Subnet B  10.0.21.0/24   (254 IPs)  → RDS Standby, ElastiCache
│
└── Availability Zone C (us-east-1c)
    ├── Public Subnet C      10.0.2.0/24    (254 IPs)  → ALB
    ├── Private App Subnet C 10.0.12.0/24   (254 IPs)  → EC2/ECS App Servers
    └── Private DB Subnet C  10.0.22.0/24   (254 IPs)  → RDS Read Replica

Internet Gateway (IGW) → attached to VPC
NAT Gateway × 3        → one per AZ (HA)
```

**Traffic Flow:**
```
Internet
    │
    ▼
Internet Gateway (IGW)
    │
    ▼
Application Load Balancer (ALB)  ← in Public Subnets (A, B, C)
    │
    ▼ (HTTP/HTTPS only, port 80/443)
Auto Scaling Group (ASG)         ← in Private App Subnets
    │
    ▼ (port 5432/3306 only)
RDS Multi-AZ / ElastiCache       ← in Private DB Subnets
    │
    ▼ (outbound only via NAT)
NAT Gateway                      ← in Public Subnets
    │
    ▼
Internet (for patches, API calls)
```

**Terraform Implementation:**
```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "prod-vpc"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "prod-igw" }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true   # instances get public IP automatically

  tags = {
    Name = "prod-public-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "public"
    # Required for EKS auto-discovery
    "kubernetes.io/role/elb" = "1"
  }
}

# Private App Subnets
resource "aws_subnet" "private_app" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "prod-private-app-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private-app"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Private DB Subnets
resource "aws_subnet" "private_db" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "prod-private-db-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private-db"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
  tags   = { Name = "prod-nat-eip-${count.index + 1}" }
}

# NAT Gateways (one per AZ for HA)
resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "prod-nat-${data.aws_availability_zones.available.names[count.index]}"
  }
  depends_on = [aws_internet_gateway.main]
}
```

**CIDR Planning Best Practices:**
```
/16  → 65,534 usable IPs — good for large enterprise VPCs
/24  → 254 usable IPs    — good per subnet (AWS reserves 5 per subnet)
/20  → 4,091 usable IPs  — good for large EKS node subnets

AWS reserves 5 IPs per subnet:
  x.x.x.0   → Network address
  x.x.x.1   → VPC router
  x.x.x.2   → DNS server
  x.x.x.3   → Reserved for future use
  x.x.x.255 → Broadcast (not supported, reserved)
```
{{< /qa >}}


{{< qa num="2" q="You are planning a VPC for a company with 5 teams, each needing isolated environments (dev, staging, prod). How do you design the CIDR allocation to avoid overlaps?" level="advanced" >}}

**Ans:** 
**IP Addressing Strategy — Non-overlapping CIDRs:**

```
Organization: 172.16.0.0/12 (AWS recommends RFC 1918 ranges)

Production VPC:  172.16.0.0/16    (65,534 IPs)
Staging VPC:     172.17.0.0/16    (65,534 IPs)
Dev VPC:         172.18.0.0/16    (65,534 IPs)
Shared Svcs VPC: 172.19.0.0/16    (65,534 IPs)
Sandbox VPC:     172.20.0.0/16    (65,534 IPs)

Future expansion:
  172.21.0.0/16 → 172.31.0.0/16  (11 VPCs reserved)
```

**Why non-overlapping matters:**
```
❌ PROBLEM: Two VPCs with same CIDR 10.0.0.0/16 CANNOT be peered
   VPC A: 10.0.0.0/16
   VPC B: 10.0.0.0/16
   → aws ec2 create-vpc-peering-connection → FAILS

✅ SOLUTION: Always plan CIDRs at the org level before creating any VPC
   Document in IPAM (IP Address Management) tool:
   - AWS VPC IP Address Manager (IPAM) service
   - NetBox (open source)
   - Infoblox (enterprise)
```

**Using AWS IPAM:**
```hcl
# Terraform: AWS IPAM for centralized IP management
resource "aws_vpc_ipam" "main" {
  operating_regions {
    region_name = "us-east-1"
  }
  operating_regions {
    region_name = "us-west-2"
  }
}

resource "aws_vpc_ipam_pool" "top_level" {
  address_family = "ipv4"
  ipam_scope_id  = aws_vpc_ipam.main.private_default_scope_id
  locale         = "us-east-1"
}

resource "aws_vpc_ipam_pool_cidr" "top_level" {
  ipam_pool_id = aws_vpc_ipam_pool.top_level.id
  cidr         = "172.16.0.0/12"
}

# Production pool: carved from top-level
resource "aws_vpc_ipam_pool" "prod" {
  address_family      = "ipv4"
  ipam_scope_id       = aws_vpc_ipam.main.private_default_scope_id
  locale              = "us-east-1"
  source_ipam_pool_id = aws_vpc_ipam_pool.top_level.id
}

resource "aws_vpc_ipam_pool_cidr" "prod" {
  ipam_pool_id = aws_vpc_ipam_pool.prod.id
  cidr         = "172.16.0.0/16"
}

# VPC gets CIDR from IPAM automatically
resource "aws_vpc" "prod" {
  ipv4_ipam_pool_id   = aws_vpc_ipam_pool.prod.id
  ipv4_netmask_length = 16
  tags = { Name = "prod-vpc" }
}
```
{{< /qa >}}


{{< qa num="3" q="Explain the difference between a public subnet and a private subnet. An EC2 instance in your private subnet cannot reach the internet. Walk through your debugging process." level="advanced" >}}


**Ans:**

**Public vs Private Subnet — The KEY difference:**
```
Public Subnet:
  ✅ Route table has: 0.0.0.0/0 → Internet Gateway (IGW)
  ✅ Instance has a public/Elastic IP
  → Instance can send/receive traffic to/from internet directly

Private Subnet:
  ✅ Route table has: 0.0.0.0/0 → NAT Gateway (in public subnet)
  ❌ Instance has NO public IP
  → Instance can initiate outbound internet connections (via NAT)
  → Internet CANNOT initiate connections to private instances
```

**Debugging EC2 in private subnet with no internet access:**

```bash
# Step 1: Check from the instance (if you can SSH in)
# SSH via bastion or SSM Session Manager
aws ssm start-session --target i-1234567890abcdef0

# On the instance:
curl -m 5 https://checkip.amazonaws.com   # test internet
ping 8.8.8.8                              # test basic connectivity
curl -m 5 https://s3.amazonaws.com        # test S3 access
traceroute 8.8.8.8                        # trace the path

# Step 2: Check instance subnet
aws ec2 describe-instances \
  --instance-ids i-1234567890abcdef0 \
  --query 'Reservations[0].Instances[0].{SubnetId:SubnetId,VpcId:VpcId,PrivateIP:PrivateIpAddress}'

# Step 3: Check the subnet's route table
SUBNET_ID=subnet-0abc123

aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=${SUBNET_ID}" \
  --query 'RouteTables[0].Routes'
# Look for: { "DestinationCidrBlock": "0.0.0.0/0", "NatGatewayId": "nat-xxx" }
# Missing 0.0.0.0/0 route = NO internet access

# Step 4: If NAT route exists, check NAT Gateway status
NAT_GW_ID=nat-0abc123def456
aws ec2 describe-nat-gateways --nat-gateway-ids $NAT_GW_ID \
  --query 'NatGateways[0].State'
# Must be: "available"
# If "failed" or "deleted" → NAT Gateway is the problem

# Step 5: Check NAT Gateway is in a PUBLIC subnet
aws ec2 describe-nat-gateways --nat-gateway-ids $NAT_GW_ID \
  --query 'NatGateways[0].SubnetId'
# Verify this subnet has route: 0.0.0.0/0 → igw-xxx

# Step 6: Check Security Group — outbound rules
aws ec2 describe-security-groups \
  --group-ids sg-0abc123 \
  --query 'SecurityGroups[0].IpPermissionsEgress'
# Must have: 0.0.0.0/0 port all (or at least port 80/443)

# Step 7: Check NACL — outbound and inbound rules
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=${SUBNET_ID}"
# Check both ingress AND egress rules
# NACLs are stateless — need BOTH directions allowed
# Return traffic uses ephemeral ports 1024-65535

# Common Fix: Add default route to route table
aws ec2 create-route \
  --route-table-id rtb-0abc123 \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-0abc123def456
```

**Route Table Configuration (Terraform):**
```hcl
# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id   # → IGW for public
  }

  tags = { Name = "prod-public-rt" }
}

# Private route tables (one per AZ for AZ-local NAT routing)
resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id  # → NAT GW
  }

  tags = {
    Name = "prod-private-rt-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Associate subnets with route tables
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count          = 3
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

{{< /qa >}}

{{< qa num="4" q=" Your NAT Gateway costs are $800/month. A manager asks you to reduce them. How do you analyze and optimize NAT Gateway costs?" level="advanced" >}}


**Ans:**

**Understanding NAT Gateway pricing:**
```
NAT Gateway costs:
  Hourly charge:     $0.045/hour per NAT GW × 3 AZs × 730 hrs = $98.55/month
  Data processing:   $0.045/GB processed through NAT GW
  Data transfer:     Standard AWS data transfer rates

$800/month breakdown:
  3× NAT GW hourly: ~$99
  Data processing:  ~$701 (= 15,578 GB ≈ 15.6 TB processed!)
```

**Diagnosis — find who is using NAT:**
```bash
# Enable VPC Flow Logs and query with Athena
# Find top talkers going through NAT Gateway

# CloudWatch query for NAT Gateway bytes
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=nat-0abc123 \
  --statistics Sum \
  --period 3600 \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T00:00:00Z

# Flow logs Athena query to find top destinations
SELECT
  dstaddr,
  SUM(bytes) AS total_bytes,
  COUNT(*) AS connections
FROM vpc_flow_logs
WHERE srcaddr LIKE '10.0.%'     -- from private subnets
  AND action = 'ACCEPT'
GROUP BY dstaddr
ORDER BY total_bytes DESC
LIMIT 20;
```

**Common root causes and fixes:**

**Problem 1: EC2 → S3 traffic going through NAT (biggest win)**
```bash
# Traffic: EC2 → NAT Gateway → Internet → S3
# Fix: Use S3 Gateway Endpoint (FREE! No data processing charges)

aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc123 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-0abc123 rtb-0def456 rtb-0ghi789 \
  --vpc-endpoint-type Gateway

# Terraform:
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    [aws_route_table.public.id]
  )

  tags = { Name = "prod-s3-endpoint" }
}
# Result: All S3 traffic bypasses NAT GW → $0 data processing cost
```

**Problem 2: EC2 → DynamoDB through NAT**
```bash
# Same fix: DynamoDB Gateway Endpoint (also FREE)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}
```

**Problem 3: EC2 → other AWS services (CloudWatch, ECR, SSM, etc.) through NAT**
```bash
# Fix: Interface VPC Endpoints for AWS services
# Cost: $0.01/hr per endpoint (much less than NAT data charges for heavy traffic)

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "cloudwatch_logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}
```

**Problem 4: Data transfer between AZs through NAT**
```bash
# EC2 in AZ-A sending data through NAT GW in AZ-B
# Fix: Use AZ-local NAT Gateway routing (each AZ has its own NAT GW)
# Each private subnet route table points to NAT GW in SAME AZ
# Avoids cross-AZ data transfer charges ($0.01/GB)
```

**Cost savings summary:**
```
Before optimization: $800/month
After:
  S3 Gateway Endpoint:    -$300/month (removed NAT S3 traffic)
  DynamoDB Endpoint:      -$150/month
  ECR/CloudWatch Endpoints: -$100/month
  AZ-local NAT routing:    -$50/month
                          ─────────────
  Total savings:           -$600/month
  New cost:                $200/month (75% reduction)
```

{{< /qa >}}


{{< qa num="5" q="What is the difference between Security Groups and NACLs? Give a real scenario where you need both." level="advanced" >}}


**Ans:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY GROUP vs NACL                           │
├───────────────────────────┬─────────────────────────────────────────┤
│     SECURITY GROUP        │           NACL                          │
├───────────────────────────┼─────────────────────────────────────────┤
│ Instance-level firewall   │ Subnet-level firewall                   │
│ Stateful (tracks conn.)   │ Stateless (each direction explicit)     │
│ Allow rules only          │ Allow AND Deny rules                    │
│ All rules evaluated       │ Rules processed in number order         │
│ Applied to ENI            │ Applied to subnet boundary              │
│ Default: deny all inbound │ Default VPC NACL: allow all             │
│ Default: allow all out    │ Custom NACL: deny all (both ways)       │
└───────────────────────────┴─────────────────────────────────────────┘
```

**Real scenario — E-commerce app with compliance requirements:**

```
Scenario: PCI-DSS compliant payment processing
Requirements:
  - Only HTTPS (443) from internet to web tier
  - Only port 8080 from web tier to app tier
  - Only port 5432 (PostgreSQL) from app tier to DB tier
  - BLOCK specific known malicious IPs at subnet boundary
  - Log all traffic for compliance
```

**Security Groups (stateful — instance level):**
```hcl
# Web Tier Security Group
resource "aws_security_group" "web" {
  name        = "prod-web-sg"
  description = "Web tier - ALB to EC2"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP redirect to HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }
}

# App Tier Security Group - only from web tier
resource "aws_security_group" "app" {
  name   = "prod-app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]  # only from web SG!
    description     = "App traffic from web tier only"
  }
}

# DB Tier Security Group - only from app tier
resource "aws_security_group" "db" {
  name   = "prod-db-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]  # only from app SG!
    description     = "PostgreSQL from app tier only"
  }
}
```

**NACLs (stateless — subnet level):**
```hcl
# NACL for public subnet — additional layer + block bad IPs
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # DENY known malicious IPs first (low rule numbers = evaluated first)
  ingress {
    rule_no    = 50
    protocol   = "-1"
    action     = "deny"
    cidr_block = "198.51.100.0/24"   # known malicious CIDR
    from_port  = 0
    to_port    = 0
  }

  # ALLOW HTTPS inbound
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # ALLOW HTTP inbound (for redirect)
  ingress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # ALLOW return traffic (ephemeral ports) — STATELESS so needed!
  ingress {
    rule_no    = 120
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # ALLOW HTTPS outbound (to internet for NAT traffic)
  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # ALLOW return traffic outbound (for responses to clients)
  egress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }
}

# DB Subnet NACL — very restrictive
resource "aws_network_acl" "db" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private_db[*].id

  # Only allow from app subnet CIDR
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.10.0/22"   # app subnet range
    from_port  = 5432
    to_port    = 5432
  }

  # Return traffic to app subnets
  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.10.0/22"
    from_port  = 1024
    to_port    = 65535
  }

  # DENY everything else (implicit, but explicit is better for audits)
  ingress {
    rule_no    = 32766
    protocol   = "-1"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}
```

**When NACL beats Security Group:**
```
1. Block a specific IP range quickly (can't deny with SG)
2. Subnet-level logging boundary
3. Emergency lockdown of entire subnet
4. Defense in depth for compliance (PCI-DSS, HIPAA)
5. Prevent lateral movement between subnets (if SG misconfigured)
```

{{< /qa >}}

{{< qa num="6" q="You need to connect your production VPC to a data analytics VPC so the analytics team can query production databases. Design the VPC peering and explain the limitations." level="advanced" >}}


**Ans:**

**VPC Peering Setup:**
```
Production VPC: 10.0.0.0/16  (us-east-1)
Analytics VPC:  172.16.0.0/16 (us-east-1)

                    VPC Peering Connection
Production VPC ◄────────────────────────► Analytics VPC
10.0.0.0/16                                172.16.0.0/16

Only traffic allowed:
  Analytics EC2 (172.16.x.x) → Prod DB (10.0.20.x) on port 5432
  Return traffic (stateful SG handles this)

Traffic NOT allowed:
  Analytics → Prod App Servers  (not needed)
  Analytics → Internet via Prod NAT  (no transitive routing!)
```

**Step-by-step setup:**
```bash
# Step 1: Create peering connection
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-prod-0abc123 \
  --peer-vpc-id vpc-analytics-0def456 \
  --peer-region us-east-1

# Output: pcx-0abc123def456

# Step 2: Accept the peering request
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-0abc123def456

# Step 3: Add routes in BOTH VPCs

# In Production VPC route tables (DB subnet only):
aws ec2 create-route \
  --route-table-id rtb-prod-db \
  --destination-cidr-block 172.16.0.0/16 \
  --vpc-peering-connection-id pcx-0abc123def456

# In Analytics VPC route tables:
aws ec2 create-route \
  --route-table-id rtb-analytics-private \
  --destination-cidr-block 10.0.20.0/24 \   # only DB subnet!
  --vpc-peering-connection-id pcx-0abc123def456

# Step 4: Update Security Groups
# Prod DB security group — allow analytics VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id sg-prod-db \
  --protocol tcp \
  --port 5432 \
  --cidr 172.16.0.0/16
```

**Terraform:**
```hcl
resource "aws_vpc_peering_connection" "prod_to_analytics" {
  peer_owner_id = data.aws_caller_identity.current.account_id
  peer_vpc_id   = aws_vpc.analytics.id
  vpc_id        = aws_vpc.prod.id
  auto_accept   = true   # only works if same account & region

  tags = {
    Name = "prod-to-analytics-peering"
    Side = "Requester"
  }
}

# Route from Analytics to Prod DB subnet only
resource "aws_route" "analytics_to_prod_db" {
  route_table_id            = aws_route_table.analytics_private.id
  destination_cidr_block    = "10.0.20.0/24"   # Only DB subnet
  vpc_peering_connection_id = aws_vpc_peering_connection.prod_to_analytics.id
}
```

**VPC Peering Limitations (critical for interview):**
```
❌ NO transitive routing:
   VPC-A ─── peered ─── VPC-B ─── peered ─── VPC-C
   VPC-A CANNOT reach VPC-C through VPC-B
   → Solution: Use Transit Gateway for hub-and-spoke

❌ NO overlapping CIDRs:
   VPC-A: 10.0.0.0/16 + VPC-B: 10.0.0.0/16 → CANNOT peer
   → Plan CIDRs before creating VPCs

❌ NO edge-to-edge routing:
   Cannot use VPC peering to route through:
   - Another VPC's VPN connection
   - Another VPC's Internet Gateway
   - Another VPC's NAT Gateway
   - Another VPC's AWS Direct Connect

✅ VPC Peering WORKS for:
   Low-latency, high-bandwidth VPC-to-VPC traffic
   Same or different accounts
   Same or different regions (inter-region peering)
   No bandwidth bottleneck (not a gateway)
```

{{< /qa >}}

{{< qa num="7" q="You have 15 VPCs across 3 AWS accounts that all need to communicate. VPC peering is becoming unmanageable. Design a Transit Gateway solution." level="advanced" >}}


**Ans:**

**The Problem with VPC Peering at scale:**
```
15 VPCs with full mesh peering = n(n-1)/2 = 15×14/2 = 105 peering connections!
Each connection needs:
  - Route table entries in BOTH VPCs
  - Security group rules
  - Independent monitoring

This is unmanageable. Enter Transit Gateway.
```

**Transit Gateway Architecture:**
```
                    ┌──────────────────────────┐
                    │     TRANSIT GATEWAY       │
                    │    (Central Hub)          │
                    │                          │
                    │  Route Table:            │
                    │  10.0.0.0/16 → VPC-Prod  │
                    │  172.16.0.0/16→ VPC-Anl  │
                    │  192.168.0.0/16→VPC-Dev  │
                    │  10.200.0.0/16→On-Prem   │
                    └─────────┬────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  VPC-Production         VPC-Analytics        VPC-Dev
  (10.0.0.0/16)          (172.16.0.0/16)     (192.168.0.0/16)
  Account: Prod           Account: Data        Account: Dev
         │                    │                    │
         ▼                    ▼                    ▼
  TGW Attachment         TGW Attachment       TGW Attachment
  (subnet in each AZ)    (subnet in each AZ)  (subnet in each AZ)
         │
         ▼
  VPN/Direct Connect
  (On-Premises: 10.200.0.0/16)
```

**Terraform Implementation:**
```hcl
# Create Transit Gateway (in shared network account)
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Central TGW for all VPCs"
  amazon_side_asn                 = 64512
  default_route_table_association = "disable"  # we manage route tables manually
  default_route_table_propagation = "disable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"
  multicast_support               = "disable"

  tags = {
    Name        = "org-central-tgw"
    Environment = "shared"
    ManagedBy   = "terraform"
  }
}

# Share TGW with other accounts via RAM
resource "aws_ram_resource_share" "tgw" {
  name                      = "tgw-share"
  allow_external_principals = false   # org accounts only
}

resource "aws_ram_resource_association" "tgw" {
  resource_arn       = aws_ec2_transit_gateway.main.arn
  resource_share_arn = aws_ram_resource_share.tgw.arn
}

# Attach Production VPC to TGW
resource "aws_ec2_transit_gateway_vpc_attachment" "prod" {
  subnet_ids         = aws_subnet.prod_private[*].id  # attach in each AZ
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.prod.id

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = { Name = "prod-vpc-tgw-attachment" }
}

# Custom TGW Route Tables for traffic segmentation
# Prod Route Table — can reach shared services, NOT dev
resource "aws_ec2_transit_gateway_route_table" "prod" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags               = { Name = "prod-tgw-rt" }
}

# Associate prod VPC with prod route table
resource "aws_ec2_transit_gateway_route_table_association" "prod" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.prod.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.prod.id
}

# Static routes in TGW route table
resource "aws_ec2_transit_gateway_route" "prod_to_shared" {
  destination_cidr_block         = "172.16.0.0/16"  # Shared services VPC
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.prod.id
}

# Route in VPC to send traffic through TGW
resource "aws_route" "prod_to_tgw" {
  count                  = length(aws_route_table.prod_private)
  route_table_id         = aws_route_table.prod_private[count.index].id
  destination_cidr_block = "10.200.0.0/8"   # all internal traffic to TGW
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

**Network Segmentation with TGW Route Tables:**
```
TGW Route Table: PROD
  → Can reach: Shared-Services VPC, On-Premises
  → Cannot reach: Dev VPC, Staging VPC

TGW Route Table: DEV
  → Can reach: Shared-Services VPC only
  → Cannot reach: Prod VPC, On-Premises

TGW Route Table: SHARED-SERVICES
  → Can reach: All VPCs (it serves them all)

This enforces: Dev cannot accidentally connect to Prod
Even if someone misconfigures a security group
```


{{< /qa >}}

{{< qa num="8" q="Your EKS pods need to pull images from ECR and write logs to CloudWatch without going through the internet. How do you configure VPC endpoints?" level="advanced" >}}


**Ans:**

**Without endpoints (bad):**
```
Pod → Private Subnet → NAT Gateway → Internet → ECR/CloudWatch
Cost: NAT data processing charges + internet latency
Risk: Traffic leaves AWS network
```

**With endpoints (good):**
```
Pod → Private Subnet → VPC Endpoint → ECR/CloudWatch (stays in AWS network)
Cost: Interface endpoint hourly charge ($0.01/hr/AZ)
Benefit: No NAT cost, lower latency, more secure
```

**Required endpoints for EKS + ECR + CloudWatch:**
```hcl
locals {
  # All endpoints needed for EKS nodes in private subnets
  interface_endpoints = [
    "ecr.api",          # ECR API calls
    "ecr.dkr",          # ECR Docker registry (image pulls)
    "ec2",              # EC2 API for node bootstrap
    "ec2messages",      # SSM Session Manager
    "ssm",              # Systems Manager
    "ssmmessages",      # SSM Session Manager WebSocket
    "logs",             # CloudWatch Logs
    "monitoring",       # CloudWatch Metrics
    "sts",              # Security Token Service (IRSA)
    "elasticloadbalancing", # ALB controller
    "autoscaling",      # Cluster autoscaler
    "xray",             # X-Ray tracing
    "secretsmanager",   # Secrets Manager
    "kms",              # KMS for envelope encryption
  ]
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "vpc-endpoints-sg"
  description = "Allow HTTPS from VPC to endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC CIDR"
  }
}

# Create all interface endpoints
resource "aws_vpc_endpoint" "interface" {
  for_each = toset(local.interface_endpoints)

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true   # Critical: overrides DNS so no code changes needed!

  tags = {
    Name = "prod-endpoint-${each.key}"
  }
}

# Gateway endpoints (FREE — always use these!)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(
    aws_route_table.private[*].id,
    [aws_route_table.public.id]
  )
  tags = { Name = "prod-s3-gateway-endpoint" }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
  tags              = { Name = "prod-dynamodb-gateway-endpoint" }
}
```

**Verify endpoints are working:**
```bash
# From an EC2/pod in private subnet (no internet access):

# Test ECR endpoint
aws ecr get-login-password --region us-east-1
# Should work WITHOUT internet access

# Test S3 endpoint
aws s3 ls s3://my-bucket
# Should work WITHOUT internet access

# Check DNS resolution (should resolve to private IP)
nslookup ecr.api.us-east-1.amazonaws.com
# Should return 10.x.x.x (VPC private IP), not public IP
# If returns public IP: private_dns_enabled = false or DNS issue

# Test CloudWatch Logs
aws logs put-log-events \
  --log-group-name /eks/my-cluster \
  --log-stream-name test-stream \
  --log-events timestamp=$(date +%s000),message="test"
```

{{< /qa >}}

{{< qa num="9" q="Your company needs to connect an on-premises data center to AWS. Compare Site-to-Site VPN vs Direct Connect and design the solution." level="advanced" >}}


**Ans:**

```
┌──────────────────────────────────────────────────────────────────┐
│              VPN vs Direct Connect Comparison                    │
├─────────────────────┬────────────────────────────────────────────┤
│  Site-to-Site VPN   │         AWS Direct Connect                 │
├─────────────────────┼────────────────────────────────────────────┤
│ Over public internet│ Dedicated private fiber connection         │
│ Encrypted (IPsec)   │ Not encrypted by default (add VPN on top) │
│ Up to 1.25 Gbps     │ 1 Gbps to 100 Gbps                        │
│ ~$36/month          │ $200-$2000+/month + port fee               │
│ Setup: hours        │ Setup: weeks to months                     │
│ SLA: none           │ SLA: 99.99% with redundant connections     │
│ Latency: variable   │ Latency: consistent, low                   │
│ Good for: dev/test  │ Good for: production, large data transfer  │
└─────────────────────┴────────────────────────────────────────────┘
```

**Production Recommended: Direct Connect + VPN Backup:**
```
On-Premises DC
      │
      ├──── AWS Direct Connect (primary) ──── Virtual Private Gateway
      │     1 Gbps dedicated fiber               │
      │     BGP routing                          │
      │                                          ▼
      └──── Site-to-Site VPN (backup) ──────── AWS VPC
            over internet                    (10.0.0.0/16)
            IPsec encrypted
            auto-failover via BGP
```

**Site-to-Site VPN Setup:**
```bash
# Step 1: Create Customer Gateway (represents your on-prem VPN device)
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip 203.0.113.10 \    # your on-prem public IP
  --bgp-asn 65000 \
  --tag-specifications 'ResourceType=customer-gateway,Tags=[{Key=Name,Value=corp-dc-cgw}]'

# Step 2: Create Virtual Private Gateway
aws ec2 create-vpn-gateway \
  --type ipsec.1 \
  --amazon-side-asn 64512

# Attach to VPC
aws ec2 attach-vpn-gateway \
  --vpn-gateway-id vgw-0abc123 \
  --vpc-id vpc-0abc123

# Step 3: Create VPN Connection
aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id cgw-0abc123 \
  --vpn-gateway-id vgw-0abc123 \
  --options StaticRoutesOnly=false   # Use BGP for dynamic routing

# Step 4: Download VPN configuration for your device
aws ec2 describe-vpn-connections \
  --vpn-connection-ids vpx-0abc123

# Step 5: Enable route propagation in route tables
aws ec2 enable-vgw-route-propagation \
  --route-table-id rtb-0abc123 \
  --gateway-id vgw-0abc123
# On-prem routes now automatically appear in VPC route table via BGP!
```

**Terraform:**
```hcl
resource "aws_customer_gateway" "on_prem" {
  bgp_asn    = 65000
  ip_address = "203.0.113.10"   # on-prem public IP
  type       = "ipsec.1"
  tags       = { Name = "corp-datacenter-cgw" }
}

resource "aws_vpn_gateway" "main" {
  vpc_id          = aws_vpc.main.id
  amazon_side_asn = 64512
  tags            = { Name = "prod-vgw" }
}

resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.on_prem.id
  type                = "ipsec.1"
  static_routes_only  = false   # BGP

  tags = { Name = "corp-to-aws-vpn" }
}

# Enable BGP route propagation
resource "aws_vpn_gateway_route_propagation" "private" {
  count          = length(aws_route_table.private)
  route_table_id = aws_route_table.private[count.index].id
  vpn_gateway_id = aws_vpn_gateway.main.id
}
```

{{< /qa >}}

{{< qa num="10" q="Your microservices inside the VPC need to discover each other using DNS names. Design the private DNS architecture." level="advanced" >}}


**Ans:**

**VPC DNS fundamentals:**
```
Every VPC has:
  DNS Server IP: VPC CIDR base + 2
  Example: VPC 10.0.0.0/16 → DNS at 10.0.0.2

Default DNS names for EC2:
  Private: ip-10-0-1-100.us-east-1.compute.internal
  Public:  ec2-54-123-45-67.compute-1.amazonaws.com

Required VPC settings for custom DNS:
  enableDnsSupport   = true  (use AWS DNS server)
  enableDnsHostnames = true  (assign DNS hostnames to instances)
```

**Private Hosted Zone for microservices:**
```hcl
# Create private hosted zone for your domain
resource "aws_route53_zone" "internal" {
  name    = "internal.mycompany.com"
  comment = "Private hosted zone for VPC service discovery"

  vpc {
    vpc_id = aws_vpc.main.id
  }

  # Associate with additional VPCs (peered or TGW-connected)
  vpc {
    vpc_id = aws_vpc.staging.id
  }

  tags = { Name = "internal-dns-zone" }
}

# DNS records for services
resource "aws_route53_record" "payment_service" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "payment.internal.mycompany.com"
  type    = "A"

  alias {
    name                   = aws_lb.payment.dns_name
    zone_id                = aws_lb.payment.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "database" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "postgres.internal.mycompany.com"
  type    = "CNAME"
  ttl     = 60
  records = [aws_db_instance.prod.address]
}

# SRV record for service discovery (gRPC/Consul style)
resource "aws_route53_record" "auth_srv" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "_grpc._tcp.auth.internal.mycompany.com"
  type    = "SRV"
  ttl     = 30
  records = ["10 5 50051 auth.internal.mycompany.com"]
}
```

**Route 53 Resolver for hybrid DNS (on-prem ↔ AWS):**
```hcl
# Inbound endpoint: on-prem DNS queries → AWS private zones
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "inbound-from-onprem"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  # Place resolvers in multiple AZs for HA
  ip_address {
    subnet_id = aws_subnet.private_app[0].id
  }
  ip_address {
    subnet_id = aws_subnet.private_app[1].id
  }
}

# Outbound endpoint: AWS → on-prem DNS queries
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "outbound-to-onprem"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.resolver.id]

  ip_address {
    subnet_id = aws_subnet.private_app[0].id
  }
  ip_address {
    subnet_id = aws_subnet.private_app[1].id
  }
}

# Forward on-prem domain queries to on-prem DNS
resource "aws_route53_resolver_rule" "forward_onprem" {
  domain_name          = "corp.mycompany.com"   # on-prem domain
  name                 = "forward-to-onprem-dns"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip {
    ip   = "10.200.1.10"   # on-prem DNS server 1
    port = 53
  }
  target_ip {
    ip   = "10.200.1.11"   # on-prem DNS server 2
    port = 53
  }
}
```

{{< /qa >}}

{{< qa num="11" q="How do you use VPC Flow Logs to investigate a security incident where an EC2 instance might be exfiltrating data?" level="advanced" >}}


**Answer:**

**Enable VPC Flow Logs:**
```hcl
# CloudWatch Logs destination for flow logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flow-logs/${aws_vpc.main.id}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}

resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"   # ACCEPT, REJECT, or ALL
  vpc_id          = aws_vpc.main.id

  # Enhanced format (v3+) includes more fields
  log_format = "$${version} $${account-id} $${interface-id} $${srcaddr} $${dstaddr} $${srcport} $${dstport} $${protocol} $${packets} $${bytes} $${start} $${end} $${action} $${log-status} $${vpc-id} $${subnet-id} $${instance-id} $${tcp-flags} $${type} $${pkt-srcaddr} $${pkt-dstaddr}"

  tags = { Name = "prod-vpc-flow-logs" }
}

# Also send to S3 for Athena querying (better for large-scale analysis)
resource "aws_flow_log" "s3" {
  log_destination_type = "s3"
  log_destination      = "${aws_s3_bucket.flow_logs.arn}/flow-logs/"
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main.id
}
```

**Investigating data exfiltration:**
```bash
# Scenario: Suspicious EC2 instance i-0abc123 sending large amounts of data
# to an external IP at 2 AM

# Query 1: Find all connections from the suspicious instance (CloudWatch Insights)
aws logs start-query \
  --log-group-name "/aws/vpc/flow-logs/vpc-0abc123" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, srcaddr, dstaddr, dstport, bytes, action
    | filter srcaddr = "10.0.10.50"     -- suspicious instance IP
    | filter action = "ACCEPT"
    | sort bytes desc
    | limit 50
  '

# Query 2: Find large outbound data transfers (potential exfiltration)
aws logs start-query \
  --log-group-name "/aws/vpc/flow-logs/vpc-0abc123" \
  --query-string '
    fields @timestamp, srcaddr, dstaddr, bytes, packets
    | filter srcaddr like /^10\.0\./     -- from private subnets
    | filter dstaddr not like /^10\./    -- to external IPs
    | filter dstaddr not like /^172\./
    | filter dstaddr not like /^192\.168\./
    | stats sum(bytes) as totalBytes by dstaddr, srcaddr
    | sort totalBytes desc
    | limit 20
  '

# Query 3: Unusual port activity
aws logs start-query \
  --query-string '
    fields @timestamp, srcaddr, dstaddr, dstport, bytes
    | filter srcaddr = "10.0.10.50"
    | filter dstport not in [80, 443, 53, 123]  -- unusual ports
    | filter action = "ACCEPT"
    | sort @timestamp desc
  '
```

**Athena for large-scale analysis (S3 flow logs):**
```sql
-- Create Athena table for flow logs
CREATE EXTERNAL TABLE IF NOT EXISTS vpc_flow_logs (
  version        int,
  account_id     string,
  interface_id   string,
  srcaddr        string,
  dstaddr        string,
  srcport        int,
  dstport        int,
  protocol       int,
  packets        bigint,
  bytes          bigint,
  start          bigint,
  end            bigint,
  action         string,
  log_status     string,
  vpc_id         string,
  subnet_id      string,
  instance_id    string,
  tcp_flags      int,
  pkt_srcaddr    string,
  pkt_dstaddr    string
)
PARTITIONED BY (year string, month string, day string)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/flow-logs/'
TBLPROPERTIES ("skip.header.line.count"="1");

-- Top 10 external IPs receiving data from prod
SELECT
  dstaddr                          AS external_ip,
  SUM(bytes) / 1073741824.0        AS total_gb,
  COUNT(DISTINCT srcaddr)          AS source_instances,
  MIN(from_unixtime(start))        AS first_seen,
  MAX(from_unixtime(end))          AS last_seen
FROM vpc_flow_logs
WHERE year = '2024' AND month = '01'
  AND action = 'ACCEPT'
  AND srcaddr LIKE '10.%'
  AND dstaddr NOT LIKE '10.%'
  AND dstaddr NOT LIKE '172.16.%'
GROUP BY dstaddr
ORDER BY total_gb DESC
LIMIT 10;

-- Detect port scanning (many different ports to same destination)
SELECT
  srcaddr,
  dstaddr,
  COUNT(DISTINCT dstport) AS unique_ports_scanned,
  MIN(dstport)            AS min_port,
  MAX(dstport)            AS max_port
FROM vpc_flow_logs
WHERE year = '2024' AND month = '01'
GROUP BY srcaddr, dstaddr
HAVING COUNT(DISTINCT dstport) > 50
ORDER BY unique_ports_scanned DESC;
```

{{< /qa >}}

{{< qa num="12" q="Design a network security architecture using AWS Network Firewall to inspect and filter traffic centrally for all VPCs." level="advanced" >}}


**Ans:**

**Centralized Inspection Architecture:**
```
Internet
    │
    ▼
Internet Gateway (IGW)
    │
    ▼
┌──────────────────────────────────────┐
│         INSPECTION VPC               │
│         10.100.0.0/16               │
│                                      │
│  Public Subnet (ALB/NLB)             │
│      │                               │
│      ▼                               │
│  AWS Network Firewall                │
│  (stateful + stateless rules)        │
│  - Block malicious IPs               │
│  - Deep packet inspection            │
│  - TLS inspection                    │
│  - Domain filtering                  │
│      │                               │
│      ▼                               │
│  Private Subnet (Firewall Endpoints) │
└──────────────────┬───────────────────┘
                   │
                   ▼ (via Transit Gateway)
         ┌─────────┼──────────┐
         ▼         ▼          ▼
    Prod VPC   Staging VPC  Dev VPC
```

```hcl
# Network Firewall Rule Group — stateless (fast path)
resource "aws_networkfirewall_rule_group" "block_bad_ips" {
  capacity = 100
  name     = "block-known-malicious-ips"
  type     = "STATELESS"

  rule_group {
    rules_source {
      stateless_rules_and_custom_actions {
        stateless_rule {
          priority = 1
          rule_definition {
            actions = ["aws:drop"]
            match_attributes {
              sources {
                address_definition = "198.51.100.0/24"   # known bad
              }
              sources {
                address_definition = "203.0.113.0/24"
              }
            }
          }
        }
      }
    }
  }
}

# Stateful rule group — domain filtering
resource "aws_networkfirewall_rule_group" "domain_filter" {
  capacity = 100
  name     = "allow-approved-domains"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      rules_source_list {
        generated_rules_type = "DENYLIST"
        target_types         = ["HTTP_HOST", "TLS_SNI"]
        targets = [
          "malware-distribution.com",
          "crypto-miner.net",
          ".onion",
        ]
      }
    }
  }
}

# Stateful rule — block SSH from internet
resource "aws_networkfirewall_rule_group" "block_ssh" {
  capacity = 50
  name     = "block-inbound-ssh-rdp"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      stateful_rule {
        action = "DROP"
        header {
          destination      = "ANY"
          destination_port = "22"
          direction        = "ANY"
          protocol         = "TCP"
          source           = "ANY"
          source_port      = "ANY"
        }
        rule_option {
          keyword  = "sid"
          settings = ["1"]
        }
      }
    }
  }
}

# Firewall Policy
resource "aws_networkfirewall_firewall_policy" "main" {
  name = "central-firewall-policy"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    stateless_rule_group_reference {
      priority     = 1
      resource_arn = aws_networkfirewall_rule_group.block_bad_ips.arn
    }

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.domain_filter.arn
    }

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.block_ssh.arn
    }
  }
}

# Network Firewall
resource "aws_networkfirewall_firewall" "main" {
  name                = "central-network-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.main.arn
  vpc_id              = aws_vpc.inspection.id

  subnet_mapping {
    subnet_id = aws_subnet.inspection_a.id
  }
  subnet_mapping {
    subnet_id = aws_subnet.inspection_b.id
  }

  firewall_policy_change_protection = true   # prevent accidental changes
  subnet_change_protection          = true
}
```

{{< /qa >}}

{{< qa num="13" q="Design a multi-region active-active architecture with failover. How do you handle networking for traffic routing and database replication?" level="advanced" >}}


**Ans:**

**Multi-Region Active-Active Architecture:**
```
Global
  │
  ▼
AWS Global Accelerator (anycast IPs: 75.2.x.x, 99.83.x.x)
  │              Routing: latency-based to nearest healthy region
  ├──────────────────────────────────────────────────────────┐
  ▼                                                          ▼
Region: us-east-1                                  Region: eu-west-1
┌─────────────────────────┐              ┌─────────────────────────┐
│  VPC: 10.0.0.0/16       │              │  VPC: 10.1.0.0/16       │
│                         │              │                         │
│  ALB (internet-facing)  │              │  ALB (internet-facing)  │
│  ↓                      │              │  ↓                      │
│  ECS/EKS (3 AZs)        │◄─────────── │  ECS/EKS (3 AZs)        │
│  ↓                      │  VPC Peering │  ↓                      │
│  Aurora Global Primary  │─────────────►│  Aurora Global Replica  │
│  (read + write)         │   < 1s lag   │  (can be promoted)      │
│  ↓                      │              │  ↓                      │
│  ElastiCache Primary    │              │  ElastiCache Replica    │
└─────────────────────────┘              └─────────────────────────┘
```

**Inter-Region VPC Peering setup:**
```hcl
# Peering connection between us-east-1 and eu-west-1
resource "aws_vpc_peering_connection" "us_to_eu" {
  provider      = aws.us-east-1
  vpc_id        = aws_vpc.us_east.id
  peer_vpc_id   = aws_vpc.eu_west.id
  peer_region   = "eu-west-1"   # Cross-region peering
  auto_accept   = false         # Must accept in peer region

  tags = { Name = "us-east-1-to-eu-west-1" }
}

# Accept peering in eu-west-1
resource "aws_vpc_peering_connection_accepter" "eu_accept" {
  provider                  = aws.eu-west-1
  vpc_peering_connection_id = aws_vpc_peering_connection.us_to_eu.id
  auto_accept               = true
}

# Routes in US for EU traffic
resource "aws_route" "us_to_eu" {
  provider                  = aws.us-east-1
  count                     = length(aws_route_table.us_private)
  route_table_id            = aws_route_table.us_private[count.index].id
  destination_cidr_block    = "10.1.0.0/16"   # EU VPC CIDR
  vpc_peering_connection_id = aws_vpc_peering_connection.us_to_eu.id
}

# Global Accelerator for anycast routing
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "my-app-global-accelerator"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"
  port_range {
    from_port = 443
    to_port   = 443
  }
}

resource "aws_globalaccelerator_endpoint_group" "us_east" {
  listener_arn                  = aws_globalaccelerator_listener.https.id
  endpoint_group_region         = "us-east-1"
  traffic_dial_percentage       = 50
  health_check_path             = "/health"
  health_check_protocol         = "HTTPS"
  health_check_interval_seconds = 10
  threshold_count               = 3

  endpoint_configuration {
    endpoint_id                    = aws_lb.us_alb.arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }
}
```

---

{{< /qa >}}

{{< qa num="14" q="An EC2 instance in a private subnet cannot connect to an RDS instance in the same VPC. Walk through your complete troubleshooting methodology." level="advanced" >}}


**Ans:**

**Systematic Troubleshooting Framework:**

```
Layer 7 (Application): Can the app connect?
Layer 4 (Transport):   Is TCP port open? (telnet/nc)
Layer 3 (Network):     Can packets reach the destination? (ping)
Layer 2/1 (Physical):  Is the instance running? Route table correct?
```

```bash
# STEP 1: Verify both instances are running and in correct subnets
aws ec2 describe-instances \
  --instance-ids i-app-1234 i-rds-endpoint \
  --query 'Reservations[*].Instances[*].{ID:InstanceId,State:State.Name,Subnet:SubnetId,IP:PrivateIpAddress}'

# STEP 2: Get RDS endpoint and check status
aws rds describe-db-instances \
  --db-instance-identifier prod-postgres \
  --query 'DBInstances[0].{Endpoint:Endpoint.Address,Port:Endpoint.Port,Status:DBInstanceStatus,VPC:DBSubnetGroup.VpcId}'

# STEP 3: Test connectivity from EC2 (via SSM)
aws ssm start-session --target i-app-1234

# On EC2 instance:
# Test DNS resolution
nslookup prod-postgres.abcdef.us-east-1.rds.amazonaws.com

# Test TCP connectivity (not just ping — RDS blocks ICMP)
nc -zv prod-postgres.abcdef.us-east-1.rds.amazonaws.com 5432
# Expected: Connection to ... 5432 port [tcp/postgresql] succeeded!
# Got: Connection refused / timeout?

# STEP 4: Check Security Groups

# EC2 security group — does it have outbound to port 5432?
aws ec2 describe-security-groups \
  --group-ids sg-app-0abc123 \
  --query 'SecurityGroups[0].IpPermissionsEgress'
# Must allow: port 5432 to RDS SG or subnet CIDR

# RDS security group — does it allow from EC2 SG?
aws ec2 describe-security-groups \
  --group-ids sg-rds-0def456 \
  --query 'SecurityGroups[0].IpPermissions'
# Look for: port 5432 from EC2 SG ID or EC2 CIDR

# STEP 5: Check route tables for both subnets
# App subnet route table
APP_SUBNET=subnet-0abc123
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=${APP_SUBNET}" \
  --query 'RouteTables[0].Routes'

# DB subnet route table
DB_SUBNET=subnet-0def456
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=${DB_SUBNET}" \
  --query 'RouteTables[0].Routes'
# Both should have local route: 10.0.0.0/16 → local ✅
# (traffic within VPC doesn't need any special route)

# STEP 6: Check NACLs on both subnets
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=${APP_SUBNET}"

aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=${DB_SUBNET}"
# DB subnet NACL must:
#   INBOUND: allow port 5432 from app subnet CIDR
#   OUTBOUND: allow ephemeral ports 1024-65535 to app subnet CIDR

# STEP 7: Use VPC Reachability Analyzer (automates all above checks)
aws ec2 create-network-insights-path \
  --source i-app-1234 \
  --destination <rds-eni-id> \
  --protocol TCP \
  --destination-port 5432

aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-0abc123

# Wait and get results
aws ec2 describe-network-insights-analyses \
  --network-insights-analysis-ids nia-0abc123 \
  --query 'NetworkInsightsAnalyses[0].{Status:Status,Reachable:NetworkPathFound,Explanations:Explanations}'
# Returns: exact reason if unreachable (e.g., "SG rule missing")

# STEP 8: Common fixes
# Fix A: Add inbound rule to RDS SG
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-0def456 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-app-0abc123

# Fix B: Add outbound rule to App SG
aws ec2 authorize-security-group-egress \
  --group-id sg-app-0abc123 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-rds-0def456

# Fix C: Fix NACL — add rule allowing return traffic
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0abc123 \
  --ingress \
  --rule-number 200 \
  --protocol tcp \
  --rule-action allow \
  --cidr-block 10.0.10.0/24 \
  --port-range From=5432,To=5432
```

{{< /qa >}}

{{< qa num="15" q="Your application is experiencing intermittent network timeouts. VPC Flow Logs show REJECT entries. How do you diagnose the security group rules causing this?" level="advanced" >}}


**Answer:**

```bash
# Flow log REJECT entries look like:
# 2 123456789012 eni-0abc123 10.0.1.50 10.0.20.100 54321 5432 6 5 320 ... REJECT OK
# Meaning: TCP from 10.0.1.50:54321 to 10.0.20.100:5432 was REJECTED

# Step 1: Query rejected traffic in CloudWatch Insights
aws logs start-query \
  --log-group-name "/aws/vpc/flow-logs/vpc-0abc123" \
  --query-string '
    fields @timestamp, srcaddr, srcport, dstaddr, dstport, protocol, bytes, action
    | filter action = "REJECT"
    | filter dstaddr = "10.0.20.100"    -- RDS IP
    | sort @timestamp desc
    | limit 50
  '

# Step 2: Identify the ENI from rejected traffic
# Flow logs include interface-id field
# Map ENI to resource:
aws ec2 describe-network-interfaces \
  --filters "Name=private-ip-address,Values=10.0.20.100" \
  --query 'NetworkInterfaces[0].{ENI:NetworkInterfaceId,SG:Groups,Instance:Attachment.InstanceId}'

# Step 3: Find which security group is rejecting
# REJECT in flow logs = SG or NACL denying the traffic
# Since SGs are stateful and NACLs are stateless:

# Check if it's an ephemeral port issue (NACL)
# Ephemeral ports: 1024-65535 (Linux) / 49152-65535 (Windows)
# If REJECT is on high port numbers → NACL is blocking return traffic

# Step 4: Systematic SG audit
# List all SGs attached to the RDS ENI
aws ec2 describe-network-interfaces \
  --filters "Name=private-ip-address,Values=10.0.20.100" \
  --query 'NetworkInterfaces[0].Groups'

# For each SG, check inbound rules
for SG_ID in sg-0abc123 sg-0def456; do
  echo "=== $SG_ID ==="
  aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --query 'SecurityGroups[0].IpPermissions[?FromPort<=`5432` && ToPort>=`5432`]'
done

# Step 5: Use AWS Security Group Analyzer
# Check Security Hub findings for overly permissive or restrictive rules
aws securityhub get-findings \
  --filters '{"Type": [{"Value": "Software and Configuration Checks/Industry and Regulatory Standards", "Comparison": "PREFIX"}]}'
```

{{< /qa >}}

{{< qa num="16" q="What is AWS PrivateLink and how do you use it to expose a service to other VPCs without VPC peering?" level="advanced" >}}


**Ans:**

**PrivateLink vs VPC Peering:**
```
VPC Peering:
  ✅ Full network access between VPCs
  ❌ Risk: can access unintended resources
  ❌ Overlapping CIDRs not supported
  ❌ Transitive routing not supported

PrivateLink (VPC Endpoint Service):
  ✅ Expose ONLY a specific service/port
  ✅ Works with overlapping CIDRs (no routing change)
  ✅ Consumer VPC has no visibility into provider VPC
  ✅ Scales to thousands of consumers
  ✅ Cross-account, cross-region
```

**Creating a PrivateLink service (provider side):**
```hcl
# Provider VPC: Service that others want to consume
# Example: Payment Service API that 10 teams need to access

# Step 1: NLB in provider VPC (PrivateLink requires NLB, not ALB)
resource "aws_lb" "payment_nlb" {
  name               = "payment-service-nlb"
  internal           = true   # internal NLB for PrivateLink
  load_balancer_type = "network"
  subnets            = aws_subnet.provider_private[*].id
}

resource "aws_lb_listener" "payment" {
  load_balancer_arn = aws_lb.payment_nlb.arn
  port              = 443
  protocol          = "TLS"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.payment.arn
  }
}

# Step 2: Create VPC Endpoint Service
resource "aws_vpc_endpoint_service" "payment" {
  acceptance_required        = true    # manually approve each consumer
  network_load_balancer_arns = [aws_lb.payment_nlb.arn]

  # Allow specific AWS accounts to connect
  allowed_principals = [
    "arn:aws:iam::111122223333:root",   # team-A account
    "arn:aws:iam::444455556666:root",   # team-B account
  ]

  tags = {
    Name = "payment-service-endpoint"
  }
}

output "endpoint_service_name" {
  value = aws_vpc_endpoint_service.payment.service_name
  # e.g., com.amazonaws.vpce.us-east-1.vpce-svc-0abc123
}
```

**Consuming the PrivateLink service (consumer side):**
```hcl
# Consumer VPC: Any team that needs payment service
resource "aws_vpc_endpoint" "payment" {
  vpc_id              = aws_vpc.consumer.id
  service_name        = "com.amazonaws.vpce.us-east-1.vpce-svc-0abc123"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.consumer_private[*].id
  security_group_ids  = [aws_security_group.payment_endpoint.id]
  private_dns_enabled = true

  tags = { Name = "payment-service-endpoint" }
}

# DNS record for the endpoint (optional, for friendly names)
resource "aws_route53_record" "payment" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "payment-api.internal.mycompany.com"
  type    = "A"

  alias {
    name                   = aws_vpc_endpoint.payment.dns_entry[0].dns_name
    zone_id                = aws_vpc_endpoint.payment.dns_entry[0].hosted_zone_id
    evaluate_target_health = true
  }
}
```

{{< /qa >}}

{{< qa num="17" q="Explain IPv6 in VPC and when would you enable it. What changes in your architecture?" level="advanced" >}}


**Ans:**

```bash
# Enable IPv6 on existing VPC
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-0abc123 \
  --amazon-provided-ipv6-cidr-block
# AWS assigns a /56 block like: 2600:1f18:1234:5600::/56

# Assign /64 to each subnet (required for IPv6 subnets)
aws ec2 associate-subnet-cidr-block \
  --subnet-id subnet-0abc123 \
  --ipv6-cidr-block 2600:1f18:1234:5600::/64

# Key difference: IPv6 subnets are all "public" by default
# Use Egress-Only Internet Gateway for outbound-only IPv6
resource "aws_egress_only_internet_gateway" "ipv6" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "prod-eigw" }
}

# Route IPv6 outbound through EIGW (like NAT for IPv6)
resource "aws_route" "ipv6_egress" {
  route_table_id              = aws_route_table.private.id
  destination_ipv6_cidr_block = "::/0"
  egress_only_gateway_id      = aws_egress_only_internet_gateway.ipv6.id
}
```

**When to enable IPv6:**
```
✅ EKS clusters (Kubernetes assigns pod IPs from VPC — exhausts IPv4 quickly)
✅ IoT applications (billions of devices)
✅ CDN/edge applications (lower latency with native IPv6)
✅ Cost optimization (no NAT Gateway needed for IPv6 outbound)

⚠️  IPv6 considerations:
  - All IPv6 addresses are publicly routable (no private range concept)
  - Use security groups and NACLs to control access (not obscurity)
  - Not all AWS services support IPv6 (check compatibility)
  - On-prem must also support IPv6 for hybrid connectivity
```

{{< /qa >}}

{{< qa num="18" q="Your EKS cluster is running out of IP addresses. The VPC CIDR is too small. How do you solve this without re-creating the VPC?" level="advanced" >}}


**Ans:**

**The Problem:**
```
VPC CIDR: 10.0.0.0/16 = 65,536 IPs
EKS Node: each pod gets a VPC IP (aws-node CNI)
100 nodes × 30 pods = 3,000 pod IPs
EKS node ENIs also consume IPs
→ Can hit limits with medium-sized clusters!
```

**Solution 1: Add secondary CIDR to existing VPC**
```bash
# Add secondary CIDR block (no downtime!)
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-0abc123 \
  --cidr-block 100.64.0.0/16   # RFC 6598 shared address space, great for pods

# Create new subnets from secondary CIDR
aws ec2 create-subnet \
  --vpc-id vpc-0abc123 \
  --cidr-block 100.64.0.0/18 \
  --availability-zone us-east-1a

# Update EKS to use new subnets for pods
aws eks update-addon --cluster-name prod-cluster \
  --addon-name vpc-cni \
  --configuration-values '{"env":{"AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG":"true"}}'
```

**Solution 2: VPC CNI Custom Networking (pods use different CIDR)**
```yaml
# ENIConfig for each AZ — pods use secondary CIDR
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-east-1a
spec:
  securityGroups:
  - sg-0abc123   # pod security group
  subnet: subnet-100-64-0-0   # secondary CIDR subnet in AZ-a
---
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-east-1b
spec:
  securityGroups:
  - sg-0abc123
  subnet: subnet-100-64-64-0  # secondary CIDR subnet in AZ-b
```

**Solution 3: Use prefix delegation (most IPs per node)**
```bash
# Each node ENI gets a /28 prefix (16 IPs) instead of single IPs
# Dramatically increases pods per node
aws eks update-addon --cluster-name prod-cluster \
  --addon-name vpc-cni \
  --configuration-values '{
    "env": {
      "ENABLE_PREFIX_DELEGATION": "true",
      "WARM_PREFIX_TARGET": "1"
    }
  }'

# With prefix delegation:
# m5.xlarge: 3 ENIs × 14 prefixes × 16 IPs = 672 pod IPs
# vs without: 3 ENIs × 14 IPs = 42 pod IPs
# 16x improvement!
```

---

## 💡 Quick Reference: VPC Cheat Sheet

```bash
# ─── VPC INSPECTION ──────────────────────────────────────────────────────────
# List all VPCs with CIDRs
aws ec2 describe-vpcs --query 'Vpcs[*].{ID:VpcId,CIDR:CidrBlock,Name:Tags[?Key==`Name`].Value|[0]}'

# List subnets in a VPC
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0abc123" \
  --query 'Subnets[*].{ID:SubnetId,AZ:AvailabilityZone,CIDR:CidrBlock,Public:MapPublicIpOnLaunch}'

# Show route tables for a VPC
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-0abc123" \
  --query 'RouteTables[*].{ID:RouteTableId,Routes:Routes}'

# ─── CONNECTIVITY TESTING ────────────────────────────────────────────────────
# Test TCP port connectivity
nc -zv 10.0.20.100 5432   # netcat
telnet 10.0.20.100 5432    # telnet

# Test with curl (HTTP)
curl -v --connect-timeout 5 http://10.0.10.50:8080/health

# Trace network path
traceroute -T -p 443 google.com   # TCP traceroute (bypasses ICMP blocks)
mtr --report 8.8.8.8             # continuous traceroute

# ─── SECURITY GROUP MANAGEMENT ───────────────────────────────────────────────
# List all SGs with their rules
aws ec2 describe-security-groups \
  --query 'SecurityGroups[*].{ID:GroupId,Name:GroupName,Inbound:IpPermissions}'

# Find SGs with 0.0.0.0/0 inbound
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].{ID:GroupId,Name:GroupName}'

# ─── NAT GATEWAY ─────────────────────────────────────────────────────────────
# Check NAT Gateway status and IP
aws ec2 describe-nat-gateways \
  --query 'NatGateways[*].{ID:NatGatewayId,State:State,PublicIP:NatGatewayAddresses[0].PublicIp,Subnet:SubnetId}'

# ─── VPC ENDPOINTS ───────────────────────────────────────────────────────────
# List all VPC endpoints
aws ec2 describe-vpc-endpoints \
  --query 'VpcEndpoints[*].{ID:VpcEndpointId,Service:ServiceName,Type:VpcEndpointType,State:State}'

# ─── FLOW LOGS ───────────────────────────────────────────────────────────────
# Check flow log status
aws ec2 describe-flow-logs \
  --query 'FlowLogs[*].{ID:FlowLogId,Resource:ResourceId,Status:FlowLogStatus,Destination:LogDestination}'

# ─── REACHABILITY ANALYZER ───────────────────────────────────────────────────
# Automated connectivity troubleshooting
aws ec2 create-network-insights-path \
  --source i-source \
  --destination i-destination \
  --protocol TCP \
  --destination-port 443

aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-0abc123
```

---

## 🔧 Terraform VPC Module Best Practices

```hcl
# Complete production VPC module usage
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "prod-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  public_subnets   = ["10.0.0.0/24",  "10.0.1.0/24",  "10.0.2.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]

  # HA NAT Gateway — one per AZ
  enable_nat_gateway     = true
  single_nat_gateway     = false  # ❌ don't use single NAT in prod
  one_nat_gateway_per_az = true   # ✅ HA: one per AZ

  # DNS
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPN
  enable_vpn_gateway = true

  # Tags for EKS auto-discovery
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  # Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Owner       = "platform-team"
  }
}
```
{{< /qa >}}


