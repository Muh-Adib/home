/**
 * API Library Index
 * Single entry point untuk semua API functionality
 */

// Re-export ApiClient class (named export)
export { ApiClient } from './client';

// Re-export default ApiClient
export { default } from './client';

// Export types and interfaces
export type { ApiError, ApiResponse, RequestConfig } from './client';

// Export all services
export * from './services';

// Re-export for convenience
export { API_CONFIG, API_ENDPOINTS, apiUtils } from '@/config/api';
