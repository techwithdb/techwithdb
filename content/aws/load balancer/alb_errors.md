---
title: "ALB Error Codes — Complete Troubleshooting Guide"
description: " ALB Error Codes — Complete Troubleshooting Guide For Cloud, DevOps Engineer"
---

A comprehensive reference for HTTP errors encountered in **AWS Application Load Balancer (ALB)** and **Nginx**, with root causes and step-by-step solutions.

---
<a id="table-of-contents"></a>
## Table of Contents

### AWS ALB Errors
- [400 — Bad Request (ALB)](#alb-400)
- [401 — Unauthorized (ALB)](#alb-401)
- [403 — Forbidden (ALB)](#alb-403)
- [408 — Request Timeout (ALB)](#alb-408)
- [460 — Client Closed Connection (ALB)](#alb-460)
- [463 — X-Forwarded-For Header Too Large (ALB)](#alb-463)
- [500 — Internal Server Error (ALB)](#alb-500)
- [502 — Bad Gateway (ALB)](#alb-502)
- [503 — Service Unavailable (ALB)](#alb-503)
- [504 — Gateway Timeout (ALB)](#alb-504)
- [561 — Unauthorized (OIDC) (ALB)](#alb-561)


---

## AWS Application Load Balancer (ALB) Errors

---

### <a name="alb-400"></a>400 — Bad Request (ALB)

**Description:** The ALB received a malformed or invalid HTTP request it could not process.

**Common Causes:**
- Malformed HTTP headers or request syntax
- Invalid HTTP version
- Request header exceeds ALB limits (max 8KB per header, 32 headers total)
- HTTP/1.0 requests with missing `Host` header

**Solutions:**
1. Inspect the request using ALB access logs — enable them in the ALB attributes.
2. Check the `Host` header is present and valid.
3. Reduce header sizes; ALB allows a max of **8192 bytes** per header value.
4. Validate that the HTTP method and version are standard.
5. Use a packet capture or proxy tool (like Burp Suite or curl verbose mode) to inspect the raw request.

```bash
# Test request manually
curl -v -H "Host: yourdomain.com" http://<ALB-DNS>/path
```
[↑ Back to Table of Contents](#table-of-contents)
---

### <a name="alb-401"></a>401 — Unauthorized (ALB)

**Description:** The request requires authentication, and valid credentials were not provided.

**Common Causes:**
- Missing or expired authentication token
- Misconfigured ALB authentication rules (OIDC/Cognito)
- Invalid session cookies

**Solutions:**
1. Check ALB listener rules for authentication actions (Cognito or OIDC).
2. Ensure the identity provider (IdP) is reachable from the ALB.
3. Validate client tokens are being sent correctly in the `Authorization` header.
4. Review Cognito User Pool settings — check token expiry.
5. Test with a fresh browser session or cleared cookies.

[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-403"></a>403 — Forbidden (ALB)

**Description:** The ALB or WAF is blocking the request due to access control rules.

**Common Causes:**
- AWS WAF rule blocking the request
- ALB listener rules explicitly returning 403
- Security group not allowing the client IP
- ALB access denied due to SSL/TLS certificate mismatch

**Solutions:**
1. **Check AWS WAF:** Go to WAF console → Web ACLs → review blocked requests in sampled requests.
2. **Review ALB listener rules:** Confirm no rule explicitly returns `Fixed response: 403`.
3. **Check Security Groups:** Ensure inbound rules allow traffic on port 80/443 from the client.
4. **Review SSL Policy:** Mismatch in SSL certificate domains returns 403 from some clients.
5. Enable ALB access logs and trace the `x-amzn-trace-id`.

```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxxxxx
```
[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-408"></a>408 — Request Timeout (ALB)

**Description:** The client took too long to send the complete request.

**Common Causes:**
- Slow client sending headers or body incrementally
- Network latency between client and ALB
- ALB idle timeout reached before request was complete

**Solutions:**
1. Increase ALB idle timeout (default 60s): Go to **ALB → Attributes → Idle timeout**.
2. Optimize client-side request generation speed.
3. Ensure no proxy between client and ALB is buffering requests.
4. Verify network conditions — especially for mobile or slow connections.

```bash
# Update ALB idle timeout via CLI
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <ALB-ARN> \
  --attributes Key=idle_timeout.timeout_seconds,Value=120
```
[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-460"></a>460 — Client Closed Connection (ALB)

**Description:** The client closed the connection before the ALB could send a response. This is an ALB-specific error code (not standard HTTP).

**Common Causes:**
- Client timeout set too low (client gave up waiting)
- User navigated away or cancelled the request
- Load testing tools hitting connection limits

**Solutions:**
1. Increase backend response time — optimize your application.
2. Investigate slow target instances: check CPU, memory, and DB query performance.
3. Use ALB access logs to identify the request duration and which target responded slowly.
4. If this is load testing, ensure your testing tool has appropriate timeout settings.

[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-463"></a>463 — X-Forwarded-For Header Too Large (ALB)

**Description:** The `X-Forwarded-For` header in the request exceeded the ALB's size limit.

**Common Causes:**
- Request passed through many proxies, each appending to `X-Forwarded-For`
- Malformed or spoofed `X-Forwarded-For` header

**Solutions:**
1. Strip or truncate the `X-Forwarded-For` header before reaching the ALB using a reverse proxy.
2. Use a WAF rule to block requests with abnormally large `X-Forwarded-For` headers.
3. Investigate if an upstream proxy is incorrectly appending IPs.

[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-500"></a>500 — Internal Server Error (ALB)

**Description:** An unexpected error occurred inside the ALB itself (not the backend target).

**Common Causes:**
- ALB misconfiguration (e.g., invalid header manipulation rules)
- Bug in ALB authentication rules (OIDC/Cognito)
- Lambda function target returned an invalid response format

**Solutions:**
1. Check if targets are Lambda functions — ensure the Lambda response includes `statusCode`, `headers`, and `body` fields in the correct format.
2. Review ALB listener rules for syntax errors in header modifications.
3. Check CloudWatch Logs for ALB or Lambda-related errors.
4. Open an AWS Support ticket if the error is consistent with no visible misconfiguration.

[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-502"></a>502 — Bad Gateway (ALB)

**Description:** The ALB received an invalid response from the backend target (EC2, ECS, Lambda, etc.).

**Common Causes:**
- Target returned an invalid or empty HTTP response
- Target crashed or restarted mid-request
- Application not listening on the expected port
- Health check misconfigured — unhealthy targets receiving traffic

**Solutions:**
1. **Check target health:** ALB console → Target Groups → Targets tab.
2. **Review target logs:** Application logs on EC2/ECS for crashes or errors.
3. **Confirm port:** Ensure application is listening on the registered port.
4. **Fix health check:** Update health check path/port to match a valid endpoint.
5. Ensure the backend returns a valid HTTP response (status + headers + body).

```bash
# Describe target health
aws elbv2 describe-target-health \
  --target-group-arn <TARGET-GROUP-ARN>
```

[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-503"></a>503 — Service Unavailable (ALB)

**Description:** No healthy targets are available in the target group to serve the request.

**Common Causes:**
- All targets are unhealthy or deregistered
- Target group is empty (no registered targets)
- Auto Scaling group has not yet launched instances
- Health check threshold not met after deployment

**Solutions:**
1. Go to **ALB → Target Groups → Targets** — check for healthy targets.
2. Register targets manually if the group is empty.
3. Fix failing health checks — check path, port, and expected HTTP response code.
4. Review Auto Scaling group minimum instance count.
5. Temporarily increase health check interval to allow instances to warm up.

```bash
# Register a target manually
aws elbv2 register-targets \
  --target-group-arn <TARGET-GROUP-ARN> \
  --targets Id=<INSTANCE-ID>
```
[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-504"></a>504 — Gateway Timeout (ALB)

**Description:** The backend target did not respond within the ALB timeout period.

**Common Causes:**
- Application processing takes longer than ALB idle timeout (default 60s)
- Database queries or external API calls causing slow responses
- Network issues between ALB and targets (VPC routing, NACLs)
- Target is overloaded (high CPU/memory)

**Solutions:**
1. Increase **ALB idle timeout** to match your longest expected response time.
2. Optimize slow application paths — profile DB queries, add caching.
3. Check **NACLs and Security Groups** for rules blocking return traffic.
4. Scale out your target group — add more instances or increase ECS task count.
5. Enable ALB access logs and look at `target_processing_time` field.

```bash
# Increase idle timeout
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <ALB-ARN> \
  --attributes Key=idle_timeout.timeout_seconds,Value=300
```

[↑ Back to Table of Contents](#table-of-contents)

---

### <a name="alb-561"></a>561 — Unauthorized (OIDC) (ALB)

**Description:** ALB-specific error when the identity provider (IdP) returns a non-2xx response during OIDC authentication.

**Common Causes:**
- IdP (Okta, Google, Azure AD) is down or unreachable
- OIDC client ID or secret is incorrect
- Token endpoint URL is misconfigured
- Clock skew between ALB and IdP

**Solutions:**
1. Verify the OIDC configuration in **ALB Listener → Authentication** settings.
2. Test the IdP token endpoint manually using curl.
3. Ensure the ALB's VPC can reach the IdP's HTTPS endpoint (check routing, NAT Gateway).
4. Rotate the OIDC client secret in both the IdP and ALB configuration.
5. Check for time synchronization issues on your infrastructure.

[↑ Back to Table of Contents](#table-of-contents)

---
