#!/bin/sh
set -e

# Runtime config injection for OttoChain Explorer
# Replaces placeholder values in config.js with environment variables

CONFIG_FILE="/usr/share/nginx/html/config.js"

# Only inject if environment variables are set
if [ -n "$GRAPHQL_URL" ] || [ -n "$BRIDGE_URL" ] || [ -n "$INDEXER_URL" ]; then
    echo "Injecting runtime configuration..."
    
    cat > "$CONFIG_FILE" << EOF
// Runtime configuration - injected at container startup
window.OTTOCHAIN_CONFIG = {
  GRAPHQL_URL: '${GRAPHQL_URL:-/graphql}',
  BRIDGE_URL: '${BRIDGE_URL:-/api/bridge}',
  INDEXER_URL: '${INDEXER_URL:-/api/indexer}',
};
EOF
    
    echo "Config injected: GRAPHQL_URL=${GRAPHQL_URL:-/graphql}, BRIDGE_URL=${BRIDGE_URL:-/api/bridge}, INDEXER_URL=${INDEXER_URL:-/api/indexer}"
fi

# Execute the main command (nginx)
exec "$@"
