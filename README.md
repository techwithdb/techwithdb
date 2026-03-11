# ☁️ CloudOps Hub — AWS & DevOps Tech Blog

A fast, beautiful, **free-to-host** static blog built with **Hugo** for AWS and DevOps content. Auto-deployed to **GitHub Pages** via **GitHub Actions** on every `git push`.

> 🌐 **Live demo:** `https://yourusername.github.io/cloudops-blog/`

---

## 📋 Table of Contents

1. [Why Hugo?](#why-hugo)
2. [Repository Architecture](#repository-architecture)
3. [Features](#features)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Writing Content](#writing-content)
6. [Shortcodes Reference](#shortcodes-reference)
7. [Customization](#customization)
8. [Google Form Setup](#google-form-setup)
9. [Deployment](#deployment)
10. [Content Roadmap](#content-roadmap)

---

## Why Hugo?

Hugo is the **best choice** for a technical blog hosted on GitHub Pages:

| Feature | Hugo ✅ | Jekyll | Next.js | Gatsby |
|---------|--------|--------|---------|--------|
| **Build speed** | < 1 second | Slow (Ruby) | Medium | Slow |
| **GitHub Pages native** | ✅ Yes | ✅ Yes | ❌ Extra config | ❌ Extra config |
| **No Node/Ruby runtime** | ✅ Single binary | ❌ Ruby | ❌ Node | ❌ Node |
| **Themes/templates** | 400+ | 200+ | Custom | Custom |
| **Shortcodes** | ✅ Powerful | Limited | MDX | MDX |
| **Maintenance** | Minimal | Ruby gems | npm deps | npm deps |
| **Free hosting** | ✅ GitHub Pages | ✅ | Vercel/Netlify | Vercel/Netlify |

**Hugo wins** because it's blazingly fast, a single binary with zero dependencies, and has first-class GitHub Pages support.

---

## Repository Architecture

```
cloudops-blog/
│
├── .github/
│   └── workflows/
│       └── deploy.yml              ← Auto-deploy on push to main
│
├── archetypes/
│   ├── default.md                  ← Template for new tutorial posts
│   └── interview-questions.md      ← Template for Q&A posts
│
├── content/                        ◀ ALL BLOG CONTENT LIVES HERE
│   │
│   ├── aws/                        ← AWS service tutorials
│   │   ├── _index.md               ← AWS section landing page
│   │   ├── ec2/
│   │   │   ├── _index.md           ← EC2 sub-section landing page
│   │   │   └── ec2-complete-guide.md
│   │   ├── s3/
│   │   ├── vpc/
│   │   ├── lambda/
│   │   ├── rds/
│   │   ├── eks/
│   │   ├── iam/
│   │   ├── cloudformation/
│   │   ├── route53/
│   │   └── cloudwatch/
│   │
│   ├── devops/                     ← DevOps tool tutorials
│   │   ├── _index.md
│   │   ├── docker/
│   │   ├── kubernetes/
│   │   ├── jenkins/
│   │   ├── github-actions/
│   │   ├── prometheus/
│   │   └── grafana/
│   │
│   ├── interview-questions/        ← Interview Q&A with accordions
│   │   ├── _index.md
│   │   ├── aws/                    ← EC2, S3, VPC, Lambda, RDS, EKS, IAM Q&A
│   │   └── devops/                 ← Docker, K8s, Jenkins, GHA, Prometheus, Grafana Q&A
│   │
│   ├── blog/                       ← General articles
│   └── contact.md                  ← Contact page with embedded Google Form
│
├── layouts/                        ← Hugo HTML templates
│   ├── _default/
│   │   ├── baseof.html             ← Master HTML shell (header + footer wrapper)
│   │   ├── list.html               ← Section listing pages
│   │   ├── single.html             ← Individual post pages
│   │   ├── page.html               ← Static pages (contact, about)
│   │   └── index.json              ← Search index JSON output
│   ├── index.html                  ← Homepage
│   ├── interview-questions/
│   │   ├── list.html               ← Interview section listing
│   │   └── single.html             ← Interview Q&A post (with accordion UI)
│   ├── partials/
│   │   ├── header.html             ← Sticky nav with dropdowns
│   │   ├── footer.html             ← 4-column footer
│   │   ├── breadcrumb.html         ← Breadcrumb navigation
│   │   ├── post-card.html          ← Reusable post card component
│   │   └── form-cta.html           ← Google Form call-to-action block
│   └── shortcodes/
│       ├── qa.html                 ← {{< qa >}} accordion Q&A
│       ├── callout.html            ← {{< callout >}} tip/warning/info boxes
│       └── rawhtml.html            ← {{< rawhtml >}} raw HTML embed
│
├── static/
│   ├── css/
│   │   └── main.css                ← Full light theme (1000+ lines, CSS variables)
│   ├── js/
│   │   └── main.js                 ← Search, TOC, accordion, copy-code, mobile nav
│   └── images/                     ← Logo, favicon, og-image
│
├── config.toml                     ← Hugo config (baseURL, params, nav menus)
├── .gitignore
└── README.md                       ← This file
```

---

## Features

| Feature | Details |
|---------|---------|
| **Light theme** | Clean white/slate design · AWS orange + blue accents · Fraunces display font |
| **Responsive** | Mobile-first, hamburger drawer, touch-friendly dropdowns |
| **Full-text search** | Client-side `Ctrl+K` search — no external service needed |
| **Interview Q&A** | Accordion with Basic/Intermediate/Advanced filter pills |
| **Google Form CTA** | On every post + embedded iframe on Contact page |
| **Auto TOC** | Sticky sidebar table of contents with active section tracking |
| **Code blocks** | Syntax highlighting (highlight.js) + one-click copy button |
| **Callout boxes** | `{{< callout type="tip/warn/danger/aws" >}}` shortcodes |
| **Reading progress bar** | Gradient bar at top of page on article views |
| **SEO** | Open Graph, Twitter Card, canonical URLs, sitemap, RSS feed |
| **CI/CD** | GitHub Actions auto-builds and deploys on every `git push main` |
| **Zero cost** | Hugo is free · GitHub Pages is free · GitHub Actions is free |

---

## Step-by-Step Setup

### Step 1 — Install Hugo Extended

```bash
# macOS (Homebrew)
brew install hugo

# Ubuntu / Debian
wget https://github.com/gohugoio/hugo/releases/download/v0.128.0/hugo_extended_0.128.0_linux-amd64.deb
sudo dpkg -i hugo_extended_0.128.0_linux-amd64.deb

# Windows (Chocolatey)
choco install hugo-extended

# Windows (Scoop)
scoop install hugo-extended

# Verify
hugo version
# Should show: hugo v0.128.0+extended ...
```

> ⚠️ Always install **extended** — required for SCSS compilation.

---

### Step 2 — Clone or Unzip the Project

```bash
# If you downloaded the ZIP
unzip cloudops-blog.zip
cd cloudops-blog

# Or initialize a new git repo
git init
git add .
git commit -m "feat: initial CloudOps Hub blog setup"
```

---

### Step 3 — Start Development Server

```bash
hugo server -D --navigateToChanged
# -D          = include draft posts
# --navigateToChanged = auto-open changed page in browser

# Open in browser:
# http://localhost:1313/cloudops-blog/
```

You should see the homepage with the hero section, AWS services grid, and DevOps tools.

---

### Step 4 — Personalize config.toml

Open `config.toml` and update these required fields:

```toml
# Line 1 — your GitHub Pages URL
baseURL = "https://YOURUSERNAME.github.io/cloudops-blog/"

[params]
  author       = "Your Full Name"
  github       = "https://github.com/YOURUSERNAME"
  linkedin     = "https://linkedin.com/in/YOURPROFILE"
  twitter      = "https://twitter.com/YOURHANDLE"

  # ⬇ IMPORTANT: Replace with your actual Google Form URL
  googleFormURL = "https://forms.gle/YOUR_FORM_ID_HERE"

  # Optional: Google Analytics 4
  googleAnalytics = ""  # e.g. G-XXXXXXXXXX

copyright = "© 2025 Your Name. All rights reserved."
```

---

### Step 5 — Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `cloudops-blog`
3. Set visibility to **Public** (required for free GitHub Pages)
4. **Do NOT** initialize with README (you already have one)

```bash
git remote add origin https://github.com/YOURUSERNAME/cloudops-blog.git
git branch -M main
git push -u origin main
```

---

### Step 6 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment → Source**, select **GitHub Actions**
4. Click **Save**

Now push any commit to `main` — the workflow will build and deploy automatically!

```bash
# Trigger a deployment
git commit --allow-empty -m "trigger: initial deploy"
git push
```

5. Wait ~60 seconds, then visit: `https://YOURUSERNAME.github.io/cloudops-blog/`

---

### Step 7 — Set Up Google Form (Optional but Recommended)

See the [Google Form Setup](#google-form-setup) section below.

---

### Step 8 — Write Your First Tutorial

```bash
# Create a new EC2 tutorial
hugo new aws/ec2/ec2-security-groups.md

# Create a new Docker tutorial
hugo new devops/docker/docker-networking.md

# Create interview questions
hugo new interview-questions/aws/s3-interview-questions.md
```

Edit the file, set `draft: false`, and push to deploy!

---

## Writing Content

### Front Matter Reference

Every content file starts with YAML front matter:

```yaml
---
title: "Your Post Title"
description: "SEO description (150–160 chars ideal)"
date: 2024-03-15
author: "Your Name"
tags: ["aws", "ec2", "security"]
series: "AWS Fundamentals"    # Groups related posts in sidebar
level: "Intermediate"         # Beginner | Intermediate | Advanced
draft: false                  # Set false to publish
---
```

### Content File Locations

| Content Type | Location | URL |
|-------------|----------|-----|
| EC2 tutorial | `content/aws/ec2/my-post.md` | `/aws/ec2/my-post/` |
| Docker guide | `content/devops/docker/my-post.md` | `/devops/docker/my-post/` |
| AWS interview Q&A | `content/interview-questions/aws/iam-questions.md` | `/interview-questions/aws/iam-questions/` |
| DevOps Q&A | `content/interview-questions/devops/jenkins-questions.md` | `/interview-questions/devops/jenkins-questions/` |
| Blog post | `content/blog/my-post.md` | `/blog/my-post/` |

---

## Shortcodes Reference

### `{{< qa >}}` — Interview Q&A Accordion

Use inside interview question posts:

```markdown
{{</* qa num="1" q="What is Docker and why use it?" level="basic" */>}}
**Docker** packages apps into containers...

```bash
docker run hello-world
```
{{</* /qa */>}}
```

**Parameters:**
- `num` — question number displayed in badge
- `q` — the question text
- `level` — `basic` | `intermediate` | `advanced`

---

### `{{< callout >}}` — Alert/Tip Boxes

```markdown
{{</* callout type="tip" title="Pro Tip" */>}}
Always use `--no-reboot` when creating AMIs from running instances.
{{</* /callout */>}}

{{</* callout type="warn" title="Warning" */>}}
Never commit AWS credentials to Git.
{{</* /callout */>}}

{{</* callout type="danger" */>}}
This will delete all data permanently.
{{</* /callout */>}}

{{</* callout type="info" */>}}
This feature is only available in us-east-1.
{{</* /callout */>}}

{{</* callout type="aws" title="AWS Free Tier" */>}}
This service is included in the AWS Free Tier.
{{</* /callout */>}}
```

---

### `{{< rawhtml >}}` — Embed Raw HTML

Use to embed Google Form iframes, videos, or custom HTML:

```markdown
{{</* rawhtml */>}}
<iframe src="https://www.youtube.com/embed/VIDEO_ID" ...></iframe>
{{</* /rawhtml */>}}
```

---

## Customization

### Change Colors

Edit CSS variables at the top of `static/css/main.css`:

```css
:root {
  --aws:    #FF9900;    /* AWS orange — main accent */
  --blue:   #2563EB;    /* DevOps blue — secondary accent */
  --bg:     #F7F8FC;    /* Page background */
  --surface:#FFFFFF;    /* Cards, panels */
  --ink:    #0D1117;    /* Primary text */
}
```

### Change Fonts

Replace font imports in `layouts/_default/baseof.html`:

```html
<!-- Current fonts -->
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Then update CSS variables:
```css
--font-body:    'Outfit', sans-serif;
--font-display: 'Fraunces', serif;
--font-mono:    'JetBrains Mono', monospace;
```

### Add a New AWS Service Section

```bash
# 1. Create the section
mkdir content/aws/sagemaker
cat > content/aws/sagemaker/_index.md << EOF
---
title: "SageMaker"
description: "AWS SageMaker tutorials — ML model training, deployment, and MLOps."
---
EOF

# 2. Add a post
hugo new aws/sagemaker/sagemaker-getting-started.md

# 3. Add to nav dropdown in layouts/partials/header.html
```

---

## Google Form Setup

### Create the Form

1. Go to [forms.google.com](https://forms.google.com)
2. Create a new form with fields like:
   - **Topic** (short text)
   - **Type** (multiple choice: Tutorial Request / Error Report / Interview Question / Other)
   - **Details** (paragraph)
   - **Your name** (optional)
   - **Your email** (optional)
3. Click **Send** → 🔗 icon → copy the short URL (e.g., `https://forms.gle/ABC123`)

### Add to Config

```toml
# config.toml
[params]
  googleFormURL = "https://forms.gle/YOUR_ACTUAL_FORM_ID"
```

This URL automatically appears:
- In the navbar "Submit Q" button
- At the bottom of every article (form-cta block)
- On the Interview Questions page

### Embed on Contact Page

1. In Google Forms → **Send** → **< >** (embed icon)
2. Copy the `src` URL from the iframe code
3. Update `content/contact.md`:
   ```html
   <iframe src="https://docs.google.com/forms/d/e/YOUR_LONG_FORM_ID/viewform?embedded=true" ...>
   ```

---

## Deployment

### Automatic Deployment (Recommended)

Every push to `main` triggers `.github/workflows/deploy.yml`:

```
git push origin main
     ↓
GitHub Actions triggers
     ↓
Hugo builds site (< 2 seconds)
     ↓
Minified HTML/CSS/JS uploaded to GitHub Pages
     ↓
Live at: https://yourusername.github.io/cloudops-blog/
```

### Manual Build (Local)

```bash
# Build for production
hugo --minify --gc

# Output is in ./public/
ls -la public/
```

### Custom Domain (Optional)

1. Buy a domain (e.g., `cloudopshub.dev`)
2. In GitHub repo: Settings → Pages → Custom domain
3. Update `config.toml`:
   ```toml
   baseURL = "https://cloudopshub.dev/"
   ```
4. Add DNS records per GitHub's instructions

---

## Content Roadmap

Track what to write next:

### AWS Tutorials
- [x] EC2 Complete Guide
- [ ] S3 Storage & Lifecycle
- [ ] VPC Networking Deep Dive
- [ ] Lambda Serverless Guide
- [ ] RDS Setup & Replication
- [ ] EKS Cluster Setup
- [ ] IAM Best Practices
- [ ] CloudFormation Templates
- [ ] Route 53 DNS Guide
- [ ] CloudWatch Monitoring

### DevOps Tutorials
- [x] Docker Complete Guide
- [ ] Kubernetes Getting Started
- [ ] Kubernetes Production Setup
- [ ] Jenkins Pipeline as Code
- [ ] GitHub Actions CI/CD
- [ ] Prometheus Stack Setup
- [ ] Grafana Dashboard Guide
- [ ] Prometheus + Grafana Integration

### Interview Questions
- [x] EC2 Interview Q&A
- [x] Kubernetes Interview Q&A
- [ ] S3 Interview Q&A
- [ ] VPC Interview Q&A
- [ ] Lambda Interview Q&A
- [ ] Docker Interview Q&A
- [ ] Jenkins Interview Q&A
- [ ] GitHub Actions Interview Q&A
- [ ] Prometheus Interview Q&A
- [ ] Grafana Interview Q&A

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b content/add-lambda-guide`
3. Write your content
4. Test locally: `hugo server -D`
5. Submit a Pull Request

---

## License

- **Content:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share and adapt with attribution
- **Code/Templates:** [MIT License](LICENSE)
