---
title: "Linux Interview Questions"
description: ""
date: 2026-04-08T15:03:53+05:30
author: "DB"
tags: []
tool: ""       # aws | docker | kubernetes | jenkins | prometheus | grafana
level: "All Levels"
question_count: 0
draft: true
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

</div>
