// ============================================================
// AI API Relay — Smart Routing Module
// ============================================================
// Barrel export for the smart routing subsystem.

export type {
  RoutingStrategy,
  RoutingConfig,
  RoutingDecision,
  RoutingStatus,
  ProviderHealthInfo,
  ProviderHealthStatus,
  LatencyRecord,
  LatencyStats,
  ProviderCostWeight,
} from './types';

export { DEFAULT_ROUTING_CONFIG } from './types';

export {
  smartRoute,
  getRoutingConfig,
  isSmartRoutingConfigured,
  saveRoutingConfig,
  recordProviderResult,
  getProviderHealth,
  getRoutingStatus,
  shouldFailover,
  hasRecovered,
  resetProviderFailures,
} from './route-engine';

export {
  routeByStrategy,
} from './strategy';

export {
  recordLatency,
  getLatencyStats,
  getAllLatencyStats,
  getSuccessRate,
} from './latency-tracker';
