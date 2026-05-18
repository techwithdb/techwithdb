
---
title: "AWS Security Service Guide"
description: "Cover all AWS Services and explain basic introduction of all services"
date: 2025-01-20
author: "DB"
tags: ["aws", "ec2", "interview", "certification"]
tool: "aws"
level: "All Levels"
question_count: 30
---


# AWS Security Services — Complete Reference Guide

> 22 services · 7 categories · Real-world implementation with AWS CLI

---

## Table of Contents

### 🔐 IAM & Access Control
| # | Service | Jump |
|---|---------|------|
| 01 | IAM — Identity and Access Management | [→ Go](#iam-identity-and-access-management) |
| 02 | AWS Organizations & Service Control Policies | [→ Go](#aws-organizations--service-control-policies) |
| 03 | IAM Identity Center (SSO) | [→ Go](#iam-identity-center-sso) |
| 04 | AWS Resource Access Manager | [→ Go](#aws-resource-access-manager-ram) |

### 🌐 Network Security
| # | Service | Jump |
|---|---------|------|
| 05 | Security Groups | [→ Go](#security-groups) |
| 06 | Network ACLs | [→ Go](#network-acls) |
| 07 | AWS WAF — Web Application Firewall | [→ Go](#aws-waf--web-application-firewall) |
| 08 | AWS Shield — DDoS Protection | [→ Go](#aws-shield--ddos-protection) |
| 09 | AWS Network Firewall | [→ Go](#aws-network-firewall) |

### 🔍 Threat Detection & Monitoring
| # | Service | Jump |
|---|---------|------|
| 10 | VPC Flow Logs | [→ Go](#vpc-flow-logs) |
| 11 | Amazon GuardDuty | [→ Go](#amazon-guardduty) |
| 12 | AWS Security Hub | [→ Go](#aws-security-hub) |
| 13 | Amazon Detective | [→ Go](#amazon-detective) |
| 14 | AWS CloudTrail | [→ Go](#aws-cloudtrail) |
| 15 | Amazon Inspector | [→ Go](#amazon-inspector) |

### 🗄️ Data Protection
| # | Service | Jump |
|---|---------|------|
| 16 | AWS KMS — Key Management Service | [→ Go](#aws-kms--key-management-service) |
| 17 | Amazon Macie | [→ Go](#amazon-macie) |

### 🔑 Secrets & Key Management
| # | Service | Jump |
|---|---------|------|
| 18 | AWS Secrets Manager | [→ Go](#aws-secrets-manager) |
| 19 | AWS Systems Manager Parameter Store | [→ Go](#aws-systems-manager-parameter-store) |

### 🛡️ Application Security
| # | Service | Jump |
|---|---------|------|
| 20 | AWS Certificate Manager (ACM) | [→ Go](#aws-certificate-manager-acm) |
| 21 | Amazon Cognito | [→ Go](#amazon-cognito) |

### ✅ Compliance & Audit
| # | Service | Jump |
|---|---------|------|
| 22 | AWS Config | [→ Go](#aws-config) |
| 23 | AWS Audit Manager | [→ Go](#aws-audit-manager) |

---

<a id="iam-identity-and-access-management"></a>
## 01 · IAM — Identity and Access Management

**Category:** IAM & Access Control
**Anchor:** `#iam-identity-and-access-management`

Central AWS service to manage **who** can do **what** on **which** resources. Define users, groups, roles, and fine-grained JSON permission policies following the principle of least privilege.

**Real-world use case:** A fintech app assigns IAM roles to Lambda functions for DynamoDB and S3 access — zero hard-coded credentials, automatic credential rotation by AWS.

```bash
# Create an IAM role for Lambda (assume-role trust policy)
aws iam create-role \
  --role-name LambdaDynamoRole \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"lambda.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }'

# Attach an AWS managed policy to the role
aws iam attach-role-policy \
  --role-name LambdaDynamoRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess

# Dry-run permission simulation (before deploying)
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/LambdaDynamoRole \
  --action-names dynamodb:GetItem dynamodb:PutItem \
  --query 'EvaluationResults[*].[EvalActionName,EvalDecision]'

# Audit: list all roles and their attached policies
aws iam list-roles \
  --query 'Roles[*].[RoleName,Arn]' \
  --output table

# Find roles with wildcard Action: * (overly permissive)
aws iam list-policies --scope Local \
  --query 'Policies[*].[PolicyName,Arn]' --output text | \
  while read name arn; do
    aws iam get-policy-version --policy-arn "$arn" --version-id v1 \
      --query 'PolicyVersion.Document.Statement[?Action==`*`]' 2>/dev/null
  done
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-organizations--service-control-policies"></a>
## 02 · AWS Organizations & Service Control Policies

**Category:** IAM & Access Control
**Anchor:** `#aws-organizations--service-control-policies`

Service Control Policies (SCPs) are non-overridable guardrails applied at the Organization, OU, or account level. Even the root administrator of a member account cannot bypass an SCP denial.

**Real-world use case:** An enterprise enforces that all 50 member accounts can only provision resources in `us-east-1` and `eu-west-1` — one SCP, zero exceptions, no account-level override possible.

```bash
# Create an SCP that denies all non-approved AWS regions
aws organizations create-policy \
  --name "DenyNonApprovedRegions" \
  --type SERVICE_CONTROL_POLICY \
  --description "Restricts all actions to approved regions only" \
  --content '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Deny",
      "Action":"*",
      "Resource":"*",
      "Condition":{
        "StringNotEquals":{
          "aws:RequestedRegion":["us-east-1","eu-west-1"]
        },
        "ArnNotLike":{
          "aws:PrincipalARN":"arn:aws:iam::*:role/BreakGlassRole"
        }
      }
    }]
  }'

# Attach the SCP to an Organizational Unit
aws organizations attach-policy \
  --policy-id p-XXXXXXXX \
  --target-id ou-xxxx-yyyyyyyy

# List all SCPs attached to a target (OU or account)
aws organizations list-policies-for-target \
  --target-id ou-xxxx-yyyyyyyy \
  --filter SERVICE_CONTROL_POLICY \
  --query 'Policies[*].[Name,Id,AwsManaged]'

# Verify effective SCP for a member account
aws organizations describe-effective-policy \
  --policy-type SERVICE_CONTROL_POLICY \
  --target-id 123456789012
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="iam-identity-center-sso"></a>
## 03 · IAM Identity Center (SSO)

**Category:** IAM & Access Control
**Anchor:** `#iam-identity-center-sso`

Centralised single sign-on for all AWS accounts and SAML 2.0 business applications. Integrates with Okta, Azure AD, Ping Identity, and any SAML/OIDC provider. Issues short-lived, auto-rotated session credentials.

**Real-world use case:** Engineers sign in once via Okta and get time-boxed credentials for dev, staging, and prod accounts — no permanent IAM users, no long-lived access keys anywhere.

```bash
# List all configured permission sets
aws sso-admin list-permission-sets \
  --instance-arn arn:aws:sso:::instance/ssoins-xxxxxxxxxxxxxxxx \
  --query 'PermissionSets'

# Assign a permission set to a user in an account
aws sso-admin create-account-assignment \
  --instance-arn arn:aws:sso:::instance/ssoins-xxxxxxxxxxxxxxxx \
  --target-id 123456789012 \
  --target-type AWS_ACCOUNT \
  --permission-set-arn arn:aws:sso:::permissionSet/ssoins-xxx/ps-xxx \
  --principal-type USER \
  --principal-id user-id-from-identity-store

# List all users in the Identity Store
aws identitystore list-users \
  --identity-store-id d-xxxxxxxxxx \
  --query 'Users[*].[UserId,UserName,DisplayName]'

# Login and get short-term credentials (developer workflow)
aws sso login --profile prod-readonly
aws sts get-caller-identity --profile prod-readonly
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-resource-access-manager-ram"></a>
## 04 · AWS Resource Access Manager (RAM)

**Category:** IAM & Access Control
**Anchor:** `#aws-resource-access-manager-ram`

Share AWS resources (Transit Gateways, VPC Subnets, Route53 Resolver Rules, License Manager configs) across accounts within an AWS Organization without duplicating or re-creating them.

**Real-world use case:** A networking team shares one Transit Gateway and one Resolver rule with all 40 spoke accounts via RAM — single source of truth, no inter-account configuration drift.

```bash
# Share a Transit Gateway with the entire Organization
aws ram create-resource-share \
  --name "SharedTransitGateway" \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:transit-gateway/tgw-xxx \
  --principals arn:aws:organizations::123456789012:organization/o-xxxxxxxxxx \
  --allow-external-principals false

# List all resources you are sharing (as owner)
aws ram list-resources \
  --resource-owner SELF \
  --query 'resources[*].[arn,type,status,resourceShareArn]'

# List resources shared WITH your account (as consumer)
aws ram list-resources \
  --resource-owner OTHER-ACCOUNTS \
  --query 'resources[*].[arn,type,resourceShareArn]'

# Accept a resource share invitation (member account)
aws ram get-resource-share-invitations \
  --query 'resourceShareInvitations[*].[resourceShareInvitationArn,status]'

aws ram accept-resource-share-invitation \
  --resource-share-invitation-arn arn:aws:ram:us-east-1:123:invitation/xxx
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="security-groups"></a>
## 05 · Security Groups

**Category:** Network Security
**Anchor:** `#security-groups`

Stateful virtual firewalls attached to AWS resources (EC2, RDS, Lambda, ECS, ELB). All outbound traffic is allowed by default; inbound must be explicitly permitted. Rules reference CIDRs or other security group IDs.

**Real-world use case:** A 3-tier web app enforces strict SG chaining — ALB accepts only port 443 from the internet; App tier accepts only port 8080 from the ALB SG; DB tier accepts only port 5432 from the App SG.

```bash
# Create security groups for each tier
aws ec2 create-security-group \
  --group-name alb-sg --vpc-id vpc-xxx \
  --description "Public ALB — HTTPS only"

aws ec2 create-security-group \
  --group-name app-sg --vpc-id vpc-xxx \
  --description "Application tier — from ALB only"

aws ec2 create-security-group \
  --group-name db-sg --vpc-id vpc-xxx \
  --description "Database tier — from App only"

# ALB: allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-alb --protocol tcp --port 443 --cidr 0.0.0.0/0

# App: allow port 8080 only from ALB security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-app --protocol tcp --port 8080 \
  --source-group sg-alb

# DB: allow port 5432 only from App security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-db --protocol tcp --port 5432 \
  --source-group sg-app

# Security audit: find SGs with unrestricted inbound (0.0.0.0/0)
aws ec2 describe-security-groups \
  --filters "Name=ip-permission.cidr,Values=0.0.0.0/0" \
  --query 'SecurityGroups[*].[GroupId,GroupName,VpcId]' \
  --output table
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="network-acls"></a>
## 06 · Network ACLs

**Category:** Network Security
**Anchor:** `#network-acls`

Stateless subnet-level packet filters. Rules are evaluated in ascending numeric order; first match wins. Unlike security groups, NACLs support explicit DENY — useful for blocking known-bad IPs at scale without touching individual resources.

**Real-world use case:** A threat intel feed identifies a malicious /24 range. One NACL deny rule applied to the public subnet blocks it across all EC2 instances instantly — no SG changes needed.

```bash
# Create a NACL in the target VPC
aws ec2 create-network-acl \
  --vpc-id vpc-xxx \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=public-nacl}]'

# Rule 50: DENY inbound from a malicious IP range (evaluated first)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-xxx \
  --rule-number 50 \
  --protocol -1 \
  --rule-action deny \
  --ingress \
  --cidr-block 203.0.113.0/24

# Rule 100: ALLOW all other inbound traffic
aws ec2 create-network-acl-entry \
  --network-acl-id acl-xxx \
  --rule-number 100 \
  --protocol -1 \
  --rule-action allow \
  --ingress \
  --cidr-block 0.0.0.0/0

# Rule 100: ALLOW all outbound (stateless — must define both directions)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-xxx \
  --rule-number 100 \
  --protocol -1 \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0

# Associate NACL with a subnet
aws ec2 replace-network-acl-association \
  --association-id aclassoc-xxx \
  --network-acl-id acl-xxx
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-waf--web-application-firewall"></a>
## 07 · AWS WAF — Web Application Firewall

**Category:** Network Security
**Anchor:** `#aws-waf--web-application-firewall`

Inspect and filter HTTP/HTTPS requests before they reach CloudFront, ALB, API Gateway, or AppSync. Block SQL injection, XSS, bad bots, geographic threats, and rate abuse using managed or custom rules.

**Real-world use case:** An e-commerce platform deploys WAF on CloudFront with AWS Managed Rules (OWASP Core Rule Set) and a rate-based rule capping any single IP at 2000 requests per 5 minutes, blocking scraper bots automatically.

```bash
# Create a WAF Web ACL (CloudFront scope — must be in us-east-1)
aws wafv2 create-web-acl \
  --name "EcommerceWebACL" \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --default-action Allow={} \
  --visibility-config \
    SampledRequestsEnabled=true,\
CloudWatchMetricsEnabled=true,\
MetricName=EcommerceWebACL \
  --rules '[
    {
      "Name":"AWSManagedRulesCommonRuleSet",
      "Priority":1,
      "OverrideAction":{"None":{}},
      "Statement":{"ManagedRuleGroupStatement":{
        "VendorName":"AWS","Name":"AWSManagedRulesCommonRuleSet"
      }},
      "VisibilityConfig":{
        "SampledRequestsEnabled":true,
        "CloudWatchMetricsEnabled":true,
        "MetricName":"CommonRuleSet"
      }
    }
  ]'

# Associate WAF Web ACL with an ALB
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123:regional/webacl/EcommerceWebACL/xxx \
  --resource-arn arn:aws:elasticloadbalancing:us-east-1:123:loadbalancer/app/my-alb/xxx

# Sample blocked requests for investigation
aws wafv2 get-sampled-requests \
  --web-acl-arn arn:aws:wafv2:us-east-1:123:regional/webacl/EcommerceWebACL/xxx \
  --rule-metric-name CommonRuleSet \
  --scope REGIONAL \
  --time-window StartTime=$(date -d '-1 hour' +%s),EndTime=$(date +%s) \
  --max-items 50
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-shield--ddos-protection"></a>
## 08 · AWS Shield — DDoS Protection

**Category:** Network Security
**Anchor:** `#aws-shield--ddos-protection`

Managed DDoS protection at layers 3, 4, and 7. Shield Standard is free and automatic for all AWS accounts. Shield Advanced adds 24/7 DRT (DDoS Response Team) access, attack visibility, proactive engagement, and cost protection.

**Real-world use case:** A live gaming platform subscribes to Shield Advanced — when a sustained L4 UDP flood hits, AWS automatically mitigates it and reimburses the surge in data-transfer costs.

```bash
# Subscribe to Shield Advanced (once per organisation)
aws shield create-subscription

# Protect a specific Application Load Balancer
aws shield create-protection \
  --name "Production ALB" \
  --resource-arn arn:aws:elasticloadbalancing:us-east-1:123:loadbalancer/app/prod-alb/xxx

# Protect a CloudFront distribution
aws shield create-protection \
  --name "Production CloudFront" \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE

# List all active DDoS attacks in the last 7 days
aws shield list-attacks \
  --start-time StartTime=$(date -d '-7 days' +%s) \
  --end-time EndTime=$(date +%s) \
  --query 'AttackSummaries[*].[AttackId,StartTime,AttackVectors[0].VectorType]'

# List all Shield-protected resources
aws shield list-protections \
  --query 'Protections[*].[Name,ResourceArn,Id]' \
  --output table
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-network-firewall"></a>
## 09 · AWS Network Firewall

**Category:** Network Security
**Anchor:** `#aws-network-firewall`

Managed stateful network firewall with IDS/IPS deployed inside your VPC. Uses Suricata-compatible rules for deep packet inspection, domain filtering, and protocol anomaly detection. Integrates with AWS Firewall Manager for multi-account deployment.

**Real-world use case:** A financial institution routes all egress VPC traffic through a centralised inspection VPC running Network Firewall — blocking known malware C2 domains and scanning for data exfiltration patterns before traffic exits AWS.

```bash
# Create a stateful domain-blocking rule group
aws network-firewall create-rule-group \
  --rule-group-name "BlockMaliciousDomains" \
  --type STATEFUL \
  --capacity 100 \
  --rule-group '{
    "RulesSource":{
      "RulesSourceList":{
        "Targets":["malware.example.com","c2.badactor.net"],
        "TargetTypes":["HTTP_HOST","TLS_SNI"],
        "GeneratedRulesType":"DENYLIST"
      }
    }
  }'

# Create a firewall policy referencing the rule group
aws network-firewall create-firewall-policy \
  --firewall-policy-name "CentralInspectionPolicy" \
  --firewall-policy '{
    "StatelessDefaultActions":["aws:forward_to_sfe"],
    "StatelessFragmentDefaultActions":["aws:forward_to_sfe"],
    "StatefulRuleGroupReferences":[{
      "ResourceArn":"arn:aws:network-firewall:us-east-1:123:stateful-rulegroup/BlockMaliciousDomains"
    }]
  }'

# Deploy the firewall into an inspection subnet
aws network-firewall create-firewall \
  --firewall-name "CentralFirewall" \
  --firewall-policy-arn arn:aws:network-firewall:us-east-1:123:firewall-policy/CentralInspectionPolicy \
  --vpc-id vpc-inspection-xxx \
  --subnet-mappings SubnetId=subnet-inspection-xxx
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="vpc-flow-logs"></a>
## 10 · VPC Flow Logs

**Category:** Threat Detection & Monitoring
**Anchor:** `#vpc-flow-logs`

Capture IP traffic metadata (source/dest IP, port, protocol, bytes, action) for all network interfaces in a VPC, subnet, or ENI. Essential for network forensics, threat hunting, and compliance audit trails. Does not capture packet payloads.

**Real-world use case:** After a GuardDuty alert about lateral movement, a security team queries Flow Logs in Athena and finds the exact internal IPs and ports the attacker traversed across three subnets in 11 minutes.

```bash
# Enable Flow Logs for an entire VPC to S3 (all traffic)
aws ec2 create-flow-logs \
  --resource-ids vpc-xxx \
  --resource-type VPC \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-vpc-flow-logs-bucket \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status}'

# Enable REJECT-only logs to CloudWatch Logs (real-time alerts)
aws ec2 create-flow-logs \
  --resource-ids vpc-xxx \
  --resource-type VPC \
  --traffic-type REJECT \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs/rejected \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/FlowLogsDeliveryRole

# Athena query: top 20 rejected source IPs (threat hunting)
# SELECT srcaddr, COUNT(*) AS attempts, SUM(bytes) AS total_bytes
# FROM vpc_flow_logs
# WHERE action = 'REJECT'
#   AND from_unixtime(start) > NOW() - INTERVAL '24' HOUR
# GROUP BY srcaddr
# ORDER BY attempts DESC LIMIT 20;

# List existing flow log configurations
aws ec2 describe-flow-logs \
  --query 'FlowLogs[*].[FlowLogId,ResourceId,TrafficType,LogDestinationType,DeliverLogsStatus]' \
  --output table
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="amazon-guardduty"></a>
## 11 · Amazon GuardDuty

**Category:** Threat Detection & Monitoring
**Anchor:** `#amazon-guardduty`

Intelligent threat detection using ML, behavioural analytics, and AWS threat intelligence feeds. Monitors CloudTrail API calls, VPC Flow Logs, DNS queries, S3 data events, and EKS audit logs — requires no agents and no infrastructure changes.

**Real-world use case:** GuardDuty detects an EC2 instance querying a known cryptocurrency mining C2 domain (via DNS logs) and triggers an EventBridge rule that auto-isolates the instance by updating its security group.

```bash
# Enable GuardDuty in the current region
aws guardduty create-detector \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES \
  --data-sources '{
    "S3Logs":{"Enable":true},
    "Kubernetes":{"AuditLogs":{"Enable":true}},
    "MalwareProtection":{"ScanEc2InstanceWithFindings":{"EbsVolumes":true}}
  }'

# Get the detector ID for all subsequent calls
DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text)

# List HIGH and CRITICAL severity findings
aws guardduty list-findings \
  --detector-id $DETECTOR_ID \
  --finding-criteria '{
    "Criterion":{
      "severity":{"Gte":7},
      "service.archived":{"Eq":["false"]}
    }
  }' --output text

# Get detailed information on specific findings
aws guardduty get-findings \
  --detector-id $DETECTOR_ID \
  --finding-ids finding-id-xxx \
  --query 'Findings[0].[Title,Type,Severity,Description,Service.Action]'

# Create a suppression filter (auto-archive known false positives)
aws guardduty create-filter \
  --detector-id $DETECTOR_ID \
  --name "SuppressDevScanners" \
  --action ARCHIVE \
  --finding-criteria '{
    "Criterion":{
      "resource.instanceDetails.tags.value":{"Eq":["security-scanner"]}
    }
  }'
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-security-hub"></a>
## 12 · AWS Security Hub

**Category:** Threat Detection & Monitoring
**Anchor:** `#aws-security-hub`

Single-pane-of-glass aggregation of security findings from GuardDuty, Inspector, Macie, Config, Firewall Manager, and 60+ partner integrations. Scores findings against CIS, PCI DSS, and NIST standards automatically.

**Real-world use case:** A CISO dashboard feeds Security Hub CRITICAL findings via EventBridge into Slack and automatically creates JIRA P1 tickets — mean time to acknowledge drops from 4 hours to 8 minutes.

```bash
# Enable Security Hub with default security standards
aws securityhub enable-security-hub \
  --enable-default-standards

# Get all CRITICAL unresolved findings
aws securityhub get-findings \
  --filters '{
    "SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}],
    "WorkflowStatus":[{"Value":"NEW","Comparison":"EQUALS"}],
    "RecordState":[{"Value":"ACTIVE","Comparison":"EQUALS"}]
  }' \
  --query 'Findings[*].[Title,ProductName,CreatedAt,AwsAccountId]' \
  --output table

# Mark findings as resolved after remediation
aws securityhub batch-update-findings \
  --finding-identifiers '[{"Id":"finding-id","ProductArn":"arn:aws:securityhub:..."}]' \
  --workflow '{"Status":"RESOLVED"}' \
  --note '{"Text":"Patched in PR #1234","UpdatedBy":"alice@company.com"}'

# Disable a compliance control with a documented justification
aws securityhub update-standards-control \
  --standards-control-arn arn:aws:securityhub:us-east-1:123:control/cis-aws-foundations-benchmark/v/1.2.0/1.16 \
  --control-status DISABLED \
  --disabled-reason "Compensating control enforced via SCP at the Organization level"
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="amazon-detective"></a>
## 13 · Amazon Detective

**Category:** Threat Detection & Monitoring
**Anchor:** `#amazon-detective`

Automated graph-based security investigation service. Continuously ingests CloudTrail, VPC Flow Logs, and GuardDuty findings to build an entity behaviour graph — letting you visually trace the full blast radius of an incident without writing queries.

**Real-world use case:** After a GuardDuty finding on a compromised IAM credential, Detective's timeline shows every API call that role made, which external IPs it communicated with, and which S3 buckets were accessed — in under 2 minutes.

```bash
# Enable Detective (creates a behaviour graph automatically)
aws detective create-graph \
  --tags '{"Environment":"prod"}'

# List your behaviour graphs
aws detective list-graphs \
  --query 'GraphList[*].[Arn,CreatedTime]'

# Invite member accounts to contribute data to the graph
aws detective create-members \
  --graph-arn arn:aws:detective:us-east-1:123456789012:graph/xxx \
  --accounts '[
    {"AccountId":"111122223333","EmailAddress":"sec-ops@subsidiary.com"},
    {"AccountId":"444455556666","EmailAddress":"sec-ops@division.com"}
  ]'

# List all members and their status
aws detective list-members \
  --graph-arn arn:aws:detective:us-east-1:123456789012:graph/xxx \
  --query 'MemberDetails[*].[AccountId,Status,UpdatedTime]'
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-cloudtrail"></a>
## 14 · AWS CloudTrail

**Category:** Threat Detection & Monitoring
**Anchor:** `#aws-cloudtrail`

Records every AWS API call — who called it, from which IP, using which credential, and with what parameters. The foundational audit log for security forensics, change management, and compliance. Trails deliver to S3, CloudWatch Logs, and CloudTrail Lake.

**Real-world use case:** After a data breach, engineers replay 6 days of CloudTrail events in Athena to reconstruct every S3 `GetObject` and `PutBucketPolicy` call the attacker made — producing a legally admissible timeline.

```bash
# Create a multi-region, organisation-wide trail
aws cloudtrail create-trail \
  --name "OrgWideAuditTrail" \
  --s3-bucket-name my-cloudtrail-logs-bucket \
  --is-multi-region-trail \
  --is-organization-trail \
  --include-global-service-events \
  --enable-log-file-validation

# Start logging
aws cloudtrail start-logging --name OrgWideAuditTrail

# Look up all S3 DeleteObject events in the last 7 days
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteObject \
  --start-time $(date -d '-7 days' -u +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Events[*].[EventTime,Username,Resources[0].ResourceName,SourceIPAddress]' \
  --output table

# Look up ALL actions from a specific access key (incident response)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE \
  --query 'Events[*].[EventTime,EventName,SourceIPAddress]'

# Verify log file integrity (detect tampering)
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:us-east-1:123:trail/OrgWideAuditTrail \
  --start-time 2024-01-01T00:00:00Z
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="amazon-inspector"></a>
## 15 · Amazon Inspector

**Category:** Threat Detection & Monitoring
**Anchor:** `#amazon-inspector`

Automated, continuous vulnerability management for EC2 instances, Lambda functions, and ECR container images. Scans for OS and application package CVEs, network reachability issues, and code vulnerabilities — fully event-driven, no scheduled jobs.

**Real-world use case:** A critical OpenSSL CVE is published. Inspector automatically re-scans all EC2 instances and ECR images within 2 hours and surfaces affected resources with a risk score before any engineer has seen the CVE advisory.

```bash
# Enable Inspector across EC2, ECR, and Lambda
aws inspector2 enable \
  --resource-types EC2 ECR LAMBDA

# Get all active findings sorted by severity
aws inspector2 list-findings \
  --filter-criteria '{
    "findingStatus":[{"comparison":"EQUALS","value":"ACTIVE"}]
  }' \
  --sort-criteria '{"field":"SEVERITY","sortOrder":"DESC"}' \
  --query 'findings[*].[severity,title,packageVulnerabilityDetails.vulnerabilityId,resources[0].id]' \
  --output table

# Get critical findings for ECR container images only
aws inspector2 list-findings \
  --filter-criteria '{
    "severity":[{"comparison":"EQUALS","value":"CRITICAL"}],
    "resourceType":[{"comparison":"EQUALS","value":"AWS_ECR_CONTAINER_IMAGE"}]
  }' \
  --query 'findings[*].[title,packageVulnerabilityDetails.cvss[0].baseScore]'

# Create a suppression filter for a known false positive
aws inspector2 create-filter \
  --name "SuppressBaseOSFalsePositive" \
  --action SUPPRESS \
  --filter-criteria '{
    "vulnerabilityId":[{"comparison":"EQUALS","value":"CVE-2022-XXXXX"}]
  }'
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-kms--key-management-service"></a>
## 16 · AWS KMS — Key Management Service

**Category:** Data Protection
**Anchor:** `#aws-kms--key-management-service`

Managed cryptographic key service. Create and control symmetric and asymmetric encryption keys used by 100+ AWS services. Customer-managed keys support key policies, automatic annual rotation, CloudTrail audit logging of every key usage, and multi-region replication.

**Real-world use case:** An S3 bucket holding healthcare PHI uses a CMK. The key policy restricts `kms:Decrypt` to only the `DataProcessingRole` — even if an attacker accesses the bucket, they cannot read the data without the key.

```bash
# Create a symmetric customer-managed KMS key with a restrictive key policy
aws kms create-key \
  --description "PHI S3 Encryption Key — prod" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --policy '{
    "Version":"2012-10-17",
    "Statement":[
      {
        "Effect":"Allow",
        "Principal":{"AWS":"arn:aws:iam::123456789012:root"},
        "Action":"kms:*","Resource":"*"
      },
      {
        "Effect":"Allow",
        "Principal":{"AWS":"arn:aws:iam::123456789012:role/DataProcessingRole"},
        "Action":["kms:Decrypt","kms:GenerateDataKey"],
        "Resource":"*"
      }
    ]
  }'

# Create a human-readable alias
aws kms create-alias \
  --alias-name alias/phi-s3-prod \
  --target-key-id key-id-from-above

# Enable automatic annual key rotation
aws kms enable-key-rotation --key-id alias/phi-s3-prod

# Generate a data key (envelope encryption pattern)
aws kms generate-data-key \
  --key-id alias/phi-s3-prod \
  --key-spec AES_256 \
  --query '[CiphertextBlob,Plaintext]' --output text

# Audit: all KMS API calls for this key (via CloudTrail)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=alias/phi-s3-prod \
  --query 'Events[*].[EventTime,EventName,Username]' --output table
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="amazon-macie"></a>
## 17 · Amazon Macie

**Category:** Data Protection
**Anchor:** `#amazon-macie`

ML-powered sensitive data discovery and classification for Amazon S3. Automatically detects PII, financial data (credit card numbers, bank account numbers), credentials, and custom-defined patterns. Also provides continuous S3 bucket security posture monitoring.

**Real-world use case:** A developer accidentally uploads a CSV containing 50,000 customer credit card numbers to a staging bucket. Macie detects it within minutes and raises a finding that triggers an automated SNS alert to the data protection team.

```bash
# Enable Macie in the current account
aws macie2 enable-macie

# Create a sensitive data discovery job for specific buckets
aws macie2 create-classification-job \
  --job-type ONE_TIME \
  --name "Q1-2024-PII-Scan" \
  --s3-job-definition '{
    "bucketDefinitions":[{
      "accountId":"123456789012",
      "buckets":["prod-customer-data","staging-uploads","data-lake-raw"]
    }]
  }' \
  --managed-data-identifier-selector ALL

# List active HIGH and CRITICAL findings
aws macie2 list-findings \
  --finding-criteria '{
    "criterion":{
      "severity.description":{"eq":["High","Critical"]},
      "classificationDetails.result.sensitiveData.category":{
        "eq":["FINANCIAL_INFORMATION","PERSONAL_INFORMATION","CREDENTIALS"]
      }
    }
  }' \
  --query 'findingIds'

# Check S3 bucket posture — find publicly accessible buckets
aws macie2 describe-buckets \
  --criteria '{
    "publicAccess.effectivePermission":{"eq":["PUBLIC"]}
  }' \
  --query 'buckets[*].[bucketName,publicAccess.effectivePermission,serverSideEncryption.type]'
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-secrets-manager"></a>
## 18 · AWS Secrets Manager

**Category:** Secrets & Key Management
**Anchor:** `#aws-secrets-manager`

Securely store, access, and automatically rotate database credentials, API keys, OAuth tokens, and arbitrary secrets. Built-in rotation is native for RDS, Redshift, and DocumentDB. Custom rotation uses Lambda for any other secret type.

**Real-world use case:** A Node.js API server retrieves its PostgreSQL password from Secrets Manager at startup. Automatic 30-day rotation updates both the secret value and the database user password atomically — zero downtime, zero manual intervention.

```bash
# Store a structured database credential secret
aws secretsmanager create-secret \
  --name "prod/myapp/postgres-credentials" \
  --description "Production PostgreSQL credentials" \
  --kms-key-id alias/phi-s3-prod \
  --secret-string '{
    "username":"app_user",
    "password":"InitialP@ss!",
    "host":"db.prod.internal",
    "port":5432,
    "dbname":"appdb"
  }'

# Enable automatic 30-day rotation using the AWS-managed RDS rotator
aws secretsmanager rotate-secret \
  --secret-id prod/myapp/postgres-credentials \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123:function:SecretsManagerPostgreSQLRotation \
  --rotation-rules '{"AutomaticallyAfterDays":30}'

# Retrieve and decode the current secret value
aws secretsmanager get-secret-value \
  --secret-id prod/myapp/postgres-credentials \
  --query SecretString --output text | python3 -m json.tool

# Application code — retrieve secret at runtime (Python Boto3):
# import boto3, json
# secret = json.loads(
#   boto3.client('secretsmanager')
#     .get_secret_value(SecretId='prod/myapp/postgres-credentials')['SecretString']
# )
# conn = psycopg2.connect(**secret)
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-systems-manager-parameter-store"></a>
## 19 · AWS Systems Manager Parameter Store

**Category:** Secrets & Key Management
**Anchor:** `#aws-systems-manager-parameter-store`

Hierarchical key-value store for configuration data and secrets. Standard parameters (plaintext) are free. SecureString parameters are KMS-encrypted. Parameter paths provide structured namespaces (e.g., `/prod/myapp/DB_HOST`). Integrates natively with EC2, Lambda, ECS, CodeBuild, and CloudFormation.

**Real-world use case:** A CodePipeline deploys to three environments. Each stage pulls its own config namespace (`/dev/`, `/staging/`, `/prod/`) from Parameter Store at deploy time — no environment files in the repo, no secrets in environment variables.

```bash
# Store a plaintext config parameter
aws ssm put-parameter \
  --name /prod/myapp/DB_HOST \
  --value "db.prod.internal.example.com" \
  --type String

# Store an encrypted secret (KMS SecureString)
aws ssm put-parameter \
  --name /prod/myapp/DB_PASSWORD \
  --value "S3cur3P@ssw0rd!" \
  --type SecureString \
  --key-id alias/phi-s3-prod \
  --overwrite

# Retrieve all parameters under a path hierarchy (with decryption)
aws ssm get-parameters-by-path \
  --path /prod/myapp/ \
  --with-decryption \
  --recursive \
  --query 'Parameters[*].[Name,Value,Type]' \
  --output table

# Reference in CloudFormation / CDK (dynamic resolution, no hardcoding):
# DB_PASSWORD: !Sub '{{resolve:ssm-secure:/prod/myapp/DB_PASSWORD:1}}'
# DB_HOST:     !Sub '{{resolve:ssm:/prod/myapp/DB_HOST:1}}'

# Retrieve in a Lambda function (Python Boto3):
# ssm = boto3.client('ssm')
# password = ssm.get_parameter(
#   Name='/prod/myapp/DB_PASSWORD', WithDecryption=True
# )['Parameter']['Value']
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-certificate-manager-acm"></a>
## 20 · AWS Certificate Manager (ACM)

**Category:** Application Security
**Anchor:** `#aws-certificate-manager-acm`

Provision and auto-renew free public TLS/SSL certificates for use with CloudFront, ALB, API Gateway, and Elastic Beanstalk. Supports wildcard certificates and SANs. Handles private CAs for internal mTLS scenarios via ACM Private CA.

**Real-world use case:** A multi-region SaaS platform uses ACM wildcard certificates (`*.app.example.com`) on all 6 regional ALBs. Certificates auto-renew 60 days before expiry — the operations team hasn't touched a certificate in over 2 years.

```bash
# Request a public certificate with DNS validation
aws acm request-certificate \
  --domain-name "example.com" \
  --subject-alternative-names "*.example.com" "api.example.com" \
  --validation-method DNS \
  --tags '[{"Key":"Environment","Value":"prod"}]'

# List all certificates and their renewal eligibility
aws acm list-certificates \
  --certificate-statuses ISSUED \
  --query 'CertificateSummaryList[*].[DomainName,CertificateArn,RenewalEligibility]' \
  --output table

# Inspect a certificate's expiry date and renewal status
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123:certificate/xxx \
  --query 'Certificate.[DomainName,NotAfter,Status,RenewalSummary.RenewalStatus]'

# Import an externally issued certificate (e.g., from a private CA)
aws acm import-certificate \
  --certificate fileb://fullchain.pem \
  --private-key fileb://privkey.pem \
  --certificate-chain fileb://chain.pem

# Set up a CloudWatch alarm for certificates expiring within 30 days
aws cloudwatch put-metric-alarm \
  --alarm-name "ACM-CertExpiry-30Days" \
  --namespace AWS/CertificateManager \
  --metric-name DaysToExpiry \
  --statistic Minimum \
  --period 86400 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123:CertExpiryAlerts
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="amazon-cognito"></a>
## 21 · Amazon Cognito

**Category:** Application Security
**Anchor:** `#amazon-cognito`

User authentication, authorisation, and identity federation for web and mobile apps. User Pools manage sign-up, sign-in, MFA, and JWT tokens. Identity Pools grant short-term AWS credentials to authenticated or guest users. Supports Google, Apple, SAML, and OIDC federation.

**Real-world use case:** A React SPA uses Cognito User Pools with TOTP MFA for authentication. The resulting JWT `id_token` is validated by an API Gateway Lambda authoriser — every backend API call is authenticated with zero custom auth code.

```bash
# Create a User Pool with strong security defaults
aws cognito-idp create-user-pool \
  --pool-name "MyAppUserPool" \
  --policies '{
    "PasswordPolicy":{
      "MinimumLength":14,
      "RequireUppercase":true,
      "RequireNumbers":true,
      "RequireSymbols":true,
      "TemporaryPasswordValidityDays":1
    }
  }' \
  --mfa-configuration ON \
  --auto-verified-attributes email

# Enforce software TOTP MFA for all users
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id us-east-1_xxxxxxxxx \
  --software-token-mfa-configuration Enabled=true \
  --mfa-configuration ON

# Create an App Client for a React SPA (no client secret — public client)
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_xxxxxxxxx \
  --client-name "ReactSPAClient" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --prevent-user-existence-errors ENABLED

# Immediately disable a compromised user account
aws cognito-idp admin-disable-user \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username alice@example.com

# Revoke all active sessions for a user (force re-authentication)
aws cognito-idp admin-user-global-sign-out \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username alice@example.com
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-config"></a>
## 22 · AWS Config

**Category:** Compliance & Audit
**Anchor:** `#aws-config`

Continuously records the configuration state of AWS resources and evaluates them against managed or custom compliance rules. Provides a full configuration history timeline for every resource and supports automatic remediation via SSM Automation when non-compliant states are detected.

**Real-world use case:** Config detects that a developer removed the public access block on an S3 bucket. Within 90 seconds, an SSM Automation document re-enables the block, sends an SNS alert, and logs a compliance event — the bucket was publicly exposed for under 2 minutes.

```bash
# Enable Config recording for all supported resource types
aws configservice put-configuration-recorder \
  --configuration-recorder '{
    "name":"default",
    "roleARN":"arn:aws:iam::123456789012:role/ConfigRecorderRole",
    "recordingGroup":{
      "allSupported":true,
      "includeGlobalResourceTypes":true
    }
  }'

# Set delivery channel (S3 + SNS on every change)
aws configservice put-delivery-channel \
  --delivery-channel '{
    "name":"default",
    "s3BucketName":"my-config-snapshots-bucket",
    "snsTopicARN":"arn:aws:sns:us-east-1:123:config-changes",
    "configSnapshotDeliveryProperties":{"deliveryFrequency":"TwentyFour_Hours"}
  }'

# Start the recorder
aws configservice start-configuration-recorder \
  --configuration-recorder-name default

# Add a managed rule: S3 public read must be prohibited
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName":"s3-bucket-public-read-prohibited",
    "Source":{
      "Owner":"AWS",
      "SourceIdentifier":"S3_BUCKET_PUBLIC_READ_PROHIBITED"
    }
  }'

# List all non-compliant S3 buckets right now
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name s3-bucket-public-read-prohibited \
  --compliance-types NON_COMPLIANT \
  --query 'EvaluationResults[*].[EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId,ResultRecordedTime]' \
  --output table

# Set up automatic remediation (re-enable block public access)
aws configservice put-remediation-configurations \
  --remediation-configurations '[{
    "ConfigRuleName":"s3-bucket-public-read-prohibited",
    "TargetType":"SSM_DOCUMENT",
    "TargetId":"AWS-DisableS3BucketPublicReadWrite",
    "Automatic":true,
    "MaximumAutomaticAttempts":3,
    "RetryAttemptSeconds":60
  }]'
```

[↑ Back to Table of Contents](#table-of-contents)

---

<a id="aws-audit-manager"></a>
## 23 · AWS Audit Manager

**Category:** Compliance & Audit
**Anchor:** `#aws-audit-manager`

Continuously collects and maps AWS resource evidence to audit controls for PCI DSS, SOC 2, HIPAA, GDPR, NIST 800-53, and ISO 27001. Replaces manual evidence-collection spreadsheets with automated, always-current evidence packages.

**Real-world use case:** A healthcare startup needs its first HIPAA audit. Audit Manager automatically pulls CloudTrail access logs, Config compliance history, IAM policy snapshots, and S3 encryption evidence into a structured report — the auditor receives a complete evidence package in one click instead of 6 weeks of manual gathering.

```bash
# List available standard audit frameworks
aws auditmanager list-assessment-frameworks \
  --framework-type Standard \
  --query 'frameworkMetadataList[*].[name,id,complianceType]' \
  --output table

# Get the framework ID for SOC 2
SOC2_ID=$(aws auditmanager list-assessment-frameworks \
  --framework-type Standard \
  --query 'frameworkMetadataList[?name==`SOC 2`].id' \
  --output text)

# Create a SOC 2 Type II assessment
aws auditmanager create-assessment \
  --name "SOC2-Type2-FY2024" \
  --description "Annual SOC 2 Type II assessment for FY2024" \
  --assessment-reports-destination \
    'destinationType=S3,destination=s3://my-audit-evidence-bucket' \
  --scope '{
    "awsAccounts":[{"id":"123456789012","emailAddress":"audit@company.com","name":"Main Account"}],
    "awsServices":[
      {"serviceName":"S3"},{"serviceName":"IAM"},
      {"serviceName":"CloudTrail"},{"serviceName":"Config"}
    ]
  }' \
  --framework-id $SOC2_ID \
  --roles '[{"roleArn":"arn:aws:iam::123456789012:role/AuditManagerRole","roleType":"PROCESS_OWNER"}]'

# List assessments and their current status
aws auditmanager list-assessments \
  --query 'assessmentMetadataList[*].[name,status,lastUpdated,complianceType]' \
  --output table

# Generate a final assessment report for auditors
aws auditmanager create-assessment-report \
  --name "SOC2-FY2024-Final-Report" \
  --assessment-id assessment-id-xxx
```

[↑ Back to Table of Contents](#table-of-contents)

---

## Quick Reference — Threat to Service Mapping

| Threat Scenario | Primary Service | Supporting Services |
|---|---|---|
| Unauthorized console / API access | [IAM](#iam-identity-and-access-management) + [IAM Identity Center](#iam-identity-center-sso) | [SCPs](#aws-organizations--service-control-policies), [Cognito MFA](#amazon-cognito) |
| Privilege escalation across accounts | [SCPs](#aws-organizations--service-control-policies) + [IAM](#iam-identity-and-access-management) | [CloudTrail](#aws-cloudtrail), [Security Hub](#aws-security-hub) |
| SQL injection / XSS on web app | [AWS WAF](#aws-waf--web-application-firewall) | [Shield](#aws-shield--ddos-protection), [ACM](#aws-certificate-manager-acm) |
| DDoS attack on infrastructure | [Shield Advanced](#aws-shield--ddos-protection) | [WAF](#aws-waf--web-application-firewall), [Network Firewall](#aws-network-firewall) |
| Lateral movement inside VPC | [GuardDuty](#amazon-guardduty) + [VPC Flow Logs](#vpc-flow-logs) | [Detective](#amazon-detective), [Network Firewall](#aws-network-firewall) |
| Data exfiltration from S3 | [Macie](#amazon-macie) + [GuardDuty](#amazon-guardduty) | [KMS](#aws-kms--key-management-service), [VPC Flow Logs](#vpc-flow-logs) |
| Compromised IAM credential | [GuardDuty](#amazon-guardduty) + [CloudTrail](#aws-cloudtrail) | [Detective](#amazon-detective), [Security Hub](#aws-security-hub) |
| Hard-coded secrets in code | [Secrets Manager](#aws-secrets-manager) + [Macie](#amazon-macie) | [Parameter Store](#aws-systems-manager-parameter-store), [KMS](#aws-kms--key-management-service) |
| Unpatched OS / container CVE | [Inspector](#amazon-inspector) | [Security Hub](#aws-security-hub), [Config](#aws-config) |
| Misconfigured resource (public S3) | [Config](#aws-config) + [Security Hub](#aws-security-hub) | [Macie](#amazon-macie), [Audit Manager](#aws-audit-manager) |
| Compliance drift (PCI / HIPAA) | [Audit Manager](#aws-audit-manager) + [Config](#aws-config) | [CloudTrail](#aws-cloudtrail), [Security Hub](#aws-security-hub) |
| Expired / invalid TLS certificate | [ACM](#aws-certificate-manager-acm) | [Security Hub](#aws-security-hub), CloudWatch Alarms |

---

*AWS Security Services Reference · 22 services · 7 categories · All anchor links use explicit `<a id>` HTML tags — compatible with GitHub, GitLab, Bitbucket, and all standard Markdown renderers*
