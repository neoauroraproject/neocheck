#!/bin/bash
# NeoCheck Installer Script
# Designed for Ubuntu Server

# Move to root to avoid getcwd errors if run from a deleted directory
cd / || true

set -e

# Constants
REPO_URL="https://github.com/neoauroraproject/neocheck.git"
INSTALL_DIR="/opt/neocheck"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (sudo bash install.sh)"
    fi
}

check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" != "ubuntu" ]; then
            log_warn "This script is designed for Ubuntu Server. Your OS is $ID. Proceed with caution."
        fi
    else
        log_error "Cannot determine OS. Only Ubuntu is officially supported."
    fi
}

check_dependencies() {
    log_info "Checking basic dependencies..."
    
    if ! command -v curl &> /dev/null; then
        log_info "Installing curl..."
        apt-get update -y && apt-get install -y curl
    fi

    if ! command -v openssl &> /dev/null; then
        log_info "Installing openssl..."
        apt-get update -y && apt-get install -y openssl
    fi
    
    if ! command -v ss &> /dev/null; then
        log_info "Installing iproute2..."
        apt-get update -y && apt-get install -y iproute2
    fi

    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_info "Installing Docker Compose..."
        apt-get update -y && apt-get install -y docker-compose-plugin
    fi
}

prompt_port() {
    while true; do
        read -p "Enter Server Port [8080]: " SERVER_PORT </dev/tty || true
        SERVER_PORT=${SERVER_PORT:-8080}
        
        # Check if port is in use
        if ss -tuln | grep -q ":$SERVER_PORT\b"; then
            log_warn "Port $SERVER_PORT is currently in use. Please select another port."
        else
            break
        fi
    done
}

prompt_address() {
    AUTO_IP=$(curl -sSL https://api.ipify.org || echo "127.0.0.1")
    read -p "Enter Public Address (IP or Domain) [$AUTO_IP]: " PUBLIC_ADDRESS </dev/tty || true
    PUBLIC_ADDRESS=${PUBLIC_ADDRESS:-$AUTO_IP}
    while [ -z "$PUBLIC_ADDRESS" ]; do
        read -p "Public Address is required: " PUBLIC_ADDRESS </dev/tty || true
    done
}

prompt_admin() {
    read -p "Enter Admin Username [admin]: " ADMIN_USER </dev/tty || true
    ADMIN_USER=${ADMIN_USER:-admin}

    while true; do
        read -s -p "Enter Admin Password: " ADMIN_PASS </dev/tty || true
        echo
        read -s -p "Confirm Admin Password: " ADMIN_PASS_CONFIRM </dev/tty || true
        echo
        
        if [ -z "$ADMIN_PASS" ]; then
            log_warn "Password cannot be empty."
        elif [ "$ADMIN_PASS" != "$ADMIN_PASS_CONFIRM" ]; then
            log_warn "Passwords do not match. Try again."
        else
            break
        fi
    done
}

prompt_ssl() {
    SSL_ENABLED=false
    SSL_CERT=""
    SSL_KEY=""
    
    while true; do
        read -p "Enable SSL? (Y/N) [N]: " SSL_CHOICE </dev/tty || true
        SSL_CHOICE=${SSL_CHOICE:-N}
        case $SSL_CHOICE in
            [Yy]* ) 
                SSL_ENABLED=true
                while true; do
                    read -p "Enter Absolute Path to Certificate (.crt/.pem): " SSL_CERT </dev/tty || true
                    if [ -f "$SSL_CERT" ]; then
                        break
                    else
                        log_warn "Certificate file not found at $SSL_CERT"
                    fi
                done
                while true; do
                    read -p "Enter Absolute Path to Private Key (.key): " SSL_KEY </dev/tty || true
                    if [ -f "$SSL_KEY" ]; then
                        break
                    else
                        log_warn "Key file not found at $SSL_KEY"
                    fi
                done
                break;;
            [Nn]* ) break;;
            * ) echo "Please answer yes (Y) or no (N).";;
        esac
    done
}

prompt_branding() {
    read -p "Enter Brand Name [NeoCheck]: " BRAND_NAME </dev/tty || true
    BRAND_NAME=${BRAND_NAME:-NeoCheck}
}

setup_directories() {
    log_info "Creating filesystem layout in $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR/config"
    mkdir -p "$INSTALL_DIR/database"
    mkdir -p "$INSTALL_DIR/logs"
    mkdir -p "$INSTALL_DIR/ssl"
    mkdir -p "$INSTALL_DIR/backups"
    mkdir -p "$INSTALL_DIR/src"
}

fetch_source() {
    log_info "Fetching NeoCheck source code..."
    if command -v git &> /dev/null; then
        if [ -d "$INSTALL_DIR/src/.git" ]; then
            log_info "Source already exists, pulling latest..."
            cd "$INSTALL_DIR/src" && git pull
        else
            git clone "$REPO_URL" "$INSTALL_DIR/src" || log_error "Failed to clone repository. Is the REPO_URL valid?"
        fi
    else
        log_info "Installing git..."
        apt-get update -y && apt-get install -y git
        git clone "$REPO_URL" "$INSTALL_DIR/src" || log_error "Failed to clone repository. Is the REPO_URL valid?"
    fi
}

generate_config() {
    log_info "Generating secure configurations..."
    
    log_info "Hashing password..."
    HASHED_PASS=$(docker run --rm alpine sh -c "apk add --no-cache apache2-utils >/dev/null 2>&1 && htpasswd -B -n -b user '$ADMIN_PASS'" | cut -d':' -f2)
    
    if [ -z "$HASHED_PASS" ]; then
        log_error "Failed to generate bcrypt hash."
    fi

    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)

    # Determine Public URL
    if [ "$SSL_ENABLED" = "true" ]; then
        PUBLIC_URL="https://$PUBLIC_ADDRESS"
        log_info "Copying SSL certificates to internal storage..."
        cp "$SSL_CERT" "$INSTALL_DIR/ssl/server.crt"
        cp "$SSL_KEY" "$INSTALL_DIR/ssl/server.key"
        CONFIG_SSL_CERT="/opt/neocheck/ssl/server.crt"
        CONFIG_SSL_KEY="/opt/neocheck/ssl/server.key"
    else
        if [ "$SERVER_PORT" = "80" ]; then
            PUBLIC_URL="http://$PUBLIC_ADDRESS"
        else
            PUBLIC_URL="http://$PUBLIC_ADDRESS:$SERVER_PORT"
        fi
        CONFIG_SSL_CERT=""
        CONFIG_SSL_KEY=""
    fi

    cat <<EOF > "$INSTALL_DIR/config/config.yaml"
server:
  host: "0.0.0.0"
  port: 8080
branding:
  name: "$BRAND_NAME"
  subtitle: "Know your connection in seconds."
  logo: ""
  favicon: ""
  primary_color: "#8b5cf6"
  accent_color: "#6366f1"
  footer_text: "Managed by Immutable Diagnostics."
  copyright_text: "$BRAND_NAME"
  support_url: "https://github.com/neoauroraproject/neocheck/issues"
  github_url: "https://github.com/neoauroraproject/neocheck"
  documentation_url: "https://github.com/neoauroraproject/neocheck/tree/main/docs"
  public_url: "$PUBLIC_URL"
ssl:
  enabled: $SSL_ENABLED
  cert_path: "$CONFIG_SSL_CERT"
  key_path: "$CONFIG_SSL_KEY"
admin:
  username: "$ADMIN_USER"
  password_hash: "$HASHED_PASS"
security:
  session_secret: "$SESSION_SECRET"
  jwt_secret: "$JWT_SECRET"
providers:
  abuseipdb:
    enabled: false
    api_key: ""
  bigdatacloud:
    enabled: false
    api_key: ""
  ipqualityscore:
    enabled: false
    api_key: ""
  scamalytics:
    enabled: false
    api_key: ""
features:
  ipv6: true
  webrtc: true
  dns_leak: true
  service_check: true
  fraud_check: true
database:
  path: "/opt/neocheck/database/neocheck.db"
EOF
    log_success "config.yaml generated."
}

generate_docker_compose() {
    generate_docker_compose_for_port "$SERVER_PORT"
}

generate_docker_compose_for_port() {
    local port="$1"
    log_info "Generating docker-compose.yml..."
    cat <<EOF > "$INSTALL_DIR/docker-compose.yml"
services:
  backend:
    image: ghcr.io/neoauroraproject/neocheck-backend:latest
    ports:
      - "$port:8080"
    volumes:
      - ./config:/opt/neocheck/config
      - ./database:/opt/neocheck/database
      - ./ssl:/opt/neocheck/ssl
      - ./logs:/opt/neocheck/logs
      - ./backups:/opt/neocheck/backups
    restart: unless-stopped
    environment:
      - GIN_MODE=release
      - NEOCHECK_DATA_DIR=/opt/neocheck

  frontend:
    image: ghcr.io/neoauroraproject/neocheck-frontend:latest
    restart: unless-stopped
    depends_on:
      - backend
EOF
    log_success "docker-compose.yml generated."
}

detect_server_port() {
    local port=""
    if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
        port=$(grep -oE '[0-9]+:8080' "$INSTALL_DIR/docker-compose.yml" | head -1 | cut -d: -f1)
    fi
    echo "${port:-8080}"
}

ensure_docker_compose() {
    local port
    port=$(detect_server_port)

    if [ ! -f "$INSTALL_DIR/docker-compose.yml" ]; then
        log_warn "docker-compose.yml missing. Regenerating..."
        generate_docker_compose_for_port "$port"
        return
    fi

    if ! grep -q "^[[:space:]]*frontend:" "$INSTALL_DIR/docker-compose.yml"; then
        log_warn "docker-compose.yml is outdated (missing frontend service). Regenerating..."
        generate_docker_compose_for_port "$port"
    fi
}

wait_for_health() {
    local port="$1"
    log_info "Waiting for application health check on port $port..."
    for i in {1..45}; do
        if curl -s -f "http://127.0.0.1:$port/api/health" > /dev/null; then
            log_success "Application is healthy and responding."
            return 0
        fi
        sleep 2
    done

    log_warn "Application did not become healthy in time."
    log_info "Container status:"
    if docker compose version &> /dev/null; then
        docker compose ps || true
        log_info "Recent logs:"
        docker compose logs --tail=40 || true
    else
        docker-compose ps || true
        docker-compose logs --tail=40 || true
    fi
    return 1
}

compose_up() {
    if docker compose version &> /dev/null; then
        docker compose up -d --force-recreate --remove-orphans --pull always
    else
        docker-compose up -d --force-recreate --remove-orphans --pull always
    fi
}

compose_pull() {
    if docker compose version &> /dev/null; then
        docker compose pull
    else
        docker-compose pull
    fi
}

compose_down() {
    if docker compose version &> /dev/null; then
        docker compose down --remove-orphans || true
    else
        docker-compose down --remove-orphans || true
    fi
}

start_application() {
    log_info "Starting NeoCheck application via Docker Compose..."
    cd "$INSTALL_DIR"

    compose_pull || log_warn "Some images could not be pulled. Continuing with available images."
    compose_up

    wait_for_health "$SERVER_PORT" || log_warn "Application is taking longer than expected to start. Please check logs."
}

finish_installation() {
    echo -e "\n============================================="
    echo -e "${GREEN}✨ NeoCheck successfully installed! ✨${NC}"
    echo -e "=============================================\n"
    
    PROTOCOL="http"
    if [ "$SSL_ENABLED" = true ]; then
        PROTOCOL="https"
    fi

    echo -e "🌐 ${CYAN}Application URL:${NC}  $PROTOCOL://$PUBLIC_ADDRESS:$SERVER_PORT"
    echo -e "🛡️  ${CYAN}Admin URL:${NC}        $PROTOCOL://$PUBLIC_ADDRESS:$SERVER_PORT/admin"
    echo -e "👤 ${CYAN}Admin Username:${NC}   $ADMIN_USER"
    echo -e ""
    echo -e "📁 ${CYAN}Installation Directory:${NC}  $INSTALL_DIR"
    echo -e "📄 ${CYAN}Configuration File:${NC}      $INSTALL_DIR/config/config.yaml"
    echo -e "📜 ${CYAN}Log Directory:${NC}           $INSTALL_DIR/logs"
    echo -e "🗄️  ${CYAN}Database Location:${NC}       $INSTALL_DIR/database/neocheck.db"
    echo -e "\n============================================="
    echo -e "To view logs: cd $INSTALL_DIR && docker compose logs -f"
}

action_install() {
    echo -e "${CYAN}Welcome to NeoCheck Installer${NC}\n"
    check_root
    check_os
    check_dependencies
    
    prompt_port
    prompt_address
    prompt_admin
    prompt_ssl
    prompt_branding
    
    setup_directories
    fetch_source
    generate_config
    generate_docker_compose
    
    start_application
    finish_installation
}

action_update() {
    check_root
    log_info "Checking current installation..."
    if [ ! -d "$INSTALL_DIR" ] || [ ! -f "$INSTALL_DIR/docker-compose.yml" ]; then
        log_error "NeoCheck installation not found in $INSTALL_DIR. Please run installation first."
    fi

    log_info "Starting update process..."

    # 1. Update source code if present (reference only; runtime uses Docker images)
    if [ -d "$INSTALL_DIR/src/.git" ]; then
        log_info "Updating source code repository..."
        cd "$INSTALL_DIR/src"
        git pull || log_warn "Failed to pull latest git changes. Proceeding anyway."
    fi

    cd "$INSTALL_DIR"
    SERVER_PORT=$(detect_server_port)
    ensure_docker_compose

    # 2. Stop old containers so new images are always applied cleanly
    log_info "Stopping current containers..."
    compose_down

    # 3. Pull latest images and recreate containers
    log_info "Pulling latest Docker images..."
    compose_pull || log_warn "Some images could not be pulled. Continuing with available images."

    log_info "Starting containers with latest images..."
    compose_up

    # 4. Verify the app actually came back
    if wait_for_health "$SERVER_PORT"; then
        log_info "Pruning unused Docker images..."
        docker image prune -f || true
        log_success "NeoCheck has been successfully updated to the latest version!"
    else
        log_error "Update finished but NeoCheck is not healthy. Run: cd $INSTALL_DIR && docker compose logs -f"
    fi
}

action_uninstall() {
    log_info "Starting uninstallation process..."
    
    if [ -d "$INSTALL_DIR" ]; then
        cd "$INSTALL_DIR"
        
        log_info "Stopping containers and freeing up ports..."
        if docker compose version &> /dev/null; then
            docker compose down -v || true
        else
            docker-compose down -v || true
        fi
        
        cd /
        log_info "Removing installation directory: $INSTALL_DIR"
        rm -rf "$INSTALL_DIR"
        
        log_success "NeoCheck has been completely uninstalled and all ports are freed!"
    else
        log_warn "Installation directory $INSTALL_DIR not found. Nothing to uninstall."
    fi
}

action_repair() {
    log_info "Repair functionality is handled by reinstalling via Option 1."
}

# Main Command Router
show_menu() {
    echo -e "${CYAN}======================================${NC}"
    echo -e "${GREEN}      NeoCheck Setup & Manager      ${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo -e "1) Install NeoCheck"
    echo -e "2) Update NeoCheck"
    echo -e "3) Uninstall NeoCheck"
    echo -e "4) Exit"
    echo -e "${CYAN}======================================${NC}"
    
    while true; do
        read -p "Select an option [1-4]: " MENU_CHOICE </dev/tty || true
        case $MENU_CHOICE in
            1) action_install; break;;
            2) action_update; break;;
            3) action_uninstall; break;;
            4) log_info "Exiting."; exit 0;;
            *) echo "Invalid option. Please enter 1, 2, 3, or 4.";;
        esac
    done
}

if [ -z "$1" ]; then
    show_menu
else
    COMMAND=$1
    case "$COMMAND" in
        install) action_install ;;
        update) action_update ;;
        uninstall) action_uninstall ;;
        repair) action_install ;;
        *) log_error "Unknown command: $COMMAND. Valid commands: install, update, uninstall, repair." ;;
    esac
fi
