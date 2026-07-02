# Production Deployment

NeoCheck is packaged using multi-stage Docker builds to ensure container footprints remain minimal and fast.

## Deployment with Docker Compose

Deploy the stack instantly with Docker Compose:

```bash
docker-compose up -d --build
```

## Persistent Volumes Layout
All mutable application state lives outside the containers at `/opt/neocheck/` (or mapped locally to `./neocheck-data` on the host):
- `/opt/neocheck/config/config.yaml`
- `/opt/neocheck/database/neocheck.db`
- `/opt/neocheck/logs/neocheck.log`
- `/opt/neocheck/ssl/`
- `/opt/neocheck/backups/`

## Safe Backups
You can download, trigger, or restore SQLite database backups directly from the Admin Dashboard or copy files from the host backups folder securely.
