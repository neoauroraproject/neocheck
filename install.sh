#!/bin/bash
# NeoCheck Installer Script
# Designed for Ubuntu Server

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
        if ss -tuln | grep -q ":$SERVER_PORT "; then
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
    else
        if [ "$SERVER_PORT" = "80" ]; then
            PUBLIC_URL="http://$PUBLIC_ADDRESS"
        else
            PUBLIC_URL="http://$PUBLIC_ADDRESS:$SERVER_PORT"
        fi
    fi

    cat <<EOF > "$INSTALL_DIR/config/config.yaml"
server:
  host: "0.0.0.0"
  port: $SERVER_PORT
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
  cert_path: "$SSL_CERT"
  key_path: "$SSL_KEY"
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
    log_info "Generating docker-compose.yml..."
    cat <<EOF > "$INSTALL_DIR/docker-compose.yml"
services:
  backend:
    image: ghcr.io/neoauroraproject/neocheck-backend:latest
    ports:
      - "127.0.0.1:8080:8080"
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
    ports:
      - "$SERVER_PORT:3000"
    restart: unless-stopped
    depends_on:
      - backend
EOF
    log_success "docker-compose.yml generated."
}

start_application() {
    log_info "Starting NeoCheck application via Docker Compose..."
    cd "$INSTALL_DIR"
    
    if docker compose version &> /dev/null; then
        docker compose pull && docker compose up -d
    else
        docker-compose pull && docker-compose up -d
    fi

    log_info "Waiting for application health check..."
    for i in {1..30}; do
        if curl -s -f http://127.0.0.1:$SERVER_PORT/api/health > /dev/null; then
            log_success "Application is healthy and responding."
            break
        fi
        sleep 2
        if [ "$i" -eq 30 ]; then
            log_warn "Application is taking longer than expected to start. Please check logs."
        fi
    done
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
    log_info "Update functionality is reserved for future implementation."
}

action_uninstall() {
    log_info "Uninstall functionality is reserved for future implementation."
}

action_repair() {
    log_info "Repair functionality is reserved for future implementation."
}

# Main Command Router
COMMAND=${1:-install}

case "$COMMAND" in
    install) action_install ;;
    update) action_update ;;
    uninstall) action_uninstall ;;
    repair) action_repair ;;
    *) log_error "Unknown command: $COMMAND. Valid commands: install, update, uninstall, repair." ;;
esac
