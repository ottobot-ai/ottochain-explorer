/**
 * Runtime configuration for OttoChain Explorer
 * 
 * Values come from:
 * 1. window.OTTOCHAIN_CONFIG (injected by docker-entrypoint.sh at runtime)
 * 2. import.meta.env.VITE_* (baked in at build time)
 * 3. Hardcoded defaults (for local development)
 */

interface OttoChainConfig {
  GRAPHQL_URL: string;
  BRIDGE_URL: string;
  INDEXER_URL: string;
}

declare global {
  interface Window {
    OTTOCHAIN_CONFIG?: Partial<OttoChainConfig>;
  }
}

const runtimeConfig = window.OTTOCHAIN_CONFIG || {};

export const config: OttoChainConfig = {
  GRAPHQL_URL: runtimeConfig.GRAPHQL_URL 
    || import.meta.env.VITE_GRAPHQL_URL 
    || '/graphql',
  BRIDGE_URL: runtimeConfig.BRIDGE_URL 
    || import.meta.env.VITE_BRIDGE_URL 
    || '/api/bridge',
  INDEXER_URL: runtimeConfig.INDEXER_URL 
    || import.meta.env.VITE_INDEXER_URL 
    || '/api/indexer',
};

export default config;
