# NeoCheck Release Roadmap

## Phase 1: Foundation (Completed)
- Clean, modular backend APIs in Go (Gin, GORM, Zap).
- Basic front-end structure (Next.js, Tailwind).
- Multi-stage Docker packaging.

## Phase 2: Configuration Manager (Completed)
- Viper integration for secure, auto-generated settings (`config.yaml`).
- Immutable settings state reloading.

## Phase 2.5: Architecture Hardening (Completed)
- Stateless containers with persistent host volumes mounted to `/opt/neocheck/`.
- Dynamic environment variable overrides.
- Rotating file logging (Lumberjack).
- Strict compiler locks targeting Go 1.24.

## Phase 3: Installer System (Completed)
- Bootstrapping shell script (`install.sh`) to automate Docker and setup directories on Ubuntu Server.

## Milestone 2: Core Detection Engine (Completed)
- Immutable, concurrent provider check pipeline and aggregator.
- Scaffolded provider integrations.

## Milestone 3: Administration Panel (Completed)
- JWT-based admin logins.
- Status tracking, log tail streams, and SQLite backup/restore management.
- shadcn/ui inspired settings dashboard.

## Milestone 4: Premium Diagnostics (Completed)
- Responsive public diagnostic experience utilizing Framer Motion animations.

## Future Plans
- [ ] Integration of real MaxMind GeoIP lookups.
- [ ] Implement actual AbuseIPDB/Scamalytics API checks.
- [ ] Custom WebRTC candidate leak analyzer.
- [ ] Automated system updates via `install.sh`.
