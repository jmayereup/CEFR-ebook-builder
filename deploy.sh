#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Self-reentry pattern: if run on host, restart inside the distrobox container
if [ ! -f /run/.containerenv ] && command -v distrobox &> /dev/null; then
  echo "=== Running deploy script inside 'dev-box' container ==="
  exec distrobox enter -T dev-box -- "$0" "$@"
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables from .env files if they exist
load_env() {
  local file="$1"
  if [ -f "$file" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
      # Skip comments and empty lines
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ "$line" =~ ^[[:space:]]*$ ]] && continue
      
      # Strip export prefix if present
      line="${line#export }"
      
      # Extract key and value
      if [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        
        # Strip surrounding quotes from value
        val="${val#\"}"
        val="${val%\"}"
        val="${val#\'}"
        val="${val%\'}"
        
        # Only export if not already set
        if [ -z "${!key}" ]; then
          export "$key=$val"
        fi
      fi
    done < "$file"
  fi
}

load_env "$SCRIPT_DIR/.env"
load_env "$SCRIPT_DIR/.env.local"

# Set configuration from environment variables
SERVER_IP="${DEPLOY_SERVER_IP}"
SERVER_USER="${DEPLOY_SERVER_USER}"
SERVER_PATH="${DEPLOY_SERVER_PATH}"
SERVICE_NAME="${DEPLOY_SERVICE_NAME}"

# Verify required configuration is present
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_PATH" ] || [ -z "$SERVICE_NAME" ]; then
  echo "Error: Required deployment configuration is missing."
  echo "Please define the following variables in your environment or .env file:"
  echo "  - DEPLOY_SERVER_IP"
  echo "  - DEPLOY_SERVER_USER"
  echo "  - DEPLOY_SERVER_PATH"
  echo "  - DEPLOY_SERVICE_NAME"
  exit 1
fi


echo "========================================="
echo " Starting Deploy to $SERVER_IP"
echo "========================================="

# 1. Run local build
echo "-> Running local build (npm run build)..."
VITE_BACKEND_PROVIDER=pocketbase npm run build

# 2. Check SSH connection to server
echo "-> Testing SSH connection to $SERVER_USER@$SERVER_IP..."
if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" "echo 'SSH Connection Successful'" &>/dev/null; then
  echo "Error: Cannot connect to $SERVER_USER@$SERVER_IP via SSH."
  exit 1
fi

# 3. Rsync build files to the server
echo "-> Uploading build artifacts and package configs..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=accept-new" dist/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/dist/"
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new" package.json package-lock.json "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# 4. Install production dependencies and restart the service
echo "-> Installing dependencies and restarting service on server..."
ssh -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" "bash -s" << EOF
  set -e
  echo "Running on server..."
  cd "$SERVER_PATH"
  
  # Install production dependencies (fast, only additions/updates if needed)
  npm install --omit=dev --no-audit --no-fund
  
  # Ensure proper ownership for all files (ghost-mgr owns the application)
  chown -R ghost-mgr:ghost-mgr "$SERVER_PATH/dist" "$SERVER_PATH/node_modules" "$SERVER_PATH/package.json" "$SERVER_PATH/package-lock.json"
  
  # Restart systemd service
  echo "Restarting service: $SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
  
  # Verify service status
  echo "Verifying service status..."
  systemctl is-active "$SERVICE_NAME" || (echo "Service failed to start!" && systemctl status "$SERVICE_NAME" --no-pager && exit 1)
  
  echo "Server deployment actions completed successfully."
EOF

echo "========================================="
echo " Deployment Finished Successfully!"
echo "========================================="
