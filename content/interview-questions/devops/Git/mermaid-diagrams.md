---
title: "Mermaid Architecture diagrams"
description: ""
date: 2026-04-16T14:26:30+05:30
author: "DB"
tags: ["Git", "DevOps", "CI/CD", "Interview", "Version Control", "GitHub", "GitLab"]
tool: "git"
level: "All Levels"
question_count: 30
draft: true
---

<div class="qa-list">

# Flow Chart (Most Common)

<div class="mermaid">
graph TD
A[Start] --> B[Process]
B --> C{Decision}
C -->|Yes| D[Done]
C -->|No| B
</div>





## Blue green deployment
<div class="mermaid">
graph TD
A[User Traffic] --> B[Load Balancer]
B --> C[Blue Environment]
C --> D{New Version Ready?}
D -->|Yes| E[Deploy to Green]
E --> F[Health Checks]
F --> G{Healthy?}
G -->|Yes| H[Switch Traffic to Green]
G -->|No| I[Rollback to Blue]
H --> J[Monitor]
I --> J
</div>


# Sequence Diagram

<div class="mermaid">
sequenceDiagram
participant User
participant Server
User->>Server: Request Data
Server-->>User: Response Data
</div>

# State Diagram

<div class="mermaid">
stateDiagram-v2
[*] --> Idle
Idle --> Processing
Processing --> Success
Processing --> Failure
Success --> [*]
Failure --> [*]
</div>

# Class Diagram

<div class="mermaid">
classDiagram
class User {
  +name
  +login()
}
class Order {
  +id
  +create()
}
User --> Order
</div>

# ER Diagram

<div class="mermaid">
erDiagram
USER ||--o{ ORDER : places
USER {
  string name
}
ORDER {
  int id
}
</div>

# Gantt Chart

<div class="mermaid">
gantt
title Project Timeline
dateFormat  YYYY-MM-DD
section Build
Task1 :a1, 2026-04-01, 3d
Task2 :after a1, 2d
</div>

# Pie Chart

<div class="mermaid">
pie
title Tech Usage
"DevOps" : 40
"AWS" : 30
"Docker" : 30
</div>

# Git Graph

<div class="mermaid">
gitGraph
commit
branch feature
commit
checkout main
merge feature
</div>

# journey Diagram
<div class="mermaid">
journey
title User Journey
section Login
User logs in : 5: User
section Usage
User uses app : 4: User
</div>

# Quadrant Chart

<div class="mermaid">
quadrantChart
title Skill Matrix
x-axis Low --> High
y-axis Low --> High
"DevOps" : [0.9, 0.8]
"AWS" : [0.8, 0.9]
</div>

# Requirement Diagram

<div class="mermaid">
requirementDiagram
requirement R1 {
  id: 1
  text: System must scale
}
</div>

# Mind Map

<div class="mermaid">
mindmap
  root((DevOps))
    CI/CD
    Docker
    Kubernetes
</div>



</div>
