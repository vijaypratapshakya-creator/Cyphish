# 🛡️ CyPhish: Enterprise Phishing Simulation & Security Awareness Platform
## Comprehensive Architecture, Workflow & Production Implementation Guide

---

## 1. 📌 Executive Overview

**CyPhish** is an enterprise-grade, internal phishing simulation and cyber risk awareness platform engineered for Security Operations Centers (SOC), CISOs, and enterprise IT security teams. 

Unlike legacy phishing tools that focus on credential harvesting or punitive actions, CyPhish is designed around **Positive Reinforcement and Teachable Moments**:
* **Zero Credential Harvesting**: Any password input attempt is permanently blocked at the API gateway level (`410 Gone`), ensuring enterprise compliance with zero privacy risk.
* **Positive Phish Reporting Flow**: Employees who report simulated threats via email or webmail buttons are instantly rewarded with a **Security Champion** badge and real-time confirmation screen.
* **Cyber Command SOC Aesthetics**: A high-contrast, obsidian dark-themed command center featuring monospace telemetry, live drill charts, and risk posture heatmaps.

```
+-----------------------------------------------------------------------------------+
|                                CYPHISH ECOSYSTEM                                  |
|                                                                                   |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |  Cyber Command Web  |   | Active Directory    |   |  Exchange / SMTP        |  |
|  |  Management Console |   | Synchronization     |   |  With Custom Root CA    |  |
|  +----------+----------+   +----------+----------+   +------------+------------+  |
|             |                         |                           |               |
|             +-------------------------v---------------------------+               |
|                                       |                                           |
|                     +-----------------+-----------------+                         |
|                     |     CyPhish Core Backend API      |                         |
|                     |     (Node.js / Express / RBAC)    |                         |
|                     +-----------------+-----------------+                         |
|                                       |                                           |
|             +-------------------------+---------------------------+               |
|             |                         |                           |               |
|  +----------v----------+   +----------v----------+   +------------v------------+  |
|  |  MongoDB Database   |   | Real-Time SIEM      |   |  Teachable Landing      |  |
|  |  (180-Day Retention)|  | Forwarder (LEEF 2.0)|   |  & Warning Engine       |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. 🏛️ Core System Architecture

### 2.1 Technology Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, React Router v6, Material UI (MUI v5), Chart.js | Cyber Command dark UI, multi-dimensional analytics, template builder, settings portal. |
| **Backend API Gateway** | Node.js (ES Modules), Express.js, Helmet, CORS, Morgan | REST APIs, authentication, tracking token validation, IP extraction, rate limiting. |
| **Identity & Access** | Active Directory / LDAP (`ldapjs`), JWT Tokens, bcryptjs | Delegated RBAC (Admin, Security Engineer, Auditor), corporate user/group sync. |
| **Data & Retention** | MongoDB, Mongoose ODM | Target audiences, drill campaigns, tracking logs, 180-day compliance data retention. |
| **Mail Engine** | Nodemailer, TLS 1.3, Dynamic Root CA inliner | Full-fidelity email dispatch, corporate Exchange secure relay, custom CA injection. |
| **SIEM Forwarding** | Raw UDP/TCP Syslog Sockets | Instant streaming of `SIMULATION_CLICKED` and `SIMULATION_REPORTED` events in LEEF 2.0 / CEF. |

---

### 2.2 Micro-Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Security Engineer
    participant Console as CyPhish Console
    participant Backend as CyPhish API
    participant AD as Active Directory
    participant Exchange as Mail Server (Exchange)
    actor Target as Employee
    participant SIEM as SIEM (QRadar/Splunk)

    Admin->>Console: 1. Launch Targeted Drill (Filter by Dept / OU)
    Console->>Backend: POST /api/campaign/prepare
    Backend->>AD: Query Target Group / OU Contacts
    AD-->>Backend: Return User List (Dept, Title, Email)
    Backend->>Exchange: Transmit Full-Fidelity Simulation (TLS 1.3)
    Exchange->>Target: Deliver Simulation with {{link}} and {{reportLink}}

    alt Scenario A: Employee Clicks Link (Teachable Moment)
        Target->>Backend: GET /api/tracking/click/:shortId
        Backend->>Backend: Extract Workstation IP & Record Click Event
        Backend->>SIEM: Stream UDP Syslog (LEEF 2.0: SIMULATION_CLICKED)
        Backend-->>Target: Redirect to /training/warning (Teachable Moment Screen)
    else Scenario B: Employee Reports Phish (Positive Vigilance)
        Target->>Backend: GET /api/tracking/report/:shortId
        Backend->>Backend: Record 'reported' status & Report Timestamp
        Backend->>SIEM: Stream UDP Syslog (LEEF 2.0: SIMULATION_REPORTED)
        Backend-->>Target: Redirect to /training/report (Security Champion Celebration)
    end
```

---

## 3. ⚙️ Feature Capabilities & Workflows

### 3.1 Delegated Administration & RBAC Portal

CyPhish enforces strict role-based access control with three distinct authorization tiers:

```
                  ┌────────────────────────────────────────┐
                  │        👑 Super Administrator          │
                  │   - Provision platform users & RBAC    │
                  │   - Configure SIEM, AD, & System SMTP  │
                  │   - Execute 180-day retention purges   │
                  └───────────────────┬────────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           │                                                     │
┌──────────▼───────────────────────────┐      ┌──────────────────▼───────────────────┐
│     🛠️ Security Engineer Role        │      │       👁️ Auditor / Viewer Role       │
│  - Create & execute drill campaigns  │      │  - Read-only analytics access        │
│  - Author threat email templates     │      │  - View department & campaign charts │
│  - Import target audience lists      │      │  - Export compliance report summaries│
└──────────────────────────────────────┘      └──────────────────────────────────────┘
```

---

### 3.2 Dynamic In-GUI Exchange CA Certificate & TLS 1.3

To guarantee seamless integration with on-premise Microsoft Exchange and corporate mail relays without rebuilding Docker containers:
* **In-GUI Certificate Import**: Administrators can upload or paste their corporate Root CA / Intermediate CA directly into the SMTP configuration page.
* **Runtime Trust Injection**: The custom CA certificate is injected dynamically into Nodemailer’s TLS socket handshake (`tls.ca`), establishing a trusted chain of custody.
* **Modern Ciphers**: Configurable encryption modes including `TLS 1.3 (Strict)`, `STARTTLS`, and `SMTPS (Port 465)`.

---

### 3.3 Multi-Dimensional Active Directory Targeting

CyPhish synchronizes rich directory attributes from Active Directory (LDAPS Port 636 / StartTLS Port 389):
* **Retrieved Attributes**: `sAMAccountName`, `mail`, `department`, `title` / `description`, `company`, `distinguishedName` (OU hierarchy), `memberOf` (security groups).
* **Smart Campaign Targeting**: Operators can launch drills targeting specific departments (e.g., *Finance & Payroll*), Organizational Units (e.g., *OU=Contractors*), or Active Directory Security Groups.

---

### 3.4 Multi-Dimensional Cyber Command Dashboard

The analytics dashboard provides comprehensive telemetry over a selectable **180-day retention window**:
1. **🏢 Department-Wise Analytics**: Drill counts, open rates, click compromise %, report vigilance %, and real-time department risk ratings (*High Risk*, *Moderate*, *Resilient*).
2. **🚀 Campaign-Wise Velocity**: Timeline breakdown showing sent volume vs. click and report velocity over time.
3. **✉️ Threat Scenario Library**: Template complexity scores (1 to 5 stars), category filters (*Spear Phishing*, *Credential Theft*, *HR Notices*), and template compromise rates.
4. **👤 User Risk Watchlist & IP Correlation**: Identifies repeat clickers along with their correlated **workstation IP addresses** alongside designated **Security Champions**.

---

### 3.5 Real-Time SIEM Event Forwarder (LEEF 2.0 / CEF)

All simulation interactions stream instantly to remote SIEM solutions (IBM QRadar, Splunk, AlienVault, Sentinel) via non-blocking UDP or TCP syslog packets:

```syslog
<134>1 2026-09-04T08:00:00.000Z cyphish-app - - - LEEF:2.0|CyPhish|CyPhish|1.0|SIMULATION_CLICKED|src=192.168.1.105	usrName=user@corp.internal	department=Finance	devTime=1725436800000	status=CLICKED

<134>1 2026-09-04T08:04:15.000Z cyphish-app - - - LEEF:2.0|CyPhish|CyPhish|1.0|SIMULATION_REPORTED|src=192.168.1.105	usrName=user@corp.internal	department=Finance	timeToReportMs=255000	status=REPORTED
```

---

### 3.6 180-Day Compliance Data Retention & Automated Purge

* **Retention Window**: Configurable in **Settings** (default: 180 days / 6 months).
* **Automated & Manual Purge**: Scheduled background cleanup and instant manual execution purge expired drill tracking records and audit events, ensuring strict compliance with data minimization mandates (SOC 2, ISO 27001, GDPR).

---

## 4. 🚀 Production Deployment Guide

### 4.1 Environment Configuration (`.env.production`)

```env
# Application Runtime
NODE_ENV=production
PORT=8080
CAMPAIGN_PUBLIC_URL=https://phish.yourcompany.com
TRUST_PROXY=true

# Security & Secrets
SESSION_SECRET=Generate_A_Long_Random_Secret_Key_64_Chars
ADMIN_PASSWORD=Secure_Initial_Root_Admin_Password!

# Database Configuration
DB_URL=mongodb://cyphish_app:SecureDBPassword@mongodb:27017/cyphish?authSource=cyphish

# SIEM Syslog Default (Optional, Can Also Be Configured in GUI)
SIEM_LEEF_STDOUT=false
```

---

### 4.2 Docker Compose Deployment (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: cyphish-mongo
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: RootMongoPassword123
      MONGO_INITDB_DATABASE: cyphish
    volumes:
      - mongo_data:/data/db
    networks:
      - cyphish-net

  cyphish-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cyphish-core
    restart: always
    depends_on:
      - mongodb
    env_file:
      - .env.production
    ports:
      - "8080:8080"
    volumes:
      - ./uploads:/app/uploads
    networks:
      - cyphish-net

volumes:
  mongo_data:

networks:
  cyphish-net:
    driver: bridge
```

---

### 4.3 Nginx Reverse Proxy Configuration (SSL Termination)

```nginx
server {
    listen 80;
    server_name phish.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name phish.yourcompany.com;

    ssl_certificate /etc/ssl/certs/cyphish.crt;
    ssl_certificate_key /etc/ssl/private/cyphish.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. 📂 Project File Structure Reference

```
CyPhish/
├── client/                     # React 18 Frontend Application
│   ├── public/                 # Static assets, logos, favicon
│   └── src/
│       ├── assets/img/         # High-resolution branding assets (cyphish-logo.png)
│       ├── components/         # Shared UI components (Sidebar, Footer, Dialogs)
│       ├── hooks/              # Custom React hooks (useTemplates, useAudience, etc.)
│       ├── pages/
│       │   ├── Dashboard/      # Multi-dimensional analytics & risk dashboard
│       │   ├── Audience/       # AD target sync & employee list manager
│       │   ├── Campaign/       # Simulation wizard & campaign detail drill-down
│       │   ├── SenderProfile/  # SMTP profiles, Root CA importer & TLS settings
│       │   ├── Settings/       # RBAC users, SIEM syslog, 180d retention, Landing customizer
│       │   ├── Templates/      # Full-fidelity threat scenario studio
│       │   └── TrainingWarning/# Teachable moment & Security Champion celebration
│       └── services/           # Axios API connectors & services
├── controllers/                # Backend API controllers
│   ├── dashboardController.js  # Department, campaign, template & user telemetry
│   ├── senderProfileController.js # SMTP management & Root CA certificate handling
│   ├── systemController.js     # RBAC users, SIEM tests, retention cleanup, landing config
│   ├── templateController.js   # Full-fidelity HTML template processing
│   ├── trackingController.js   # Link click tracking, IP extraction & report handler
│   └── userController.js       # Delegated user account provisioning & locking
├── models/                     # MongoDB Mongoose schemas
│   ├── Campaign.js             # Simulation campaigns
│   ├── CampaignTracking.js     # Per-recipient tracking records (IP, status, timestamps)
│   ├── Contact.js              # Audience recipients with enriched AD attributes
│   ├── SenderProfile.js        # SMTP configurations & custom CA certs
│   ├── SystemSetting.js        # Global settings, SIEM, AD, Landing customizer, Retention
│   ├── Template.js             # Phishing threat scenarios
│   └── User.js                 # RBAC administrator & engineer accounts
├── routes/                     # Express REST route definitions
├── services/                   # Business logic services
│   ├── auditService.js         # Audit log & real-time LEEF 2.0 / CEF SIEM forwarder
│   ├── emailService.js         # Nodemailer mail transmission engine
│   ├── ldapService.js          # Active Directory LDAPS sync engine
│   ├── reportScheduler.js      # Executive automated report scheduler
│   └── systemSettingService.js # Configuration persistence & cache
├── tests/                      # Automated unit & integration test suites
│   ├── test-rbac-attributes.js # RBAC, AD parsing, LEEF 2.0 & IP correlation tests
│   ├── test-ip-extraction.js   # Client IP resolution tests
│   └── test-db-utils.js        # Database connection robustness tests
├── app.js                      # Express server entrypoint
├── Dockerfile                  # Production multi-stage Docker build
└── docker-compose.yml          # Container orchestration definition
```

---

## 6. 🛡️ Verification & Quality Assurance Summary

* **Unit Test Suites**: ✅ **All tests passing** (`test-rbac-attributes.js`, `test-ip-extraction.js`, `test-db-utils.js`).
* **Vulnerability Audit**: 🛡️ **0 vulnerabilities** (`npm audit`).
* **Frontend Compilation**: 📦 **Production build verified** (`build/` generated cleanly).
* **Git Status**: 🚀 **All changes staged and synced to `origin/main`**.
