# Installation Guide

NeoCheck features an interactive one-line installation script designed for Ubuntu Server.

## Prerequisites
- Ubuntu Server 22.04 LTS or newer (recommended).
- Root or `sudo` access.

## One-Line Install
Run the following command on your server to launch the installation wizard:

```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/placeholder/neocheck/main/install.sh)
```

## What the Installer Does:
1. Validates the host system OS (Ubuntu check).
2. Verifies basic dependencies (`curl`, `openssl`, `iproute2`).
3. Installs **Docker** and **Docker Compose** automatically if missing.
4. Walks you through an interactive setup wizard to configure the port, public address, admin credentials, SSL keys, and brand details.
5. Securely hashes your administrator password with `bcrypt`.
6. Sets up the stateless system folder structure at `/opt/neocheck/`.
7. Bootstraps the container stack and verifies server health.
