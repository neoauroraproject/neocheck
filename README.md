# NeoCheck (v1.0.0)

NeoCheck is one of the cleanest, fastest, and most secure network diagnostics dashboards on the web. It analyzes connection properties, geolocations, security headers, WebRTC leak points, and IP reputation profiles in real-time.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/placeholder/neocheck/main/install.sh)
```
*Note: Run this one-line command to deploy NeoCheck instantly on Ubuntu Server.*

---

## Key Features
- **Instant Diagnostics:** Radar-style analysis triggered immediately on landing with smooth Framer Motion transitions.
- **Score Gauges:** A 0-100 overall connection health metric mapped dynamically.
- **Security Check Grid:** Probes and details VPN, proxy, Tor gateway, and datacenter network classifications.
- **Platform Detection:** Resolves browser context, operating system, HTTP version, and TLS configuration.
- **Admin Panel:** shaden/ui-inspired dashboard for settings, rotating log streams, database backup snapshots, and key validations.

---

## Architecture
NeoCheck utilizes an immutable check pipeline. Public requests trigger isolated providers concurrently, feeding their normalized outputs to a central aggregator. In production, Docker containers remain **100% Stateless**, mapping all persistent files to the host machine.

---

## Requirements
- **OS:** Ubuntu Server 22.04 LTS (or newer)
- **Engine:** Docker Engine & Docker Compose (automatically provisioned by the installer if missing)

---

## Installation

### 🚀 1-Click Setup
Deploy NeoCheck on your server in seconds:
```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/placeholder/neocheck/main/install.sh)
```
The installer installs Docker, configures persistent system directories, hashes keys, builds configurations, and launches the container stack.

---

## Quick Start
Perform lifecycle operations directly from `/opt/neocheck`:
- **Start:** `cd /opt/neocheck && docker compose up -d`
- **Stop:** `cd /opt/neocheck && docker compose down`
- **Restart:** `cd /opt/neocheck && docker compose restart`
- **View Logs:** `cd /opt/neocheck && docker compose logs -f`
- **Update:** `sudo bash /opt/neocheck/install.sh update` (boilerplate reference)

---

## Configuration
All settings are stored in `/opt/neocheck/config/config.yaml`.
Hot-reloads can be triggered from the admin dashboard without dropping connections. Environmental overrides are supported with the `NEOCHECK_` prefix.

---

## Screenshots
*(Screenshots showing Dark and Light mode diagnostics go here)*

---

## API Overview
- **GET** `/api/check` - Public endpoint returning client IP `ConnectionReport`.
- **GET** `/api/health` - Simple server heartbeat.
- **GET/PUT** `/api/admin/settings` - Secured admin settings configurations.

---

## Docker Layout
Exposes ports `3000` (Frontend Dashboard) and `8080` (Backend API). Mounts stateless host volumes:
- `/opt/neocheck/config/`
- `/opt/neocheck/database/`
- `/opt/neocheck/logs/`
- `/opt/neocheck/ssl/`
- `/opt/neocheck/backups/`

---

## Updating
Refer to [Deployment Guide](docs/deployment.md) for updates.

---

## License
NeoCheck is open-source software licensed under the [MIT License](LICENSE).

---

## Contributing
We welcome developer feedback! Review [Contributing Guidelines](CONTRIBUTING.md) to get involved.

---

## Support
For bugs and security concerns, please refer to [Security Guidelines](SECURITY.md) or open an issue using templates.
