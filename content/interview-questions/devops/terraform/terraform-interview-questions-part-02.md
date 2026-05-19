---
title: "Terraform Interview Questions & Answers (2026) Part 02"
description: "45+ Terraform interview questions and answers covering state management, modules, lifecycle, drift detection, and advanced scenarios — Basic to Advanced."
date: 2025-04-26
author: "DB"
tags: ["terraform", "iac", "interview", "devops", "aws"]
tool: "terraform"
level: "All Levels"
question_count: 50
draft: "false"
---

# 🟣 Terraform × ☁️ AWS — Scenario-Based Interview Guide

> **45+ scenario-based questions · Real-world answers · Production patterns · HCL code snippets**


{{< qa num="1" q="Your team is new to Terraform. A colleague asks: What is Terraform and why should we use it over CloudFormation for our AWS infrastructure?" level="basic" >}}

**Answer:**

Terraform is an open-source Infrastructure-as-Code (IaC) tool by HashiCorp that uses **HCL (HashiCorp Configuration Language)** to define and provision infrastructure across any cloud provider.

| Feature | Terraform | CloudFormation |
|---------|-----------|----------------|
| Cloud support | Multi-cloud (AWS, Azure, GCP…) | AWS only |
| Language | HCL (readable, concise) | JSON/YAML (verbose) |
| State management | External state file (flexible) | Managed by AWS |
| Plan before apply | ✅ `terraform plan` | ❌ Change sets (limited) |
| Module ecosystem | Rich Terraform Registry | Nested stacks (complex) |
| Drift detection | ✅ `terraform plan` shows drift | Stack drift detection |

> 💡 **Key difference:** CloudFormation is AWS-only. Terraform is cloud-agnostic — the same patterns work on AWS, Azure, GCP, and 300+ providers simultaneously.

{{< /qa >}}
{{< qa num="2" q="Your manager wants to understand what terraform plan does before you run terraform apply on production AWS." level="basic" >}}
**Answer:**

The Terraform workflow has four key phases:

1. **Write** — Define infrastructure in `.tf` files using HCL
2. **Init** — Download providers and modules
3. **Plan** — Compute and show a diff (create/change/destroy)
4. **Apply** — Execute the plan and update state

```bash
# Step 1: Initialize providers
terraform init

# Step 2: Validate configuration
terraform validate

# Step 3: Preview changes (SAFE — no AWS calls that modify infra)
terraform plan -out=tfplan

# Step 4: Apply the saved plan to AWS
terraform apply tfplan

# Step 5: Destroy infrastructure
terraform destroy
```

> ✅ **Best practice:** Always use `terraform plan -out=tfplan` then `terraform apply tfplan` in production — this ensures exactly what was reviewed gets applied, even if infra changes between plan and apply.

{{< /qa >}}
{{< qa num="3" q="You need to create an EC2 instance and an S3 bucket using Terraform. Write the basic configuration." level="basic" >}}
**Answer:**

```hcl
# main.tf

# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# EC2 Instance
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  tags = {
    Name        = "web-server"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# S3 Bucket
resource "aws_s3_bucket" "app_bucket" {
  bucket = "${var.project_name}-${var.environment}-assets"

  tags = {
    Name        = "app-assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "app_bucket_versioning" {
  bucket = aws_s3_bucket.app_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

```hcl
# variables.tf

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}
```

{{< /qa >}}
{{< qa num="4" q="You need to provision 5 identical EC2 instances. You don't want to copy-paste the same resource block 5 times." level="basic" >}}
**Answer:**

Use **`count`** or **`for_each`** meta-arguments:

```hcl
# count approach
resource "aws_instance" "web" {
  count         = 5
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  tags = {
    Name = "web-server-${count.index + 1}"
  }
}
# Outputs: aws_instance.web[0] … aws_instance.web[4]
```

```hcl
# for_each approach (PREFERRED)
variable "servers" {
  type = map(string)
  default = {
    web-1 = "t3.micro"
    web-2 = "t3.micro"
    api-1 = "t3.small"
  }
}

resource "aws_instance" "servers" {
  for_each      = var.servers
  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value

  tags = { Name = each.key }
}
# Outputs: aws_instance.servers["web-1"], ["web-2"], ["api-1"]
```

> 💡 **Prefer `for_each` over `count`** — if you remove an item from the middle of a count list, Terraform renumbers everything and may destroy/recreate resources. `for_each` uses stable keys.

{{< /qa >}}
{{< qa num="5" q="You need to output the public IP of a created EC2 instance so other teams can use it." level="basic" >}}
**Answer:**

```hcl
# outputs.tf

output "ec2_public_ip" {
  description = "Public IP of the web server"
  value       = aws_instance.web.public_ip
}

output "s3_bucket_name" {
  description = "Name of the S3 asset bucket"
  value       = aws_s3_bucket.app_bucket.bucket
}

output "db_password" {
  description = "RDS password"
  value       = aws_db_instance.rds.password
  sensitive   = true   # Hides from CLI output
}
```

```bash
# View all outputs
terraform output

# Get specific output as raw string (useful in scripts)
terraform output -raw ec2_public_ip

# Get outputs as JSON (for CI/CD pipelines)
terraform output -json
```

{{< /qa >}}
{{< qa num="6" q="You have an RDS instance that was created manually in AWS. You want to bring it under Terraform management without recreating it." level="intermediate" >}}

**Answer:**

Use **`terraform import`** to import existing AWS resources into Terraform state:

```bash
# 1. Write the resource block in your .tf file first
# 2. Import the existing resource into state

terraform import aws_db_instance.mydb my-production-db
terraform import aws_s3_bucket.existing my-existing-bucket-name
terraform import aws_instance.web i-0abcd1234efgh5678
terraform import aws_vpc.main vpc-0a1b2c3d4e5f67890
```

> ⚠️ **After importing**, run `terraform plan` — if it shows changes, your HCL configuration doesn't exactly match the live resource. Adjust until plan shows "No changes."

**Terraform 1.5+ declarative import block:**

```hcl
import {
  to = aws_db_instance.mydb
  id = "my-production-db"
}
```
{{< /qa >}}
{{< qa num="7" q="Deploy a web app with ALB, Auto Scaling Group, and EC2 instances across 3 AZs." level="advanced" >}}
**Answer:**

```hcl
# Launch Template
resource "aws_launch_template" "web" {
  name_prefix   = "web-lt-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.web.id]
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
  EOF
  )
}

# Auto Scaling Group
resource "aws_autoscaling_group" "web" {
  desired_capacity    = 2
  min_size            = 2
  max_size            = 6
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.web.arn]

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-asg"
    propagate_at_launch = true
  }
}

# Application Load Balancer
resource "aws_lb" "web" {
  name               = "web-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "web" {
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.web.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}
```
{{< /qa >}}
{{< qa num="8" q="Provision an RDS PostgreSQL in a private subnet with a read replica. Password must NOT be hardcoded." level="advanced" >}}
**Answer:**

```hcl
# Fetch password from AWS Secrets Manager (never hardcode!)
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "prod/rds/password"
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

# Primary RDS instance
resource "aws_db_instance" "primary" {
  identifier             = "prod-postgres"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.medium"
  allocated_storage      = 100
  storage_encrypted      = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  username               = "dbadmin"
  password               = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)["password"]
  multi_az               = true
  backup_retention_period = 7
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "prod-postgres-final"
}

# Read Replica
resource "aws_db_instance" "replica" {
  identifier          = "prod-postgres-replica"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = "db.t3.small"
  publicly_accessible = false
}
```

> 🚨 **Never** store database passwords in `terraform.tfvars` or hardcode them in HCL. Terraform state stores values in plaintext — always enable encryption on your S3 state backend.

{{< /qa >}}
{{< qa num="9" q="Deploy a Lambda function with API Gateway trigger and IAM permissions to read from DynamoDB." level="advanced" >}}
**Answer:**

```hcl
# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "lambda-exec-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_dynamo" {
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"]
      Resource = aws_dynamodb_table.main.arn
    }]
  })
}

# Lambda Function
resource "aws_lambda_function" "api" {
  filename         = "lambda.zip"
  function_name    = "my-api-handler"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256
  source_code_hash = filebase64sha256("lambda.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.main.name
    }
  }
}

# API Gateway v2 (HTTP API)
resource "aws_apigatewayv2_api" "main" {
  name          = "my-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "apigw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

{{< /qa >}}
{{< qa num="10" q="Your team needs a production EKS cluster with managed node groups in private subnets." level="advanced" >}}
**Answer:**

```hcl
# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster" {
  name = "eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "prod-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = false
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

# Node Group IAM Role
resource "aws_iam_role" "eks_nodes" {
  name = "eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Managed Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main-ng"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = ["t3.medium"]

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }

  update_config {
    max_unavailable = 1
  }
}
```

{{< /qa >}}
{{< qa num="11" q="Deploy a static website on S3 with CloudFront CDN and HTTPS." level="intermediate" >}}
**Answer:**

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "my-static-website-bucket"
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"  # SPA routing
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

{{< /qa >}}
{{< qa num="12" q="Your app needs a Redis caching layer. Provision an ElastiCache Redis cluster in private subnets." level="advanced" >}}
**Answer:**

```hcl
resource "aws_elasticache_subnet_group" "main" {
  name       = "redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "prod-redis"
  description          = "Production Redis cluster"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 2          # Primary + 1 replica
  automatic_failover_enabled = true
  multi_az_enabled     = true
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = { Environment = "prod" }
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}
```

{{< /qa >}}
{{< qa num="13" q="Build an event-driven pipeline where SNS fans out to multiple SQS queues." level="intermediate" >}}
**Answer:**

```hcl
# SNS Topic
resource "aws_sns_topic" "orders" {
  name = "orders-topic"
}

# SQS Queues with Dead Letter Queues
resource "aws_sqs_queue" "orders_dlq" {
  name                      = "orders-dlq"
  message_retention_seconds = 1209600  # 14 days
}

resource "aws_sqs_queue" "orders" {
  name                       = "orders-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })
}

# SNS → SQS subscription
resource "aws_sns_topic_subscription" "orders_sqs" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.orders.arn
}

# SQS policy to allow SNS to send messages
resource "aws_sqs_queue_policy" "orders" {
  queue_url = aws_sqs_queue.orders.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.orders.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.orders.arn }
      }
    }]
  })
}
```

{{< /qa >}}
{{< qa num="14" q="Your team has 3 engineers all running Terraform locally and state files are getting corrupted." level="intermediate" >}}
**Answer:**

Configure a **remote backend** using S3 + DynamoDB for centralized state storage and locking:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "prod/us-east-1/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/abc-123"
  }
}
```

```hcl
# Bootstrap the S3 + DynamoDB backend
resource "aws_s3_bucket" "tf_state" {
  bucket = "my-company-terraform-state"
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "tf_lock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

| Component | Purpose |
|-----------|---------|
| S3 Bucket | Stores `terraform.tfstate` files centrally |
| S3 Versioning | Allows state rollback if something goes wrong |
| S3 Encryption | Encrypts state file at rest (contains sensitive data) |
| DynamoDB Table | Provides state locking — prevents concurrent applies |

{{< /qa >}}
{{< qa num="15" q="A Terraform apply failed halfway and now the state is locked. Your colleague can't run any Terraform commands." level="intermediate" >}}
**Answer:**

```bash
# Check the lock info
terraform force-unlock --help

# Force unlock using the Lock ID from the error message
terraform force-unlock LOCK_ID_FROM_ERROR_MESSAGE

# Or check DynamoDB directly for the lock record
aws dynamodb scan --table-name terraform-state-lock

# Delete the lock record manually if needed
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "my-bucket/prod/terraform.tfstate"}}'
```

> ⚠️ **Warning:** Only force-unlock if you're 100% sure no other `terraform apply` is actually running. Unlocking during a live apply can corrupt your state file.

After unlocking, run `terraform plan` to see the current state. Use `terraform refresh` to sync state with actual AWS resources.

{{< /qa >}}
{{< qa num="16" q="You want to manage dev, staging, and prod environments with the same Terraform code but separate state files." level="intermediate" >}}
**Answer:**

**Option 1 — Terraform Workspaces (simple scenarios):**

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
terraform workspace select dev
terraform apply
```

```hcl
# Use workspace name in resources
locals {
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"
}

resource "aws_instance" "web" {
  instance_type = local.instance_type
  tags = { Environment = terraform.workspace }
}
```

**Option 2 — Directory per environment (recommended for production):**

```
infra/
├── modules/
│   ├── vpc/
│   ├── ec2/
│   └── rds/
├── envs/
│   ├── dev/
│   │   ├── main.tf            # calls modules
│   │   ├── terraform.tfvars   # dev-specific values
│   │   └── backend.tf         # dev state: s3/dev/terraform.tfstate
│   ├── staging/
│   └── prod/
```

> ✅ **For production at scale**, use directory-per-environment. It provides complete isolation, different IAM roles per env, and prevents accidentally applying dev config to prod.

{{< /qa >}}
{{< qa num="17" q="Your networking team manages the VPC. Your app team manages EC2. How do they share subnet IDs?" level="intermediate" >}}
**Answer:**

Use **remote state data sources** to read outputs from another Terraform state file:

```hcl
# networking/outputs.tf — networking team exposes these
output "vpc_id"             { value = aws_vpc.main.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "public_subnet_ids"  { value = aws_subnet.public[*].id }
```

```hcl
# app/main.tf — app team reads networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-company-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id              = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
}
```

> 💡 **Alternative:** Use AWS SSM Parameter Store or `aws_vpc` data sources with tag filters to reduce tight coupling between state files.

{{< /qa >}}
{{< qa num="18" q="Someone accidentally deleted the production state file. How do you recover?" level="advanced" >}}
**Answer:**

```bash
# Step 1: Check S3 versioning for previous state versions
aws s3api list-object-versions \
  --bucket my-company-terraform-state \
  --prefix prod/terraform.tfstate

# Step 2: Restore a previous version
aws s3api get-object \
  --bucket my-company-terraform-state \
  --key prod/terraform.tfstate \
  --version-id "VERSION_ID_HERE" \
  terraform.tfstate.backup

# Step 3: Push the restored state back
terraform state push terraform.tfstate.backup

# Step 4: Verify state is healthy
terraform plan  # Should show no unexpected changes
```

> ✅ **This is why S3 versioning is non-negotiable.** Always enable versioning on your state bucket so you can roll back to any previous state version.

---

## 📦 Modules & Reusability

{{< /qa >}}
{{< qa num="19" q="You have 10 microservices, each needing an ECS service, IAM role, and CloudWatch log group. Copy-pasting Terraform code 10 times is unmanageable." level="intermediate" >}}
**Answer:**

Create a **reusable Terraform module:**

```
modules/
└── ecs-service/
    ├── main.tf         # Resources
    ├── variables.tf    # Input variables
    ├── outputs.tf      # Output values
    └── README.md
```

```hcl
# modules/ecs-service/variables.tf
variable "service_name"       { type = string }
variable "cluster_id"         { type = string }
variable "desired_count"      { type = number; default = 2 }
variable "log_retention_days" { type = number; default = 30 }
```

```hcl
# modules/ecs-service/main.tf
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.service_name}-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}
```

```hcl
# Call the module for each service — using for_each
variable "services" {
  type = map(object({ count = number }))
  default = {
    user-service    = { count = 2 }
    payment-service = { count = 3 }
    order-service   = { count = 2 }
  }
}

module "services" {
  for_each      = var.services
  source        = "./modules/ecs-service"
  service_name  = each.key
  desired_count = each.value.count
  cluster_id    = aws_ecs_cluster.main.id
}
```

{{< /qa >}}
{{< qa num="20" q="You want to use a community VPC module instead of writing one from scratch." level="basic" >}}
**Answer:**

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1"   # Pin to minor version (allows patches)

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false   # One per AZ for HA
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Environment = "prod" }
}

# Use module outputs in other resources
resource "aws_instance" "web" {
  subnet_id              = module.vpc.private_subnets[0]
  vpc_security_group_ids = [aws_security_group.web.id]
}
```

> ⚠️ **Always pin module versions** with `version = "~> 5.1"`. Without a pin, `terraform init -upgrade` might pull a breaking major version change.

{{< /qa >}}
{{< qa num="21" q="Your module needs to deploy resources in a specific AWS region passed by the caller." level="intermediate" >}}
**Answer:**

```hcl
# modules/app/main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}
```

```hcl
# root/main.tf
provider "aws" {
  alias  = "us"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

module "app_us" {
  source      = "./modules/app"
  providers   = { aws = aws.us }
  bucket_name = "my-app-us"
}

module "app_eu" {
  source      = "./modules/app"
  providers   = { aws = aws.eu }
  bucket_name = "my-app-eu"
}
```

{{< /qa >}}
{{< qa num="22" q="Your platform team wants to publish an internal Terraform module that all app teams can use with versioning." level="advanced" >}}
**Answer:**

Use a **Git tag-based versioning** pattern with a private Git registry:

```bash
# Tag your module for versioning
git tag v1.0.0
git push origin v1.0.0

git tag v1.1.0   # Minor feature
git tag v2.0.0   # Breaking change
```

```hcl
# App teams consume from Git with version pinning
module "rds" {
  # GitHub source with specific tag
  source = "git::https://github.com/my-org/terraform-modules.git//rds?ref=v1.1.0"

  db_name        = "myapp"
  instance_class = "db.t3.medium"
}
```

```hcl
# Or use Terraform Cloud/Enterprise private registry
module "rds" {
  source  = "app.terraform.io/my-org/rds/aws"
  version = "~> 1.1"
}
```

{{< /qa >}}
{{< qa num="23" q="A developer hardcoded AWS access keys in a Terraform file and pushed to GitHub." level="advanced" >}}
**Answer:**

**Immediate response:**

1. **Revoke the exposed AWS access keys immediately** via IAM console
2. **Check AWS CloudTrail logs** for any unauthorized usage since the commit
3. **Remove keys from git history:** `git filter-branch` or BFG Repo Cleaner
4. **Force-push to GitHub** and notify all team members to re-clone
5. **Audit all other files** for hardcoded secrets using `trufflehog` or `gitleaks`

**Prevention — use IAM roles instead of access keys:**

```hcl
# provider.tf — NO hardcoded keys!
provider "aws" {
  region = "us-east-1"
  # On EC2/ECS/Lambda: credentials come from instance profile automatically
  # In CI/CD: use OIDC (see Q33)
}
```

```bash
# Scan for secrets in your repo
trufflehog git https://github.com/my-org/my-repo
gitleaks detect --source .
```

> 🚨 **The AWS provider should NEVER have `access_key` or `secret_key` hardcoded.** Add `*.tfvars` and `.env` to `.gitignore`. Use environment variables, AWS profiles, or IAM roles.

{{< /qa >}}
{{< qa num="24" q="Security team requires least-privilege IAM policies. EC2 instance should only read from a specific S3 bucket." level="advanced" >}}
**Answer:**

```hcl
# IAM Role
resource "aws_iam_role" "ec2_s3_reader" {
  name = "ec2-s3-reader"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Least-privilege policy — read from ONE specific bucket only
resource "aws_iam_role_policy" "s3_read" {
  name = "s3-read-specific-bucket"
  role = aws_iam_role.ec2_s3_reader.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.app.arn,
          "${aws_s3_bucket.app.arn}/*"
        ]
      },
      {
        Effect   = "Deny"    # Explicit deny — belt AND suspenders
        Action   = ["s3:DeleteObject", "s3:PutObject"]
        Resource = "*"
      }
    ]
  })
}

# Instance Profile (attaches role to EC2)
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-s3-reader-profile"
  role = aws_iam_role.ec2_s3_reader.name
}

resource "aws_instance" "web" {
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
  # ... other config
}
```

{{< /qa >}}
{{< qa num="25" q="You need to prevent a critical production RDS instance from being accidentally destroyed via terraform destroy." level="intermediate" >}}
**Answer:**

```hcl
resource "aws_db_instance" "production" {
  identifier          = "prod-postgres"
  deletion_protection = true      # AWS-level protection

  lifecycle {
    prevent_destroy = true        # Terraform-level protection
    ignore_changes  = [engine_version, password]
  }
}

# Also protect critical S3 buckets
resource "aws_s3_bucket" "critical_data" {
  bucket = "company-critical-data"

  lifecycle {
    prevent_destroy = true
  }
}

# create_before_destroy: for zero-downtime replacement
resource "aws_security_group" "web" {
  lifecycle {
    create_before_destroy = true
  }
}
```

| Lifecycle Argument | Use Case |
|-------------------|----------|
| `prevent_destroy` | Block any destroy of critical resources |
| `create_before_destroy` | Zero-downtime replacement (new before delete) |
| `ignore_changes` | Ignore drift in specified attributes |
| `replace_triggered_by` | Force replacement when another resource changes |

{{< /qa >}}
{{< qa num="26" q="Your app needs multiple secrets (DB password, API keys, JWT secret). How do you manage them without hardcoding?" level="advanced" >}}
**Answer:**

```hcl
# Approach 1: AWS Secrets Manager
data "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = "prod/myapp/secrets"
}

locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.app_secrets.secret_string)
}

resource "aws_ecs_task_definition" "app" {
  container_definitions = jsonencode([{
    name = "app"
    environment = [
      { name = "DB_PASSWORD", value = local.secrets["db_password"] },
      { name = "API_KEY",     value = local.secrets["api_key"]     }
    ]
  }])
}
```

```hcl
# Approach 2: SSM Parameter Store
data "aws_ssm_parameter" "db_password" {
  name            = "/prod/myapp/db-password"
  with_decryption = true
}

resource "aws_instance" "app" {
  user_data = <<-EOF
    export DB_PASSWORD=${data.aws_ssm_parameter.db_password.value}
  EOF
}
```

{{< /qa >}}
{{< qa num="27" q="Your compliance team requires AWS Config and CloudTrail to be enabled in all accounts." level="advanced" >}}
**Answer:**

```hcl
# CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "prod-cloudtrail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::"]
    }
  }
}

# AWS Config
resource "aws_config_configuration_recorder" "main" {
  name     = "config-recorder"
  role_arn = aws_iam_role.config.arn
  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "config-delivery"
  s3_bucket_name = aws_s3_bucket.config.bucket
  depends_on     = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true
  depends_on = [aws_config_delivery_channel.main]
}
```

{{< /qa >}}
{{< qa num="28" q="Build a production VPC from scratch with public and private subnets, NAT gateways, and an internet gateway." level="advanced" >}}
**Answer:**

```hcl
locals {
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "prod-vpc" }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(local.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "public-${count.index + 1}" }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]
  tags              = { Name = "private-${count.index + 1}" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = length(local.azs)
  domain = "vpc"
}

# NAT Gateways — one per AZ for HA
resource "aws_nat_gateway" "main" {
  count         = length(local.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

# Private Route Tables (one per AZ — routes to respective NAT GW)
resource "aws_route_table" "private" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

{{< /qa >}}
{{< qa num="29" q="ALB accepts internet traffic. App server only accepts from ALB. DB only accepts from App server." level="advanced" >}}
**Answer:**

```hcl
# ALB Security Group — accepts internet
resource "aws_security_group" "alb" {
  name   = "alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

# App Server SG — only from ALB
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]   # Source = ALB only
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

# Database SG — only from App Server
resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]   # Source = App only
  }
}
```

{{< /qa >}}
{{< qa num="30" q="Your app VPC needs to connect to a shared-services VPC that hosts internal tools." level="intermediate" >}}
**Answer:**

```hcl
# VPC Peering Connection
resource "aws_vpc_peering_connection" "app_to_shared" {
  vpc_id      = aws_vpc.app.id
  peer_vpc_id = aws_vpc.shared_services.id
  auto_accept = true    # Works for same-account peering

  tags = { Name = "app-to-shared-services" }
}

# Add routes on BOTH sides
resource "aws_route" "app_to_shared" {
  route_table_id            = aws_route_table.private.id
  destination_cidr_block    = "10.1.0.0/16"  # shared-services CIDR
  vpc_peering_connection_id = aws_vpc_peering_connection.app_to_shared.id
}

resource "aws_route" "shared_to_app" {
  route_table_id            = aws_route_table.shared_private.id
  destination_cidr_block    = "10.0.0.0/16"  # app VPC CIDR
  vpc_peering_connection_id = aws_vpc_peering_connection.app_to_shared.id
}
```

{{< /qa >}}
{{< qa num="31" q="You have 10 VPCs that all need to talk to each other. VPC peering becomes unmanageable (n*(n-1)/2 connections)." level="advanced" >}}
**Answer:**

```hcl
# Transit Gateway — central hub
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Central TGW"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  auto_accept_shared_attachments  = "enable"

  tags = { Name = "central-tgw" }
}

# Attach each VPC to the TGW
resource "aws_ec2_transit_gateway_vpc_attachment" "app" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.app.id
  subnet_ids         = aws_subnet.private[*].id
}

resource "aws_ec2_transit_gateway_vpc_attachment" "shared" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.shared_services.id
  subnet_ids         = aws_subnet.shared_private[*].id
}

# Route traffic to TGW from each VPC
resource "aws_route" "app_to_tgw" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "10.0.0.0/8"  # All internal networks
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

{{< /qa >}}
{{< qa num="32" q="On PRs run terraform plan and post as comment. On merge to main, run terraform apply." level="intermediate" >}}
**Answer:**

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  id-token: write       # Required for OIDC
  contents: read
  pull-requests: write  # To post plan as PR comment

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Authenticate to AWS via OIDC — no access keys!
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-terraform
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan 2>&1 | tee plan.txt

      # Post plan as PR comment
      - name: Comment Plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const plan = require('fs').readFileSync('plan.txt', 'utf8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Terraform Plan\n```\n' + plan.substring(0, 60000) + '\n```'
            })

      # Apply ONLY on merge to main
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve tfplan
```

> ✅ Use **OIDC authentication** instead of storing AWS access keys as GitHub secrets. The IAM role trusts GitHub's identity token, making key rotation unnecessary.

{{< /qa >}}
{{< qa num="33" q="Configure the AWS IAM role that GitHub Actions can assume via OIDC without static access keys." level="advanced" >}}
**Answer:**

```hcl
# GitHub OIDC Provider in AWS
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions_terraform" {
  name = "github-actions-terraform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Only allow from specific repo and branch
          "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_permissions" {
  role       = aws_iam_role.github_actions_terraform.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
  # Use a custom least-privilege policy in real scenarios
}
```

{{< /qa >}}
{{< qa num="34" q="Your organization has separate AWS accounts for dev and prod. How do you manage both from one Terraform pipeline?" level="advanced" >}}
**Answer:**

```hcl
# Use assume_role to deploy into target accounts
provider "aws" {
  alias  = "dev"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

provider "aws" {
  alias  = "prod"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
  }
}

# Deploy to dev account
module "app_dev" {
  source    = "./modules/app"
  providers = { aws = aws.dev }
  env       = "dev"
}

# Deploy to prod account
module "app_prod" {
  source    = "./modules/app"
  providers = { aws = aws.prod }
  env       = "prod"
}
```

{{< /qa >}}
{{< qa num="35" q="You want to enforce quality gates on all Terraform PRs automatically." level="intermediate" >}}
**Answer:**

```yaml
# .github/workflows/tf-quality.yml
name: Terraform Quality Gates

on:
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        # Fails if any .tf file isn't formatted

      - name: Terraform Validate
        run: |
          terraform init -backend=false
          terraform validate

      - name: TFLint
        uses: terraform-linters/setup-tflint@v4
      - run: |
          tflint --init
          tflint --recursive

      - name: Checkov Security Scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          soft_fail: false

      - name: Trivy IaC Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: config
          scan-ref: .
```

{{< /qa >}}
{{< qa num="36" q="Your manager wants to be alerted when someone manually changes AWS resources outside of Terraform." level="advanced" >}}
**Answer:**

```yaml
# .github/workflows/drift-detection.yml
name: Terraform Drift Detection

on:
  schedule:
    - cron: '0 8 * * *'   # Run daily at 8 AM UTC

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-terraform
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3

      - name: Check for drift
        id: plan
        run: |
          terraform init
          terraform plan -detailed-exitcode -out=drift.tfplan
        continue-on-error: true

      - name: Alert on drift
        if: steps.plan.outputs.exitcode == '2'   # 2 = changes detected
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Terraform Drift Detected!',
              body: 'Terraform plan detected infrastructure drift. Check the workflow run for details.',
              labels: ['infrastructure', 'drift']
            })
```



{{< /qa >}}
{{< qa num="37" q="Terraform plan shows it wants to delete and recreate a production EC2 because someone manually changed its instance type in the console." level="advanced" >}}

**Answer:**

You have three options depending on what should be the source of truth:

**Option A — Accept the manual change (update config to match AWS):**
```bash
# Refresh state to see what AWS actually has
terraform refresh

# Update your .tf file instance_type to match live value
# Then verify plan shows no changes
terraform plan
```

**Option B — Revert to Terraform's desired state:**
```bash
# Apply will change instance type back
terraform apply -target=aws_instance.web
```

**Option C — Ignore that attribute going forward:**
```hcl
resource "aws_instance" "web" {
  lifecycle {
    ignore_changes = [instance_type]  # Ops team manages sizing manually
  }
}
```
{{< /qa >}}
{{< qa num="38" q="You get Error: Cycle: aws_security_group.app, aws_security_group.db. What does this mean and how do you fix it?" level="advanced" >}}

**Answer:**

A **cycle error** means two resources depend on each other circularly. Fix by using separate `aws_security_group_rule` resources:

```hcl
# Create SGs WITHOUT inline rules (no circular dependency)
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = aws_vpc.main.id
}

# Add rules AFTER both SGs exist — breaks the cycle
resource "aws_security_group_rule" "app_to_db" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.app.id
  source_security_group_id = aws_security_group.db.id
}

resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
}
```

{{< /qa >}}
{{< qa num="39" q="Terraform plan says it will destroy a resource that was already manually deleted from AWS." level="intermediate" >}}
**Answer:**

```bash
# List all resources tracked in state
terraform state list

# Remove the orphaned resource from state
# (does NOT touch AWS — only removes from .tfstate)
terraform state rm aws_instance.old_server

# Verify it's gone
terraform state list | grep old_server

# Plan should now show no reference to deleted resource
terraform plan
```

| Command | Use Case |
|---------|----------|
| `terraform state rm` | Remove manually deleted resource from state |
| `terraform state mv` | Rename a resource or move it into a module |
| `terraform state show` | View all attributes of a tracked resource |
| `terraform state pull` | Download remote state to local for inspection |
| `terraform state push` | Upload modified state back to remote |

{{< /qa >}}
{{< qa num="40" q="You want to apply changes only to a specific resource without touching the rest of your infrastructure." level="intermediate" >}}
**Answer:**

```bash
# Plan only a specific resource
terraform plan -target=aws_instance.web

# Apply only a specific resource
terraform apply -target=aws_instance.web

# Target multiple resources
terraform apply \
  -target=aws_instance.web \
  -target=aws_security_group.web

# Target a whole module
terraform apply -target=module.vpc

# Destroy only a specific resource
terraform destroy -target=aws_instance.old_server
```

> ⚠️ Use `-target` sparingly — it can leave your state out of sync. Always run a full `terraform plan` after targeted operations.

{{< /qa >}}
{{< qa num="41" q="Terraform apply is failing with a cryptic error. How do you get more detail?" level="basic" >}}
**Answer:**

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform apply

# Log levels: TRACE, DEBUG, INFO, WARN, ERROR
export TF_LOG=TRACE
terraform plan 2> terraform-debug.log

# Log to a file
export TF_LOG_PATH=./terraform.log
export TF_LOG=DEBUG
terraform apply

# Useful debug commands
terraform console                          # Interactive expression evaluation
terraform show                             # Show current state
terraform graph | dot -Tsvg > graph.svg    # Visualize dependency graph
```

```hcl
# Test expressions in terraform console
> aws_instance.web.public_ip
"54.12.34.56"

> [for s in aws_subnet.private : s.id]
["subnet-abc", "subnet-def", "subnet-ghi"]
```

{{< /qa >}}
{{< qa num="42" q="You need a security group with a variable number of ingress rules per environment. Dev needs 3, prod needs 7." level="intermediate" >}}
**Answer:**

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    { port = 80,  cidr_blocks = ["0.0.0.0/0"],   description = "HTTP"          },
    { port = 443, cidr_blocks = ["0.0.0.0/0"],   description = "HTTPS"         },
    { port = 22,  cidr_blocks = ["10.0.0.0/8"], description = "SSH internal"  },
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  # Dynamic block generates one ingress block per rule in the list
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

{{< /qa >}}
{{< qa num="43" q="Your organization has 15 AWS accounts. Managing backends and provider configs is getting unmanageable." level="advanced" >}}
**Answer:**

**Terragrunt** — a thin wrapper that DRYs up repetitive Terraform configuration:

```
infra/
├── terragrunt.hcl             # Root config — auto backend, provider
├── dev/
│   ├── terragrunt.hcl         # Dev account settings
│   ├── vpc/
│   │   └── terragrunt.hcl     # Inherits root + dev config
│   └── eks/
│       └── terragrunt.hcl
├── staging/
└── prod/
    ├── terragrunt.hcl
    └── vpc/
        └── terragrunt.hcl
```

```hcl
# Root terragrunt.hcl — auto-generates backend config per module
remote_state {
  backend = "s3"
  config = {
    bucket         = "tf-state-${local.account_id}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents = <<EOF
provider "aws" {
  region = "${local.aws_region}"
  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformRole"
  }
}
EOF
}
```

```bash
# Run across all environments at once
terragrunt run-all plan    # Plans all modules
terragrunt run-all apply   # Applies all in dependency order
```

{{< /qa >}}
{{< qa num="44" q="Deploy the same infrastructure to us-east-1 and eu-west-1 using the same code." level="advanced" >}}
**Answer:**

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"
}

# Secondary region — aliased
provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

# Deploy in primary (uses default provider)
resource "aws_s3_bucket" "primary" {
  bucket = "my-app-us-east-1"
}

# Deploy in EU — note provider = aws.eu
resource "aws_s3_bucket" "replica" {
  provider = aws.eu
  bucket   = "my-app-eu-west-1"
}

# S3 cross-region replication
resource "aws_s3_bucket_replication_configuration" "replica" {
  bucket = aws_s3_bucket.primary.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"
    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}

# Pass aliased provider into a module
module "app_eu" {
  source    = "./modules/app"
  providers = { aws = aws.eu }
  region    = "eu-west-1"
}
```

{{< /qa >}}
{{< qa num="45" q="What is the difference between terraform taint and terraform apply -replace?" level="intermediate" >}}
**Answer:**

| Command | Terraform Version | What it does |
|---------|-------------------|--------------|
| `terraform taint` | Deprecated in 0.15.2 | Marks resource as "tainted" in state — forces destroy+recreate on next apply |
| `terraform apply -replace` | 0.15.2+ (replacement) | Forces destroy+recreate in a single operation |

```bash
# OLD way (deprecated)
terraform taint aws_instance.web
terraform apply

# NEW way — Terraform 0.15.2+
terraform apply -replace=aws_instance.web

# Replace multiple resources
terraform apply \
  -replace=aws_instance.web \
  -replace=aws_launch_template.web
```

**When to use `-replace`:**
1. EC2 instance is in a bad state and needs a fresh start
2. SSL certificate needs to be rotated (force new cert resource)
3. Instance has configuration drift that can't be fixed in-place
4. Testing replacement behavior for a resource type

---

## 📋 Quick Reference Cheatsheet

### Core Workflow

```bash
terraform init                          # Initialize providers & backend
terraform validate                      # Validate HCL syntax
terraform fmt -recursive                # Format all .tf files
terraform plan -out=plan.tfplan         # Preview changes (save plan)
terraform apply plan.tfplan             # Apply the saved plan
terraform destroy                       # Destroy all resources
```

### State Commands

```bash
terraform state list                    # List all tracked resources
terraform state show aws_instance.web   # Inspect a resource in state
terraform state rm aws_instance.old     # Remove from state (not AWS)
terraform state mv old_name new_name    # Rename resource in state
terraform state pull                    # Download remote state
terraform state push                    # Upload state to remote
terraform refresh                       # Sync state with AWS
```

### Import & Replace

```bash
terraform import aws_s3_bucket.b name   # Import existing resource
terraform apply -replace=aws_instance.x # Force recreate a resource
terraform apply -target=module.vpc      # Apply only specific resource
terraform force-unlock LOCK_ID          # Remove stuck state lock
```

### Workspaces

```bash
terraform workspace list                # List all workspaces
terraform workspace new dev             # Create workspace
terraform workspace select prod         # Switch workspace
terraform workspace show                # Show current workspace
terraform workspace delete dev          # Delete workspace
```

### Debug & Inspect

```bash
terraform console                       # Interactive HCL console
terraform show                          # Show current state
terraform output -json                  # Get outputs as JSON
terraform graph | dot -Tsvg > g.svg     # Dependency graph
TF_LOG=DEBUG terraform plan             # Verbose debug logging
```

### Providers & Versions

```bash
terraform providers                     # List providers in use
terraform providers lock                # Lock provider versions
terraform init -upgrade                 # Upgrade provider versions
terraform version                       # Show Terraform version
```

### Useful Variable Patterns

```hcl
# Default with validation
variable "environment" {
  type    = string
  default = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}

# Complex object variable
variable "instances" {
  type = map(object({
    instance_type = string
    count         = number
  }))
}

# Sensitive variable (hidden from logs)
variable "db_password" {
  type      = string
  sensitive = true
}
```

### Common HCL Functions

```hcl
length(list)                 # Count items
contains(list, value)        # Check if value in list
lookup(map, key, default)    # Map lookup with default
merge(map1, map2)            # Merge maps
flatten(list_of_lists)       # Flatten nested lists
toset(list)                  # Convert list to set (dedup)
jsonencode(object)           # Encode to JSON string
jsondecode(string)           # Decode JSON string
base64encode(string)         # Base64 encode
filebase64sha256("file.zip") # SHA256 hash of file
format("%-10s %s", a, b)     # String formatting
```

{{< /qa >}}

---

## 🎯 Interview Tips

| Topic | What Interviewers Want to Hear |
|-------|-------------------------------|
| **State** | Remote backend (S3+DynamoDB), locking, encryption, versioning |
| **Secrets** | Never hardcode. Use Secrets Manager, SSM, or OIDC |
| **Modules** | DRY code, versioned, well-documented, for_each usage |
| **CI/CD** | OIDC auth, plan on PR, apply on merge, checkov/tflint gates |
| **Environments** | Directory-per-env or workspaces, separate state files |
| **Safety** | `prevent_destroy`, `create_before_destroy`, `plan -out` |
| **Debugging** | `TF_LOG=DEBUG`, `terraform console`, `state commands` |
| **Drift** | Daily plan schedules, `ignore_changes`, `terraform refresh` |

---

*Good luck with your Terraform × AWS interviews! 🟣☁️*
