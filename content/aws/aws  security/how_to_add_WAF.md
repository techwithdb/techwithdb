---
title: "How to add WAF to AWS Services"
description: ""
date: 2025-01-20
author: "DB"
tags: ["aws", "ec2", "interview", "certification"]
tool: "WAF"
level: "All Levels"
---


## How to Add WAF to a Load Balancer (ALB)

### Step 1: Create a Web ACL

1. Open **AWS Console → WAF & Shield**
2. Choose **Web ACLs** → **Create web ACL**
3. Configure:
   - **Name:** `my-alb-waf`
   - **Resource type:** `Regional resources` *(for ALB)*
   - **Region:** Select your ALB's region (e.g., `ap-south-1`)
4. Click **Next**

---

### Step 2: Add Rules to the Web ACL

1. Click **Add rules** → **Add managed rule groups**
2. Enable recommended groups:
   - ✅ `AWSManagedRulesCommonRuleSet`
   - ✅ `AWSManagedRulesSQLiRuleSet`
   - ✅ `AWSManagedRulesAmazonIpReputationList`
3. Add a **Rate-based rule** (optional):
   - Name: `RateLimitPerIP`
   - Rate limit: `2000` requests per 5 minutes
   - Aggregate key: `Source IP`
   - Action: `Block`
4. Set **rule priority** (drag to reorder, or set numeric priority)
5. Set **default action:** `Allow`
6. Click **Next** → **Next** → **Create web ACL**

---

### Step 3: Associate Web ACL with ALB

**Option A: During Web ACL creation**
- On the "Associate AWS resources" step, click **Add AWS resources**
- Select **Application Load Balancer**
- Choose your ALB from the list
- Click **Add**

**Option B: After Web ACL creation**
1. Go to **WAF & Shield → Web ACLs**
2. Click your Web ACL
3. Go to **Associated AWS resources** tab
4. Click **Add AWS resources**
5. Select your ALB → **Add**

**Option C: From the ALB console**
1. Go to **EC2 → Load Balancers**
2. Select your ALB
3. **Attributes** tab → **Web Application Firewall (WAF)**
4. Select your Web ACL → **Save changes**

---

### Step 4: Enable Logging

1. In your Web ACL, go to **Logging and metrics** tab
2. Click **Enable logging**
3. Choose destination:
   - **S3 bucket** — for long-term storage (bucket name must start with `aws-waf-logs-`)
   - **CloudWatch Logs** — for real-time monitoring
   - **Kinesis Data Firehose** — for streaming to S3/Splunk/etc.
4. Optionally, add **log filters** to log only blocked requests.

---

### ALB WAF via AWS CLI

```bash
# Step 1: Create Web ACL
aws wafv2 create-web-acl \
  --name "my-alb-waf" \
  --scope REGIONAL \
  --region ap-south-1 \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "AWSCommonRules",
      "Priority": 1,
      "OverrideAction": { "None": {} },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSCommonRules"
      }
    }
  ]' \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=my-alb-waf

# Step 2: Get the Web ACL ARN
aws wafv2 list-web-acls --scope REGIONAL --region ap-south-1

# Step 3: Associate Web ACL with ALB
aws wafv2 associate-web-acl \
  --web-acl-arn "arn:aws:wafv2:ap-south-1:123456789012:regional/webacl/my-alb-waf/abc123" \
  --resource-arn "arn:aws:elasticloadbalancing:ap-south-1:123456789012:loadbalancer/app/my-alb/abc123" \
  --region ap-south-1
```

---

### ALB WAF via Terraform

```hcl
# Create WAF Web ACL
resource "aws_wafv2_web_acl" "alb_waf" {
  name        = "my-alb-waf"
  scope       = "REGIONAL"
  description = "WAF Web ACL for ALB"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSCommonRules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitPerIP"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "my-alb-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = "production"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb_waf_association" {
  resource_arn = aws_lb.my_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.alb_waf.arn
}

# Enable WAF logging to S3
resource "aws_wafv2_web_acl_logging_configuration" "alb_waf_logging" {
  log_destination_configs = [aws_s3_bucket.waf_logs.arn]
  resource_arn            = aws_wafv2_web_acl.alb_waf.arn
}
```

---

## How to Add WAF to CloudFront

### Important: CloudFront WAF Region

> ⚠️ **Critical:** CloudFront distributions require a WAF Web ACL with **scope `CLOUDFRONT`**, and this Web ACL **must be created in the `us-east-1` (N. Virginia) region**, regardless of where your CloudFront distribution serves traffic.

**Why?** CloudFront is a global service and uses `us-east-1` as its control plane. WAF for CloudFront is enforced at the edge.

---

### Step 1: Create Web ACL in us-east-1

1. Open **AWS Console → WAF & Shield**
2. **Switch your console region to `us-east-1`** (top-right dropdown)
3. **Web ACLs → Create web ACL**
4. Configure:
   - **Name:** `my-cloudfront-waf`
   - **Resource type:** `CloudFront distributions` *(this automatically sets scope to CLOUDFRONT)*
   - Region is locked to `Global (CloudFront)` — this is `us-east-1` under the hood
5. Add rules (same as ALB WAF rules):
   - `AWSManagedRulesCommonRuleSet`
   - `AWSManagedRulesSQLiRuleSet`
   - `AWSManagedRulesAmazonIpReputationList`
   - Geo-restriction rules (if needed)
   - Rate-based rules
6. Set default action → **Allow**
7. Create the Web ACL

---

### Step 2: Attach WAF to CloudFront Distribution

**Option A: During CloudFront Distribution creation**
1. Go to **CloudFront → Create distribution**
2. In **Web Application Firewall (WAF)** section:
   - Select **Enable security protections** → choose your existing Web ACL
   - Or create a new one
3. Complete the distribution setup

**Option B: On existing CloudFront Distribution**
1. Go to **CloudFront → Distributions**
2. Select your distribution → **Edit**
3. Go to **Security** tab (or **General** tab, depending on console version)
4. Under **Web Application Firewall (WAF)**:
   - Select your Web ACL from the dropdown
   - *(Only Web ACLs created with CloudFront scope in us-east-1 appear here)*
5. Click **Save changes**
6. Wait for CloudFront to deploy (status: `In Progress` → `Deployed`, ~5-15 min)

---

### CloudFront WAF via AWS CLI

```bash
# Step 1: Create Web ACL (MUST use us-east-1, scope CLOUDFRONT)
aws wafv2 create-web-acl \
  --name "my-cloudfront-waf" \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "AWSCommonRules",
      "Priority": 1,
      "OverrideAction": { "None": {} },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSCommonRules"
      }
    }
  ]' \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=my-cloudfront-waf

# Step 2: Get the Web ACL ID and ARN
aws wafv2 list-web-acls \
  --scope CLOUDFRONT \
  --region us-east-1

# Step 3: Attach to CloudFront distribution
# Get current distribution config first
aws cloudfront get-distribution-config \
  --id E1ABCDEFGHIJK \
  --output json > dist-config.json

# Update the WebACLId field in dist-config.json, then:
aws cloudfront update-distribution \
  --id E1ABCDEFGHIJK \
  --distribution-config file://dist-config.json \
  --if-match <ETag from get-distribution-config>
```

---

### CloudFront WAF via Terraform

```hcl
# WAF for CloudFront MUST be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Create WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "cloudfront_waf" {
  provider    = aws.us_east_1
  name        = "my-cloudfront-waf"
  scope       = "CLOUDFRONT"   # MUST be CLOUDFRONT for CloudFront
  description = "WAF Web ACL for CloudFront"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSCommonRules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "GeoBlockRule"
    priority = 2

    action {
      block {}
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = ["IN", "US", "GB"]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlock"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitPerIP"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 3000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "my-cloudfront-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = "production"
  }
}

# CloudFront Distribution with WAF
resource "aws_cloudfront_distribution" "cdn" {
  # ... your origin, behavior settings ...

  web_acl_id = aws_wafv2_web_acl.cloudfront_waf.arn  # Attach WAF here

  enabled             = true
  default_root_object = "index.html"

  restrictions {
    geo_restriction {
      restriction_type = "none"  # Geo restriction handled by WAF
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

---

## WAF Rule Priority & Best Practices

```
Recommended Rule Priority Order:
┌─────────────────────────────────────────────────────┐
│ Priority 1  │ IP Allow-list (your IPs)    → Allow   │  ← Highest priority
│ Priority 2  │ IP Block-list (known bad)   → Block   │
│ Priority 3  │ Geo-restriction rule        → Block   │
│ Priority 4  │ Rate-based rule             → Block   │
│ Priority 5  │ Bot Control managed rules   → Block   │
│ Priority 6  │ IP Reputation managed rules → Block   │
│ Priority 7  │ Common Rule Set (CRS)       → Block   │
│ Priority 8  │ SQLi managed rules          → Block   │
│ Priority 9  │ Known bad inputs rules      → Block   │
│ Priority 10 │ App-specific custom rules   → Block   │
│             │ Default action              → Allow   │  ← Lowest priority
└─────────────────────────────────────────────────────┘
```

**Key best practices:**

- Always place **IP allow-lists first** (Priority 1) so your admin IPs are never blocked.
- Use **Count mode** when testing new rules — switch to Block only after validating.
- Set **CloudWatch alarms** on `BlockedRequests` to detect spikes.
- Enable **WAF logging** to S3 for forensics and compliance.
- Review and **tune managed rules** — not all rules apply to your stack (e.g., disable WordPress rules if you don't use WordPress).
- Use **Firewall Manager** when managing WAF across multiple AWS accounts.
- Place **CloudFront in front of ALB** and apply WAF at CloudFront for global edge-level protection.

---


