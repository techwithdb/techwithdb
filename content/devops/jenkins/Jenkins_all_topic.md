---
title: "Jenkins Complete Reference Guide for AWS & DevOps Engineers"
date: 2026-04-17
description: "A comprehensive, real-world reference for building, structuring, and consuming Jenkins Shared Libraries in enterprise CI/CD pipelines. Covers vars/, src/, resources/, testing, security, and full microservices examples."
author: "DB"
tags: ["Jenkins", "CI/CD", "DevOps", "Groovy", "Kubernetes", "Docker", "Shared Library", "Pipeline"]
categories: ["DevOps"]
series: "Jenkins Mastery"
level: "Intermediate"
---


> All topics include Script Console (Groovy) and CLI (`jenkins-cli.jar`) usage.

---

## Table of Contents

| # | Topic | Category |
|---|-------|----------|
| 01 | [Installation & Setup](#installation--setup) | Core |
| 02 | [Jenkins CLI Basics](#jenkins-cli-basics) | Core |
| 03 | [Creating & Managing Jobs](#creating--managing-jobs) | Core |
| 04 | [Build Triggers](#build-triggers) | Core |
| 05 | [Pipeline Basics (Declarative)](#pipeline-basics-declarative) | Pipeline |
| 06 | [Scripted Pipelines (Groovy)](#scripted-pipelines-groovy) | Pipeline |
| 07 | [Shared Libraries](#shared-libraries) | Pipeline |
| 08 | [Multibranch Pipelines](#multibranch-pipelines) | Pipeline |
| 09 | [Credentials Management](#credentials-management) | Security |
| 10 | [Role-Based Access Control](#role-based-access-control) | Security |
| 11 | [Agents & Nodes](#agents--nodes) | Infra |
| 12 | [Docker Agents](#docker-agents) | Infra |
| 13 | [Plugin Management](#plugin-management) | Plugins |
| 14 | [Configuration as Code (JCasC)](#configuration-as-code-jcasc) | Plugins |
| 15 | [Artifact Archiving](#artifact-archiving) | Pipeline |
| 16 | [Test Reports & JUnit](#test-reports--junit) | Pipeline |
| 17 | [Environment Variables](#environment-variables) | Pipeline |
| 18 | [Parallel Stages](#parallel-stages) | Pipeline |
| 19 | [Notifications & Alerts](#notifications--alerts) | Plugins |
| 20 | [Backup & Restore](#backup--restore) | Infra |

---

## Installation & Setup

Install Jenkins on Linux/Mac/Windows, configure the initial admin user, and choose starter plugins.

**Script Console** *(Manage Jenkins → Script Console)*
```groovy
// Check running Jenkins version
println Jenkins.instance.version
```

**CLI**
```bash
# Start Jenkins WAR directly
java -jar jenkins.war --httpPort=8080

# Or via systemd (Debian/Ubuntu)
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Download CLI JAR
wget http://localhost:8080/jnlpJars/jenkins-cli.jar
java -jar jenkins-cli.jar -s http://localhost:8080/ help
```

---

## Jenkins CLI Basics

Connect to Jenkins remotely using the CLI JAR; authenticate with user/token and run administrative commands.

**Script Console**
```groovy
// Check current user
println Jenkins.instance.version
println hudson.model.User.current().id
```

**CLI**
```bash
# Authenticate and check identity
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:YOUR_API_TOKEN who-am-i

# List all available CLI commands
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:YOUR_API_TOKEN help
```

---

## Creating & Managing Jobs

Create freestyle, pipeline, and multibranch jobs from CLI or UI; copy, rename, and delete jobs.

**Script Console**
```groovy
import jenkins.model.*
// Create a freestyle job
def job = Jenkins.instance.createProject(FreeStyleProject, 'my-job')
Jenkins.instance.save()
println "Created: ${job.name}"
```

**CLI**
```bash
# Create a job from an XML config
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN create-job my-job < config.xml

# List all jobs
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN list-jobs

# Delete a job
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN delete-job my-job

# Copy an existing job
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN copy-job source-job new-job
```

---

## Build Triggers

Trigger builds via SCM polling, webhooks, cron schedules, or upstream/downstream job chaining.

**Script Console**
```groovy
// Manually trigger a build from console
def job = Jenkins.instance.getItem('my-job')
job.scheduleBuild2(0)
println "Build scheduled for: ${job.name}"
```

**CLI**
```bash
# Trigger a build and wait for result
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN build my-job -s -v

# Trigger with parameters
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN build my-job -p ENV=prod -p VERSION=1.0

# Schedule via cron (in Jenkinsfile)
# triggers { cron('H/15 * * * *') }
```

---

## Pipeline Basics (Declarative)

Write Jenkinsfiles with declarative syntax: `agent`, `stages`, `steps`, `post` blocks.

**Script Console**
```groovy
// Validate pipeline syntax
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition
def flow = new CpsFlowDefinition('''
pipeline {
  agent any
  stages {
    stage("Build") { steps { echo "Building..." } }
  }
}
''', true)
println "Syntax OK: ${flow}"
```

**CLI**
```bash
# Replay last build with modified Jenkinsfile
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN replay-pipeline my-pipeline 42

# Sample Jenkinsfile (Declarative)
cat > Jenkinsfile << 'EOF'
pipeline {
  agent any
  stages {
    stage('Build') { steps { sh 'mvn package' } }
    stage('Test')  { steps { sh 'mvn test' } }
  }
  post {
    success { echo 'Build passed!' }
    failure { echo 'Build failed!' }
  }
}
EOF
```

---

## Scripted Pipelines (Groovy)

Use `node{}` and `stage{}` blocks for advanced Groovy-based pipelines with full programmatic control.

**Script Console**
```groovy
// Trigger a downstream job and capture result
def result = build job: 'downstream-job', wait: true
println "Downstream result: ${result.result}"
```

**CLI**
```bash
# Run a Groovy script via CLI
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN groovy = < script.groovy

# Pass arguments to the script
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN groovy = -- arg1 arg2 < script.groovy

# Sample scripted Jenkinsfile
cat > Jenkinsfile << 'EOF'
node('linux') {
  stage('Checkout') { checkout scm }
  stage('Build')    { sh 'make build' }
  stage('Test')     { sh 'make test' }
}
EOF
```

---

## Shared Libraries

Centralize reusable pipeline code in a Git repo; load with `@Library` annotation.

**Script Console**
```groovy
import org.jenkinsci.plugins.workflow.libs.*
// List configured global libraries
def libs = Jenkins.instance.getExtensionList(GlobalLibraries)[0].libraries
libs.each { println "${it.name} → ${it.defaultVersion}" }
```

**CLI**
```bash
# Configure via Jenkins API (REST)
curl -X POST http://localhost:8080/job/my-pipeline/build \
  -u admin:TOKEN

# Or configure via JCasC YAML
# unclassified:
#   globalLibraries:
#     libraries:
#       - name: "my-shared-lib"
#         retriever:
#           modernSCM:
#             scm:
#               git:
#                 remote: "https://github.com/org/jenkins-shared-lib"

# In Jenkinsfile:
# @Library('my-shared-lib') _
# mySharedFunction()
```

---

## Multibranch Pipelines

Automatically discover branches and PRs in a repo; each branch gets its own build pipeline.

**Script Console**
```groovy
import jenkins.branch.*
// Trigger a multibranch scan
def mb = Jenkins.instance.getItem('my-multibranch')
mb.scheduleBuild2(0)
println "Scan scheduled for: ${mb.name}"
```

**CLI**
```bash
# Build a specific branch
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN build my-multibranch/main -s -v

# Trigger branch scan
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN build my-multibranch -s

# List discovered branches via API
curl http://localhost:8080/job/my-multibranch/api/json?depth=1 \
  -u admin:TOKEN | python3 -m json.tool
```

---

## Credentials Management

Store secrets, SSH keys, and tokens in Jenkins credential store; reference securely in pipelines.

**Script Console**
```groovy
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.common.*
// List all stored credentials
def creds = CredentialsProvider.lookupCredentials(
  StandardCredentials,
  Jenkins.instance,
  null, null
)
creds.each { println "${it.id} [${it.class.simpleName}]" }
```

**CLI**
```bash
# Import credential from XML
cat credential.xml | java -jar jenkins-cli.jar \
  -s http://localhost:8080/ -auth admin:TOKEN \
  import-credentials-as-xml system::system::jenkins _

# List credentials via REST API
curl http://localhost:8080/credentials/store/system/domain/_/api/json \
  -u admin:TOKEN | python3 -m json.tool

# In Jenkinsfile:
# environment {
#   DB_PASS = credentials('db-secret-id')
# }
```

---

## Role-Based Access Control

Configure matrix-based or role-strategy security; assign permissions per user or group.

**Script Console**
```groovy
import hudson.security.*
// Add admin permission for a user
def strategy = new GlobalMatrixAuthorizationStrategy()
strategy.add(Jenkins.ADMINISTER, 'admin')
strategy.add(Jenkins.READ, 'developer')
Jenkins.instance.authorizationStrategy = strategy
Jenkins.instance.save()
println "Authorization strategy updated"
```

**CLI**
```bash
# Export current Jenkins config (includes security)
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN get-job Jenkins-Config

# Apply updated config (JCasC)
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN apply-configuration

# Disable CSRF (dev only — not recommended in production)
# java -jar jenkins-cli.jar -s http://localhost:8080/ \
#   -auth admin:TOKEN disable-csrf
```

---

## Agents & Nodes

Connect build agents via SSH, JNLP, or Docker; assign labels so jobs are routed to the right agent.

**Script Console**
```groovy
import hudson.model.*
import hudson.slaves.*
// Add a new permanent agent
def launcher = new JNLPLauncher(true)
def node = new DumbSlave(
  'agent-01',
  '/home/jenkins',
  launcher
)
Jenkins.instance.addNode(node)
Jenkins.instance.save()
println "Node added: agent-01"
```

**CLI**
```bash
# Create a node from XML
cat node.xml | java -jar jenkins-cli.jar \
  -s http://localhost:8080/ -auth admin:TOKEN create-node agent-01

# List all nodes
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN get-node

# Delete a node
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN delete-node agent-01

# Disconnect an online agent
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN disconnect-node agent-01 -m "Maintenance"
```

---

## Docker Agents

Run pipeline steps inside Docker containers using the Docker Pipeline plugin.

**Script Console**
```groovy
// Check Docker plugin is loaded
def dockerPlugin = Jenkins.instance.pluginManager.getPlugin('docker-workflow')
println "Docker plugin: ${dockerPlugin?.version ?: 'NOT INSTALLED'}"
```

**CLI**
```bash
# Verify Docker is available on the agent
docker run --rm hello-world

# Sample Jenkinsfile with Docker agent
cat > Jenkinsfile << 'EOF'
pipeline {
  agent {
    docker {
      image 'maven:3.9-eclipse-temurin-17'
      args '-v $HOME/.m2:/root/.m2'
    }
  }
  stages {
    stage('Build') { steps { sh 'mvn package -DskipTests' } }
    stage('Test')  { steps { sh 'mvn test' } }
  }
}
EOF
```

---

## Plugin Management

Install, update, and remove plugins from CLI or Plugin Manager UI; manage plugin dependencies.

**Script Console**
```groovy
import jenkins.model.*
def pm = Jenkins.instance.pluginManager
// List all installed plugins
pm.plugins.sort { it.shortName }.each {
  println "${it.shortName.padRight(40)} ${it.version}"
}
```

**CLI**
```bash
# Install a plugin and restart
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN install-plugin git -restart

# List all installed plugins
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN list-plugins

# Update all outdated plugins
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN install-plugin \
  $(java -jar jenkins-cli.jar -s http://localhost:8080/ \
    -auth admin:TOKEN list-plugins | grep -E '\(' | awk '{print $1}')

# Restart Jenkins after plugin changes
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN safe-restart
```

---

## Configuration as Code (JCasC)

Manage Jenkins system config via YAML files; apply without any manual UI interaction.

**Script Console**
```groovy
import io.jenkins.plugins.casc.*
// Re-apply current JCasC configuration
def casc = ConfigurationAsCode.get()
casc.configure()
println "JCasC configuration applied"
```

**CLI**
```bash
# Apply a JCasC YAML config via REST API
curl -X POST \
  http://localhost:8080/configuration-as-code/apply \
  -u admin:TOKEN \
  --data-binary @jenkins.yaml

# View currently applied configuration
curl http://localhost:8080/configuration-as-code/view \
  -u admin:TOKEN

# Export current config to a YAML file
curl http://localhost:8080/configuration-as-code/export \
  -u admin:TOKEN -o exported-config.yaml
```

---

## Artifact Archiving

Archive build artifacts with `archiveArtifacts`; use fingerprinting for cross-job traceability.

**Script Console**
```groovy
// List artifacts from the last build
def build = Jenkins.instance.getItem('my-job').lastBuild
build.artifacts.each { artifact ->
  println artifact.relativePath
}
```

**CLI**
```bash
# Download artifact from last successful build
curl -O http://localhost:8080/job/my-job/lastSuccessfulBuild/\
artifact/target/app.jar -u admin:TOKEN

# In Jenkinsfile:
# post {
#   success {
#     archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
#   }
# }
```

---

## Test Reports & JUnit

Publish JUnit XML test results; visualize pass/fail/skip trends across builds.

**Script Console**
```groovy
// Get test result summary from last build
def build = Jenkins.instance.getItem('my-job').lastBuild
def testResult = build.testResultAction
if (testResult) {
  println "Total: ${testResult.totalCount}"
  println "Failed: ${testResult.failCount}"
  println "Skipped: ${testResult.skipCount}"
}
```

**CLI**
```bash
# Fetch test results via REST API
curl http://localhost:8080/job/my-job/lastBuild/testReport/api/json \
  -u admin:TOKEN | python3 -m json.tool

# In Jenkinsfile (after running tests):
# post {
#   always {
#     junit 'target/surefire-reports/*.xml'
#   }
# }
```

---

## Environment Variables

Use built-in and custom env vars in pipelines; inject secrets safely with `credentials()`.

**Script Console**
```groovy
// Print all Jenkins environment variables
System.getenv().sort().each { k, v ->
  println "${k.padRight(35)} = ${v}"
}
```

**CLI**
```bash
# Fetch injected env vars from a build
curl http://localhost:8080/job/my-job/lastBuild/injectedEnvVars/api/json \
  -u admin:TOKEN | python3 -m json.tool

# In Jenkinsfile:
# environment {
#   DB_URL      = credentials('db-cred-id')
#   APP_VERSION = sh(script: 'git describe --tags', returnStdout: true).trim()
# }
```

---

## Parallel Stages

Run stages concurrently using `parallel{}`; distribute long test suites across multiple agents.

**Script Console**
```groovy
// Check parallel executor count on controller
println "Max executors: ${Jenkins.instance.numExecutors}"
Jenkins.instance.nodes.each {
  println "${it.nodeName}: ${it.numExecutors} executors"
}
```

**CLI**
```bash
# No specific CLI command — declare parallel in Jenkinsfile:
cat > Jenkinsfile << 'EOF'
pipeline {
  agent any
  stages {
    stage('Parallel Tests') {
      parallel {
        stage('Unit Tests') {
          steps { sh 'mvn test -Dtest=UnitTest*' }
        }
        stage('Integration Tests') {
          steps { sh 'mvn test -Dtest=IntegrationTest*' }
        }
        stage('Lint') {
          steps { sh 'npm run lint' }
        }
      }
    }
  }
}
EOF
```

---

## Notifications & Alerts

Send build notifications via email, Slack, or MS Teams on success/failure/unstable states.

**Script Console**
```groovy
import jenkins.plugins.slack.*
// Check Slack plugin configuration
def slackDesc = Jenkins.instance.getExtensionList(
  SlackNotifier.DescriptorImpl
)[0]
println "Slack team: ${slackDesc?.teamDomain}"
println "Slack channel: ${slackDesc?.room}"
```

**CLI**
```bash
# Send test email via CLI
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN mail \
  -s "Jenkins Test Email" user@example.com

# In Jenkinsfile post block:
# post {
#   failure {
#     slackSend(
#       color: 'danger',
#       message: "Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
#     )
#     mail to: 'team@example.com',
#          subject: "Build Failed: ${env.JOB_NAME}",
#          body: "Check console: ${env.BUILD_URL}"
#   }
# }
```

---

## Backup & Restore

Back up `JENKINS_HOME`; use ThinBackup plugin or rsync for scheduled, automated exports.

**Script Console**
```groovy
import jenkins.model.*
// Print JENKINS_HOME path
def home = Jenkins.instance.rootDir
println "Jenkins home: ${home.absolutePath}"

// Reload config from disk (safe restart alternative)
Jenkins.instance.reload()
println "Configuration reloaded"
```

**CLI**
```bash
# Trigger ThinBackup (if plugin installed)
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN thinBackup backup

# Manual backup with rsync
rsync -av --exclude='workspace/' --exclude='builds/*/archive/' \
  /var/lib/jenkins/ /backup/jenkins/$(date +%Y%m%d)/

# Reload Jenkins configuration from disk
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN reload-configuration

# Safe restart (waits for running builds)
java -jar jenkins-cli.jar -s http://localhost:8080/ \
  -auth admin:TOKEN safe-restart
```

---

*Generated reference guide — 20 topics covering Core, Pipeline, Security, Plugins, and Infra.*
