# CyPhish

CyPhish is a security-awareness training platform for authorized internal simulations. It supports approved sender profiles, campaign approvals, click-based training metrics, LDAP/Active Directory lookups, risk reporting, scheduled administrator reports, and audit events. CyPhish does **not** request, collect, store, or export passwords.

This guide is written for an engineer deploying CyPhish on a Linux server. It uses Docker Compose so that the application and its MongoDB database have a predictable, supportable lifecycle.

## Architecture

```text
Browser / reverse proxy  -->  CyPhish container :8080  -->  MongoDB container :27017
                                      |
                                      +--> Approved SMTP relay
                                      +--> Optional LDAP/AD server
                                      +--> Optional SIEM (LEEF logs)
```

MongoDB is available only to the CyPhish Docker network. It is not published to the Linux host by the supplied Compose configuration.

## Capabilities included

- CyPhish-branded administrator console and public training-warning page
- Administrator approval, written purpose, target scope, allow/block domain lists, and exclusion groups
- Campaign pause, resume, kill switch, and scheduled delivery window controls
- LDAP directory lookup for people, groups, OUs, or the configured domain
- Dashboard and risk reports, with a maximum reporting range of six months
- Optional scheduled reports to administrators
- Persistent audit events and optional LEEF-format output for SIEM ingestion
- Authenticated MongoDB deployment, rate limits, role checks, and protected secrets in API responses

## 1. Host requirements

Use a supported 64-bit Ubuntu LTS release. A small pilot needs at least 2 vCPU, 4 GB RAM, and 30 GB of free SSD storage; increase storage for backups and long-running campaigns. The server must have:

- Internet access during image builds, or access to your internal container/npm mirrors
- A DNS name for the user-facing application, for example `cyphish.example.com`
- Network access to the approved SMTP relay and, if enabled, domain controllers
- A firewall policy allowing HTTPS to the reverse proxy and outbound SMTP/LDAP only where needed
- Regular host and volume backups

Do not expose port 27017 publicly. Do not deploy CyPhish on a domain controller.

## 2. Install Docker Engine and Compose

On a fresh Ubuntu host, install Docker Engine using your organization’s approved repository or the official Docker documentation. Verify the installation:

```bash
docker --version
docker compose version
sudo systemctl enable --now docker
```

Optionally add the operations account to the Docker group. This grants effectively root-equivalent access to Docker, so use it only for trusted administrators:

```bash
sudo usermod -aG docker "$USER"
# Sign out and sign in again before using Docker without sudo.
```

## 3. Obtain and prepare the source

Clone the repository into an application directory owned by the operations account:

```bash
sudo mkdir -p /opt/cyphish
sudo chown "$USER":"$USER" /opt/cyphish
git clone <your-github-repository-url> /opt/cyphish
cd /opt/cyphish
```

Review the deployment files before starting:

```bash
git status
docker compose config
```

`docker compose config` must run after the `.env` file described below exists.

## 4. Create production configuration

CyPhish never commits deployment secrets. Create a local configuration file with strict permissions:

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
openssl rand -base64 36
```

Edit `.env` and replace every placeholder. The minimum production configuration is:

```env
NODE_ENV=production
CYPHISH_PORT=8080
SESSION_SECRET=<64-or-more-random-hex-characters>
ADMIN_PASSWORD=<strong-initial-administrator-password>
CAMPAIGN_PUBLIC_URL=https://cyphish.example.com

MONGO_ROOT_USERNAME=cyphish_root
MONGO_ROOT_PASSWORD=<strong-random-root-password>
MONGO_APP_USERNAME=cyphish_app
MONGO_APP_PASSWORD=<strong-random-application-password>

TRUST_PROXY=true
```

`ADMIN_PASSWORD` is used only during first initialization. Change the administrator password immediately after the first login. Changing MongoDB variables after the database volume has been initialized does not change existing database accounts; use a controlled MongoDB credential rotation procedure instead.

### LDAP / Active Directory

Keep LDAP disabled until a read-only service account and network path are ready:

```env
LDAP_ENABLED=true
LDAP_URL=ldaps://dc01.example.internal:636
LDAP_BIND_DN=CN=svc_cyphish,OU=Service Accounts,DC=example,DC=internal
LDAP_BIND_PASSWORD=<read-only-service-account-password>
LDAP_BASE_DN=DC=example,DC=internal
LDAP_TIMEOUT_MS=10000
```

Prefer LDAPS or LDAP protected by a private network. The bind account should have read-only directory permissions and no interactive login capability.

### Scheduled administrator reports

Configure this only after creating an approved sender profile in the CyPhish console:

```env
REPORT_RECIPIENTS=security-admin@example.com,soc@example.com
REPORT_CRON=0 8 * * 1
REPORT_SMTP_PROFILE_ID=<sender-profile-object-id>
```

`REPORT_CRON` uses a five-field cron schedule. The example sends every Monday at 08:00 according to the container’s timezone.

### SIEM logging

Set the following to emit LEEF events to the container log stream:

```env
SIEM_LEEF_STDOUT=true
```

Forward Docker container logs using your approved log agent (for example Fluent Bit, Filebeat, Splunk Universal Forwarder, or syslog-ng). The platform emits records in LEEF 2.0 form; the log agent is responsible for TLS, destination, buffering, and retry behavior.

## 5. Build and start

Run the initial deployment:

```bash
docker compose pull
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 cyphish
```

Expected services:

- `cyphish` — Node.js API and built React application, published as `${CYPHISH_PORT}:8080`
- `mongodb` — internal authenticated MongoDB service with persistent data

Open `http://<server-name>:8080/console` only for an initial private-network test. For production, publish CyPhish through a reverse proxy with HTTPS and use `https://cyphish.example.com/console`.

## 6. Reverse proxy and TLS

Terminate TLS at an approved reverse proxy such as Nginx, Caddy, HAProxy, or an enterprise load balancer. Preserve the original `Host` and `X-Forwarded-Proto` headers and keep `TRUST_PROXY=true` only when CyPhish is reached through that trusted proxy.

The reverse proxy should:

- Redirect HTTP to HTTPS
- Restrict administrative access to corporate/VPN networks where practical
- Enforce a reasonable request-body limit
- Forward `/api` and static application paths to `http://127.0.0.1:8080`
- Set HSTS after HTTPS is verified

If the Docker port is bound on all interfaces, protect it with the host firewall until the proxy is in place. Example UFW policy:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 443/tcp
sudo ufw deny 8080/tcp
sudo ufw enable
```

## 7. First-use checklist

1. Sign in to `/console` using the initial administrator credentials.
2. Change the administrator password.
3. Create at least one additional administrator for approval separation.
4. Add an approved SMTP sender profile from a domain your organization controls.
5. Confirm SPF, DKIM, and DMARC with the mail administrator.
6. Configure LDAP only with a read-only account, then test directory search.
7. Create a test audience containing only authorized test recipients.
8. Request and approve a test campaign using two different administrators.
9. Verify the training-warning landing page and review audit/LEEF logs.
10. Configure reporting recipients and verify a test report before enabling scheduled mail.

## 8. Daily operations

Useful commands:

```bash
cd /opt/cyphish
docker compose ps
docker compose logs -f cyphish
docker compose logs -f mongodb
docker compose restart cyphish
docker compose down            # Stops containers but preserves database volume
```

Do not use `docker compose down -v` in normal operations. The `-v` option removes the MongoDB volume and permanently deletes local data.

Campaigns must be requested with a target scope and written purpose, then approved by a different administrator. Use pause or the kill switch immediately if a simulation must stop. The kill switch disables unsent recipient tracking entries.

## 9. Backup and recovery

Back up the MongoDB database before upgrades and at a schedule appropriate for your organization. Example logical backup from the host:

```bash
mkdir -p /opt/cyphish/backups
docker compose exec -T mongodb mongodump \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --archive > "/opt/cyphish/backups/cyphish-$(date +%F).archive"
chmod 600 /opt/cyphish/backups/*.archive
```

Store encrypted backups outside the CyPhish host and test restoration regularly. To restore into a new/empty environment:

```bash
cat /path/to/cyphish-YYYY-MM-DD.archive | docker compose exec -T mongodb mongorestore \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --archive
```

Test the commands in a non-production environment first. A restore can overwrite data depending on the options used.

## 10. Upgrades

Before upgrading, back up MongoDB and record the deployed version. Then:

```bash
cd /opt/cyphish
git fetch --all --tags
git checkout <approved-tag-or-commit>
docker compose build --pull
docker compose up -d
docker compose logs --tail=100 cyphish
```

Validate sign-in, a dashboard request, the public training page, and sender-profile connectivity. Roll back by checking out the previous approved commit and running `docker compose up -d --build`; restore the database only when necessary.

## 11. Retention and privacy

CyPhish reporting is designed for a maximum six-month reporting window. Establish an organizational retention policy for campaign, recipient, click, and audit data before production launch. Do not use CyPhish to collect credentials. Limit access to administrators with a legitimate training or incident-response responsibility.

## 12. Troubleshooting

| Symptom | Checks |
| --- | --- |
| `cyphish` does not start | Run `docker compose logs cyphish`; verify `.env` contains `SESSION_SECRET`, `ADMIN_PASSWORD`, and MongoDB passwords. |
| Database authentication failure | Ensure `MONGO_APP_*` values match the values used when the volume was first initialized. For a fresh non-production install, remove only the validated CyPhish volume and redeploy. |
| LDAP search unavailable | Confirm `LDAP_ENABLED=true`, DNS/reachability from the container, Base DN, and the read-only bind account. |
| Campaign will not start | Check it has a purpose, scope, separate approval, and a currently valid send window. |
| Report not delivered | Confirm recipients, `REPORT_CRON`, SMTP sender profile ID, and SMTP delivery logs. |
| Public link uses the wrong host | Set `CAMPAIGN_PUBLIC_URL` to the externally reachable HTTPS URL and restart CyPhish. |

## API modules

- `GET /api/directory/status` — LDAP availability
- `GET /api/directory/users?scope=domain|group|ou&query=&groupDn=&ouDn=` — directory search
- `GET /api/dashboard/overview?start=&end=` — summary range, maximum 183 days
- `GET /api/dashboard/risk?start=&end=&groupBy=user|department|group` — risk reporting

Directory, reporting, and campaign-control routes require an administrator token.
