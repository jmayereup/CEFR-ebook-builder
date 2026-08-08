#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

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
SERVICE_NAME="${DEPLOY_SERVICE_NAME:-tj-books.service}"

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

# 3. Ensure destination directory exists and rsync build files
echo "-> Ensuring remote target directory exists ($SERVER_PATH)..."
ssh -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH"

echo "-> Uploading build artifacts, public covers/assets, and package configs..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=accept-new" dist/ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/dist/"
ssh -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/tj-gen/public/covers $SERVER_PATH/public"
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new" public/covers/ "$SERVER_USER@$SERVER_IP:/opt/tj-gen/public/covers/"
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new" package.json package-lock.json "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# 4. Install production dependencies and restart the service
echo "-> Installing dependencies and restarting service on server..."
ssh -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" "bash -s" << EOF
  set -e
  echo "Running on server..."

  mkdir -p /opt/tj-gen/public/covers "$SERVER_PATH/public"
  if [ ! -L "$SERVER_PATH/public/covers" ]; then
    rm -rf "$SERVER_PATH/public/covers"
    ln -s /opt/tj-gen/public/covers "$SERVER_PATH/public/covers"
  fi

  # Load NVM if installed
  export NVM_DIR="\$HOME/.nvm"
  if [ -s "\$NVM_DIR/nvm.sh" ]; then
    . "\$NVM_DIR/nvm.sh"
  fi
  export PATH="\$HOME/.nvm/versions/node/v24.19.0/bin:\$PATH:/usr/local/bin:\$HOME/.nvm/versions/node/\$(ls "\$NVM_DIR/versions/node" 2>/dev/null | tail -n 1)/bin"

  cd "$SERVER_PATH"
  
  # Install production dependencies (fast, only additions/updates if needed)
  npm install --omit=dev --no-audit --no-fund
  
  # Restart systemd service
  echo "Restarting service: $SERVICE_NAME"
  if command -v systemctl &>/dev/null; then
    sudo systemctl restart "$SERVICE_NAME" 2>/dev/null || systemctl restart "$SERVICE_NAME"
    
    # Verify service status
    echo "Verifying service status..."
    sudo systemctl is-active "$SERVICE_NAME" 2>/dev/null || systemctl is-active "$SERVICE_NAME" || (
      echo "Service failed to start!"
      sudo systemctl status "$SERVICE_NAME" --no-pager 2>/dev/null || systemctl status "$SERVICE_NAME" --no-pager
      exit 1
    )
  fi
  
  echo "Server deployment actions completed successfully."
EOF

# 5. Sync dynamic covers from the server back to local public/covers/ directory for git tracking
echo "-> Syncing covers from server to local public/covers/..."
mkdir -p "$SCRIPT_DIR/public/covers"
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/public/covers/" "$SCRIPT_DIR/public/covers/" 2>/dev/null || true

echo "========================================="
echo " Deployment Finished Successfully!"
echo "========================================="
