# Configuration Guide

All NeoCheck settings are managed from a single source of truth located at `/opt/neocheck/config/config.yaml`.

## Configuration Schema

```yaml
server:
  host: "0.0.0.0"       # Backend binding address
  port: 8080            # Backend exposed port
branding:
  name: "NeoCheck"      # Public header title
  subtitle: "..."       # Public header subtitle
  logo: ""
ssl:
  enabled: false        # Enable SSL reverse-proxy path checking
  cert_path: ""         # Absolute path to certificate file
  key_path: ""          # Absolute path to private key file
admin:
  username: "admin"
  password_hash: ""     # Bcrypt hashed password
security:
  session_secret: ""    # Session token signing key
  jwt_secret: ""        # JWT session cookie key
database:
  path: "/opt/neocheck/database/neocheck.db"
```

## Environment Variable Overrides
Any YAML setting can be dynamically overridden using environment variables prefixed with `NEOCHECK_` (e.g. `NEOCHECK_SERVER_PORT=8080`).

## Reloading Configs
You can reload the configuration without restarting the application by hitting the **Reload Config** button in the Admin Dashboard, which invokes a hot reload.
