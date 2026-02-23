// Runtime configuration - injected at container startup
// This file is replaced by docker-entrypoint.sh with actual values
window.OTTOCHAIN_CONFIG = {
  GRAPHQL_URL: '/graphql',       // Proxied by nginx
  BRIDGE_URL: '/api/bridge',     // Proxied by nginx
  INDEXER_URL: '/api/indexer',   // Proxied by nginx
  // Add more config as needed
};
