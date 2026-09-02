# CyPhish — Security Awareness Training Platform

CyPhish is an enterprise security awareness training and phishing simulation platform designed for authorized internal simulations. It supports approved sender profiles, dual-administrator campaign approvals, link click tracking, open pixel tracking, user phishing reporting, Active Directory / LDAP synchronization, executive risk dashboards, scheduled reports, and SIEM audit streaming.

> [!NOTE]
> **Fintech & Enterprise Security Policy**: CyPhish does **not** collect, store, or export credentials. All simulations focus strictly on awareness, click tracking, and threat reporting.

---

## 🏗️ Architecture

```text
Browser (HTTPS :443)  -->  Nginx Container (:443)  -->  CyPhish App Container (:8080)
                                                             │
                                                             ├──► MongoDB Container (:27017)
                                                             ├──► Approved SMTP Relay
                                                             ├──► Active Directory / LDAP (GUI Configured)
                                                             └──► SIEM Forwarder (LEEF 2.0 Logs)
```

---

## 🚀 Quick Turnkey Deployment (For Engineers)

### Step 1: Clone and Prepare Environment File
```bash
git clone <repository-url> /opt/cyphish
cd /opt/cyphish
cp .env.example .env
```

Edit `.env` with your bootstrap credentials:
```env
ADMIN_PASSWORD=Admin@123
SESSION_SECRET=a5c898e38f121d58d9e776a3e145892c908f5d0234ab
MONGO_ROOT_PASSWORD=RootPassword123
MONGO_APP_PASSWORD=Admin@123
SERVER_HOST=192.168.88.11
```
*(Passwords containing special characters like `@`, `#`, `%`, or `$` are automatically URL-encoded by the application).*

---

### Step 2: Generate Self-Signed SSL Certificate
Generate a certificate with Subject Alternative Names (SAN) for your IP or domain:

**Linux / macOS**:
```bash
chmod +x scripts/generate-ssl.sh
./scripts/generate-ssl.sh 192.168.88.11
```

**Windows**:
```cmd
scripts\generate-ssl.bat 192.168.88.11
```

---

### Step 3: Start Containers
```bash
docker compose up -d --build
```

**Access the Web GUI**:
Open `https://<server-ip>/console` (e.g. `https://192.168.88.11/console`).
- Initial Username: `admin` (or root administrator account)
- Initial Password: `<ADMIN_PASSWORD from .env>`

---

## 🖥️ GUI-Driven Administration (No Backend Editing Needed)

All day-to-day configurations are managed directly from the **System Settings** page (`/console/settings`):

1. **Active Directory / LDAP**:
   - Enable/disable LDAP sync.
   - Configure Server URL (`ldaps://...`), Bind DN, Password, and Base DN.
   - Click **"Test LDAP Connection"** to verify connectivity in real-time.
   - Test directory searches and query preview from the GUI.

2. **Scheduled Awareness Reports**:
   - Set delivery schedule (Daily, Weekly Mondays, Monthly, or Custom Cron).
   - Enter recipient email addresses and select the dispatch SMTP profile.
   - Click **"Send Test Report Now"** to verify email delivery.

3. **Public Campaign URLs & Reverse Proxy**:
   - Configure the base tracking URL embedded into simulated emails.
   - Toggle reverse proxy trust and SIEM LEEF 2.0 container log streaming.

4. **AI & Integrations (Ollama / LLMs)**:
   - Configure private local Ollama or cloud models for scenario drafting.

---

## 📊 Core Features & Capabilities

- **Executive Awareness Dashboard**: Real-time awareness posture gauge (0–100), simulation click rate (CTR %), phishing reporting rate, and department vulnerability heatmaps.
- **Teachable Moment Warning Page**: Visual "Spot the Red Flags" interactive breakdown (mismatched domain, fake urgency, suspicious links) for employee education.
- **Positive Reporting Metrics**: Employees can report simulations via one-click links/headers, building a resilient security culture.
- **Audience & Group Management**: CSV bulk upload, Active Directory group sync, deduplication, and exclusion groups.
- **Email Template Studio**: WYSIWYG & Markdown editor with dynamic variables (`{{firstName}}`, `{{link}}`, `{{department}}`, `{{reportLink}}`).
- **Dual-Approval Campaign Workflow**: Requester cannot approve their own campaign, preventing accidental single-person email blasts.
- **Emergency Kill Switch**: Immediately terminate active campaigns and neutralize tracking links.
- **LEEF 2.0 SIEM Integration**: Stream RFC-compliant logs to Splunk, IBM QRadar, or Graylog.
