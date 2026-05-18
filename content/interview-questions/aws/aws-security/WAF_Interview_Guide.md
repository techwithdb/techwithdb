---
title: "AWS Security Interview Questions and Answers"
description: "aws security interview questions and answers"
date: 2025-01-20
author: "DB"
tags: ["aws", "ec2", "interview", "certification"]
tool: "aws"
level: "All Levels"
question_count: 30
---


# 🛡️ AWS WAF — Complete Interview & Implementation Guide for AWS Cloud and DevOps Engineer



{{< qa num="1" q="What is AWS WAF" level="advanced" >}}

**Ans:** AWS WAF (Web Application Firewall) is a managed firewall service that helps protect web applications from common web exploits and bots that may affect availability, compromise security, or consume excessive resources.

**Key components:**
- **Web ACL (Access Control List)** — The top-level container that holds rules and is associated with a resource.
- **Rules** — Conditions that inspect requests (IP, header, body, URI, query string, etc.).
- **Rule Groups** — Reusable collections of rules.
- **Actions** — `Allow`, `Block`, `Count`, `CAPTCHA`, `Challenge`.

**Supported resources to protect:**
- Application Load Balancer (ALB)
- Amazon CloudFront
- Amazon API Gateway (REST API)
- AWS AppSync (GraphQL API)
- Amazon Cognito User Pool
- AWS App Runner service

{{< /qa >}}

{{< qa num="2" q="Your e-commerce application is receiving SQL injection attempts targeting the login endpoint. How would you configure AWS WAF to block these?" level="advanced" >}}


**Ans:**

1. **Use AWS Managed Rules** — Enable the `AWSManagedRulesSQLiRuleSet` rule group. It detects patterns like `' OR 1=1`, `UNION SELECT`, `DROP TABLE`, etc.

2. **Create a Custom Rule** for targeted protection on `/login` path:
   - **Inspect:** `URI path` contains `/login` AND `Body` contains SQL patterns
   - **Action:** Block

3. **Enable body inspection** — Ensure the Web ACL has body size limit configured (default is 8 KB, can be raised to 64 KB).

4. **Start with Count mode** before switching to Block — This avoids false positives during testing.

5. **Enable WAF logging** to S3/CloudWatch to monitor blocked requests.

```
Rule Priority (recommended order):
1. IP Allow-list (whitelist your admin IPs) → Allow
2. Rate-based rule (prevent brute force)    → Block
3. AWS SQLi Managed Rule Group              → Block
4. Custom SQL rule on /login endpoint       → Block
5. Default action                           → Allow
```

{{< /qa >}}

{{< qa num="3" q="Your application is receiving 50,000 requests per minute from a single IP during a flash sale. WAF is in place. How do you handle this?" level="advanced" >}}

**Ans:**

1. **Rate-Based Rule in WAF:**
   - Aggregate by `IP address`
   - Set threshold: e.g., `2000 requests per 5-minute window`
   - Action: `Block` (auto-unblocks when rate drops)

2. **AWS Shield Advanced** — For volumetric DDoS (Layer 3/4), WAF alone isn't enough. Shield Advanced handles SYN floods, UDP floods at network layer.

3. **CloudFront in front of ALB** — Absorbs global traffic, applies geo-restriction, reduces origin load.

4. **Scope-down statement** — Narrow rate-based rules to specific URIs:
   ```
   Rate-based rule:
     Scope-down: URI path starts with /api/checkout
     Threshold: 100 per 5 minutes per IP
     Action: Block
   ```

5. **Dynamic IP blocking via Lambda** — Parse WAF logs in near real-time; add aggressive IPs to an IP set and update the WAF rule automatically.

---

{{< /qa >}}

{{< qa num="4" q="You are asked to allow traffic only from India and the US, and block all other countries. How do you implement this in WAF?" level="advanced" >}}

**Ans:**

1. **Create a Geo-Match Rule in WAF:**
   - Match condition: `Originates from a country` NOT IN `[IN, US]`
   - Action: `Block`

2. **Rule configuration:**
   ```
   Rule type: Regular rule
   Statement: Geographic match
   Country codes: NOT IN → IN (India), US (United States)
   Action: Block
   ```

3. **Alternative using CloudFront** — CloudFront also has built-in geo-restriction under *Distribution → Security → Restrictions* but WAF gives more granular control (you can combine geo + other conditions).

4. **Edge case:** VPN users can bypass geo-blocking. To handle:
   - Enable **AWS WAF Bot Control** which can identify VPN/proxy traffic.
   - Or integrate with a third-party IP reputation list.

5. **Caveat:** Geo-match is based on IP geolocation, not the user's actual location. Accuracy is ~99% for country-level.

{{< /qa >}}

{{< qa num="5" q="Your product catalog is being scraped by bots, increasing server load and AWS costs. How do you use WAF to handle this?" level="advanced" >}}


**Ans:**

1. **Enable AWS WAF Bot Control Managed Rule Group:**
   - `CommonBotControl` — blocks known bots (scrapers, crawlers), allows verified bots (Googlebot).
   - `TargetedBotControl` — more advanced detection (TGT_VolumetricIpTokenAbsent, etc.)

2. **CAPTCHA action** — For suspected bots (not verified bad bots), use `CAPTCHA` action instead of Block to challenge users.

3. **Challenge action** — Silent browser challenge (JavaScript challenge) to verify the client is a real browser.

4. **Rate-based rule per IP** — Add a secondary layer: if same IP hits `/products` more than 500 times/5min → Block.

5. **Custom rules using request fingerprinting:**
   - Block requests without `User-Agent` header
   - Block requests with known scraping tool signatures (`python-requests`, `scrapy`, `curl`)
   ```
   Rule: Header "user-agent" contains "python-requests" → Block
   ```

6. **robots.txt** — Not a WAF feature, but complement WAF by defining scraping rules for good bots.


{{< /qa >}}

{{< qa num="6" q="Your security audit requires your application to be protected against the OWASP Top 10 vulnerabilities using WAF. What is your approach?" level="advanced" >}}


**Ans:**

| OWASP Threat | WAF Managed Rule Group |
|---|---|
| SQL Injection (A03) | `AWSManagedRulesSQLiRuleSet` |
| XSS - Cross-Site Scripting (A03) | `AWSManagedRulesKnownBadInputsRuleSet` |
| Command Injection (A03) | `AWSManagedRulesLinuxRuleSet`, `AWSManagedRulesUnixRuleSet` |
| Log4Shell / Known exploits (A06) | `AWSManagedRulesKnownBadInputsRuleSet` |
| Broken Access Control (A01) | Custom rules + Shield |
| Security Misconfiguration (A05) | `AWSManagedRulesCommonRuleSet` |
| SSRF (A10) | Custom rules on internal IPs |

**Step-by-step:**
1. Enable `AWSManagedRulesCommonRuleSet` (CRS) — covers a broad range of OWASP threats.
2. Add domain-specific rule sets (Linux, Windows, PHP, WordPress as applicable).
3. Set all groups to **Count mode first**, review false positives.
4. Switch to **Block mode** after tuning.
5. Enable **WAF logging** to S3, then use Athena to query blocked requests.
6. Set up **CloudWatch alarms** on `BlockedRequests` metric.


{{< /qa >}}

{{< qa num="7" q="A critical zero-day vulnerability (e.g., Log4Shell) is announced. Your application uses Log4j. How do you use WAF as a virtual patch while your team works on the fix?" level="advanced" >}}


**Ans:**

1. **Immediate:** AWS released an emergency managed rule update for Log4Shell within hours. Enable:
   - `AWSManagedRulesKnownBadInputsRuleSet` → includes `Log4JRCE_HEADER` and `Log4JRCE_BODY` rules.

2. **Custom rule for defense-in-depth:**
   ```
   Inspect: All headers + body + URI
   Match: Contains "${jndi:"
   Action: Block
   ```

3. **Count first, switch to Block** — Even in an emergency, briefly run in Count (5-10 min) to confirm the rule triggers correctly and assess false positive rate.

4. **Scope:** If only certain endpoints are vulnerable, scope the rule to those endpoints only to reduce false positive risk.

5. **Monitor CloudWatch** — Set alarm if `CountedRequests` for the emergency rule spikes, which means active exploitation attempts.

6. **Communicate:** WAF is a virtual patch (temporary), not a fix. Coordinate with dev team to patch the actual dependency.


{{< /qa >}}

{{< qa num="8" q="Security team reports that an attacker is bypassing your WAF rules using encoding tricks (e.g., URL encoding, Base64, case manipulation). How do you respond?" level="advanced" >}}

**Ans:**

1. **AWS WAF auto-decodes** common encoding types before matching:
   - URL decoding
   - HTML entity decoding
   - Lowercase transformation
   - Command line transformation
   But only if you configure **text transformations** in your rules.

2. **Add transformations in custom rules:**
   ```
   Transformations (apply in order):
   1. URL_DECODE
   2. HTML_ENTITY_DECODE
   3. LOWERCASE
   4. COMPRESS_WHITE_SPACE
   ```

3. **Stack multiple transformations** — WAF applies them in sequence before matching, catching double-encoded payloads.

4. **Use managed rules** — AWS keeps managed rule groups updated against known bypass techniques.

5. **Payload obfuscation examples WAF handles:**
   - `%27 OR %271%27%3D%271` → decoded to `' OR '1'='1`
   - `&#x27; OR 1=1` → HTML entity decoded
   - `SeLeCt * FrOm` → lowercased to `select * from`

6. **For Base64 bypass** — Add a custom rule that base64-decodes the body:
   - This requires a Lambda@Edge or custom application-layer check, as WAF doesn't natively base64-decode arbitrary request bodies.


{{< /qa >}}

{{< qa num="9" q="After enabling WAF, legitimate users are being blocked. How do you troubleshoot and fix false positives?" level="advanced" >}}


**Ans:**

1. **Identify the blocking rule:**
   - Enable WAF logging → logs show `ruleGroupId`, `terminatingRuleId`, and matched `fieldToMatch`.
   - Query logs in Athena or CloudWatch Logs Insights.

2. **Switch to Count mode** for the offending rule temporarily to stop the block while investigating.

3. **Analyze the request:**
   - What field matched? (Header? Body? URI?)
   - What was the actual value that triggered the rule?

4. **Options to fix:**
   - **Scope-down statement** — Narrow the rule to only apply to specific paths, not the one causing false positives.
   - **Rule exclusion (Label match exception)** — Exclude specific rules within a managed rule group.
   - **IP allow-list** — Add known-good IP ranges (corporate office, CDN IPs) to an IP set with `Allow` and place it at the top priority.
   - **Override rule action** — Change a specific rule within a managed rule group from `Block` to `Count`.

5. **Example — Managed rule false positive fix:**
   ```
   AWSManagedRulesCommonRuleSet → Rule: SizeRestrictions_BODY
   Problem: Large legitimate file uploads are blocked.
   Fix: Override SizeRestrictions_BODY to Count,
        Create a custom rule to block only on /upload-malicious path.
   ```


{{< /qa >}}

{{< qa num="10" q="Your organization has 50 AWS accounts across multiple business units. How do you manage WAF rules consistently across all accounts?" level="advanced" >}}

**Ans:**

1. **AWS Firewall Manager** — Central management service for WAF policies across AWS Organizations.
   - Define a WAF policy in the Firewall Manager admin account.
   - Automatically applies to all accounts/OUs in the organization.
   - Ensures new accounts are automatically protected.

2. **Managed rule groups in Firewall Manager policy:**
   - Baseline rules (common rule set, SQLi, XSS) applied to all.
   - BU-specific rules managed locally.

3. **Architecture:**
   ```
   AWS Organizations (Management Account)
   └── Firewall Manager Admin Account
       ├── WAF Policy: Baseline Rules → All OUs
       ├── WAF Policy: PCI Compliant Rules → Finance OU
       └── WAF Policy: HIPAA Rules → Healthcare OU
   ```

4. **AWS Config** — Use Config rules to detect Web ACLs that are not compliant (e.g., missing required rules).

5. **Centralized logging** — All WAF logs → central S3 bucket in security account → Athena/Security Lake for analysis.


{{< /qa >}}


{{< qa num="11" q="Your compliance team requires all WAF decisions (allow/block) to be logged and retained for 1 year. How do you set this up?" level="advanced" >}}

**Ans:**

1. **Enable WAF logging:**
   - Destination options: **S3 bucket**, **CloudWatch Logs**, **Kinesis Data Firehose**
   - For long-term retention + querying → use **Kinesis Firehose → S3**.

2. **S3 bucket configuration:**
   - Enable **S3 Object Lock** (WORM) for compliance.
   - Set **S3 lifecycle policy**: Standard → S3 Glacier after 90 days → delete after 365 days.
   - Enable **S3 server-side encryption** (SSE-KMS).

3. **Log filtering** — By default, WAF logs ALL requests. To reduce cost, filter to log only:
   - Blocked requests
   - Requests matching specific rules

4. **CloudWatch Alarms** — Alarm on `BlockedRequests` metric > threshold.

5. **Athena queries** — Create a table over S3 WAF logs with partitioning by date for cost-effective querying.

6. **Security Lake integration** — AWS Security Lake can ingest WAF logs in OCSF format for centralized security analysis.


{{< /qa >}}

{{< qa num="12" q="What is the difference between a Web ACL default action and a rule action?" level="advanced" >}}


**Ans:**
- **Rule action** — Applied when a request matches a specific rule (`Allow`, `Block`, `Count`, `CAPTCHA`, `Challenge`).
- **Default action** — Applied to requests that **don't match any rule** in the Web ACL. Options: `Allow` or `Block`.
- Best practice: Default action should be `Allow` if you're using a blocklist approach (block known bad), or `Block` if using an allowlist approach (only allow known good).

{{< /qa >}}



{{< qa num="13" q="What is the difference between Count and Block actions in WAF?" level="advanced" >}}

**Ans:**
| Feature | Count | Block |
|---|---|---|
| Stops request? | ❌ No, request passes through | ✅ Yes, returns 403 |
| Increments CloudWatch metric? | ✅ Yes | ✅ Yes |
| Logs the match? | ✅ Yes | ✅ Yes |
| Use case | Testing/monitoring rules | Production enforcement |

**Best practice:** Always test new rules in Count mode before switching to Block.


{{< /qa >}}

{{< qa num="14" q="What are Labels in AWS WAF?" level="advanced" >}}

**Answer:**
Labels are metadata tags added to requests by WAF rules as they evaluate. Subsequent rules can match on labels added by earlier rules.

**Use case example:**
```
Rule 1: If IP is from a Tor exit node → Add label "network:tor"
Rule 2: If label "network:tor" exists AND URI contains "/admin" → Block
```

This enables **chained/contextual rule logic** without complex AND conditions in a single rule.

{{< /qa >}}

{{< qa num="15" q="What is a Scope-down statement?" level="advanced" >}}


**Ans:**
A scope-down statement narrows the set of requests that a rate-based rule applies to.

**Example:** Rate-limit only login attempts, not all traffic:
```
Rate-based rule:
  Scope-down: URI path = /api/login
  Aggregate by: IP
  Threshold: 10 requests / 5 minutes
  Action: Block
```

Without scope-down, the rate limit counts ALL requests from an IP. With scope-down, it only counts requests to `/api/login`.

{{< /qa >}}

{{< qa num="16" q="What are the types of rules in AWS WAF?" level="advanced" >}}

**Ans:**

1. **Regular rules** — Match conditions evaluated as true/false. If match → apply action.
2. **Rate-based rules** — Track request rate per IP (or other dimension). If threshold exceeded → apply action. Auto-resets when rate drops.
3. **Rule groups** — Containers of multiple rules. Can be:
   - **Managed rule groups** (AWS or Marketplace)
   - **Custom rule groups** (your own)

---

**Q: What are the inspectable components of an HTTP request in WAF?**

**Answer:**
WAF can inspect any of the following:
- **URI path** — `/api/v1/users`
- **Query string** — `?id=1&name=test`
- **HTTP method** — GET, POST, PUT, DELETE
- **Headers** — Specific headers or all headers
- **Cookies** — Specific cookies or all
- **Body** — Raw body (first 8 KB by default, up to 64 KB)
- **Source IP** — Origin IP address
- **JSON body** — Parse and inspect JSON keys/values
- **HTTP version**



{{< /qa >}}

{{< qa num="17" q="What are AWS Managed Rule Groups and which ones are most commonly used?" level="advanced" >}}


**Answer:**

| Rule Group | Protection |
|---|---|
| `AWSManagedRulesCommonRuleSet` | General OWASP threats, core rule set |
| `AWSManagedRulesSQLiRuleSet` | SQL injection patterns |
| `AWSManagedRulesKnownBadInputsRuleSet` | Log4Shell, SSRF, path traversal |
| `AWSManagedRulesLinuxRuleSet` | Linux-specific exploits |
| `AWSManagedRulesWindowsRuleSet` | Windows/PowerShell exploits |
| `AWSManagedRulesPHPRuleSet` | PHP-specific attacks |
| `AWSManagedRulesWordPressRuleSet` | WordPress vulnerabilities |
| `AWSManagedRulesAmazonIpReputationList` | Known malicious IPs (botnets, scanners) |
| `AWSManagedRulesBotControlRuleSet` | Bot detection & management |

**Each rule group consumes WCU (WAF Capacity Units).** A Web ACL has a maximum of **5000 WCU**.


{{< /qa >}}

{{< qa num="18" q="How does AWS WAF differ from AWS Shield?" level="advanced" >}}

**Answer:**

| Feature | AWS WAF | AWS Shield |
|---|---|---|
| Layer | Layer 7 (Application) | Layer 3/4 (Network/Transport) |
| Protects against | SQLi, XSS, bots, OWASP | DDoS — SYN floods, UDP floods, volumetric |
| Pricing | Pay per Web ACL, rule, request | Shield Standard: Free; Shield Advanced: $3,000/month |
| Configuration | Rules-based (user-defined) | Automatic |
| Works with | ALB, CloudFront, API GW | CloudFront, ALB, EC2, Route 53 |

**Best practice:** Use WAF + Shield Advanced together for comprehensive protection.

{{< /qa >}}

{{< qa num="18" q="Can WAF protect against DDoS attacks?" level="advanced" >}}

**Ans:**
Partially. WAF can mitigate **Layer 7 DDoS** (application-layer floods) using:
- Rate-based rules (block IPs exceeding request threshold)
- Bot Control (identify and block automated traffic)

However, WAF **cannot** protect against Layer 3/4 DDoS (network floods). For that, use:
- **AWS Shield Standard** (free, always on)
- **AWS Shield Advanced** (paid, with DDoS response team)

{{< /qa >}}

{{< qa num="19" q="What is CAPTCHA action in WAF and when should you use it?" level="advanced" >}}

**Ans:**
The `CAPTCHA` action presents an AWS-managed CAPTCHA puzzle to the user. If passed, WAF allows the request. If failed, it's blocked.

**Use cases:**
- Suspected bot traffic that might be legitimate users (gray area bots)
- Login pages to prevent credential stuffing
- Form submission pages to prevent spam

**How it works:**
1. WAF intercepts the request.
2. Returns a 405 response with a CAPTCHA challenge page.
3. User solves CAPTCHA → receives a token.
4. Subsequent requests carry the token → WAF allows them (token valid for a configurable time).

**Challenge vs CAPTCHA:**
- `Challenge` — Silent JavaScript browser challenge (no user interaction, detects headless browsers)
- `CAPTCHA` — Visible puzzle requiring user interaction


{{< /qa >}}

{{< qa num="20" q="What are WAF Capacity Units (WCU) and why do they matter?" level="advanced" >}}

**Ans:**
WCU measures the processing cost of a Web ACL's rules. Each rule type consumes a different amount of WCU:

| Rule Type | WCU Cost |
|---|---|
| IP set match | 1 WCU |
| String match (exact) | 2 WCU |
| String match (contains) | 10 WCU |
| Regex match | 3–25 WCU |
| Rate-based rule | 2 WCU + scope-down WCU |
| Managed rule group | Varies (e.g., CommonRuleSet = 700 WCU) |

**Maximum per Web ACL: 5000 WCU.** Exceeding this limit requires removing or optimizing rules.

 
{{< /qa >}}


{{< qa num="21" q="How does WAF handle HTTPS/TLS traffic?" level="advanced" >}}


**Ans:**
WAF inspects **decrypted HTTP traffic** after TLS termination. The TLS termination happens at:
- **ALB** — Terminates TLS, then WAF inspects plaintext HTTP.
- **CloudFront** — Terminates TLS at the edge, then WAF inspects before forwarding to origin.

WAF does **not** decrypt traffic itself. It relies on the associated service (ALB/CloudFront) to handle TLS.


{{< /qa >}}



