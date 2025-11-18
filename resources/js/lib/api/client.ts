/**
 * Centralized API Client
 * Single entry point untuk semua API calls dengan security dan error handling
 */

import { API_CONFIG } from '@/config/api';

export interface ApiError {
    message: string;
    status: number;
    statusText: string;
    data?: any;
    errors?: Record<string, string[]>;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export interface RequestConfig extends RequestInit {
    timeout?: number;
    retry?: {
        attempts: number;
        delay: number;
    };
    skipAuth?: boolean;
    skipCsrf?: boolean;
}

/**
 * Get CSRF token from meta tag
 */
function getCsrfToken(): string {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') || '';
}

/**
 * Get auth token from storage (if using token-based auth)
 */
function getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

/**
 * Create timeout promise
 */
function createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    });
}

/**
 * Sleep utility for retry delay
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse error response
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
    let errorData: any = {};
    
    try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            errorData = await response.clone().json();
        } else {
            errorData = { message: await response.clone().text() };
        }
    } catch {
        errorData = { message: response.statusText };
    }

    return {
        message: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        data: errorData,
        errors: errorData.errors || {},
    };
}

/**
 * Handle 419 CSRF token mismatch
 */
async function handleCsrfError(): Promise<void> {
    try {
        // Try to refresh CSRF token
        const response = await fetch('/csrf-token', {
            method: 'GET',
            credentials: 'same-origin',
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                // Update meta tag
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (meta) {
                    meta.setAttribute('content', data.token);
                }
                return;
            }
        }
    } catch {
        // If refresh fails, reload page
        console.warn('CSRF token refresh failed, reloading page...');
        window.location.reload();
    }
}

/**
 * Core API fetch function with retry logic
 */
async function apiRequest<T = any>(
    url: string,
    config: RequestConfig = {}
): Promise<ApiResponse<T>> {
    const {
        timeout = API_CONFIG.TIMEOUT,
        retry = API_CONFIG.RETRY,
        skipAuth = false,
        skipCsrf = false,
        ...fetchOptions
    } = config;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

    // Prepare headers
    const headers = new Headers(fetchOptions.headers);
    
    // Set default headers
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    // Add CSRF token
    if (!skipCsrf) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            headers.set('X-CSRF-TOKEN', csrfToken);
        }
    }

    // Add auth token if available
    if (!skipAuth) {
        const authToken = getAuthToken();
        if (authToken) {
            headers.set('Authorization', `Bearer ${authToken}`);
        }
    }

    // Prepare fetch options
    const options: RequestInit = {
        ...fetchOptions,
        headers,
        credentials: 'same-origin',
    };

    // Retry logic
    let lastError: ApiError | null = null;
    const maxAttempts = retry.attempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Create abort controller for timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), timeout);

            try {
                const response = await fetch(fullUrl, {
                    ...options,
                    signal: abortController.signal,
                });

                clearTimeout(timeoutId);

                // Handle 419 CSRF token mismatch
                if (response.status === 419 && !skipCsrf) {
                    await handleCsrfError();
                    // Retry once after CSRF refresh
                    if (attempt < maxAttempts) {
                        await sleep(retry.delay);
                        continue;
                    }
                }

                // Handle errors
                if (!response.ok) {
                    const error = await parseErrorResponse(response);
                    lastError = error;

                    // Retry on 5xx errors or network errors
                    if ((response.status >= 500 || response.status === 0) && attempt < maxAttempts) {
                        await sleep(retry.delay * attempt); // Exponential backoff
                        continue;
                    }

                    throw error;
                }

                // Parse successful response
                const contentType = response.headers.get('content-type');
                let data: T;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text() as any;
                }

                // Check if response has Laravel structure
                if (data && typeof data === 'object' && 'data' in data) {
                    return {
                        success: true,
                        data: (data as any).data,
                        message: (data as any).message,
                    };
                }

                return {
                    success: true,
                    data,
                };

            } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // Handle abort (timeout)
                if (fetchError.name === 'AbortError') {
                    lastError = {
                        message: `Request timeout after ${timeout}ms`,
                        status: 0,
                        statusText: 'Timeout',
                    };
                } else if (fetchError.status) {
                    // Already parsed error
                    lastError = fetchError;
                } else {
                    // Network error
                    lastError = {
                        message: fetchError.message || 'Network error',
                        status: 0,
                        statusText: 'Network Error',
                    };
                }

                // Retry on network errors or 5xx
                if (lastError && (lastError.status === 0 || lastError.status >= 500) && attempt < maxAttempts) {
                    await sleep(retry.delay * attempt);
                    continue;
                }

                if (lastError) {
                    throw lastError;
                }
            }
        } catch (error) {
            if (error instanceof Error && 'status' in error) {
                throw error;
            }
            throw lastError || {
                message: error instanceof Error ? error.message : 'Unknown error',
                status: 0,
                statusText: 'Unknown Error',
            };
        }
    }

    const finalError = lastError || {
        message: 'Request failed after all retries',
        status: 0,
        statusText: 'Retry Exhausted',
    };
    throw finalError;
}

/**
 * API Client Class
 */
export class ApiClient {
    /**
     * GET request
     */
    static async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
        const response = await apiRequest<T>(url, {
            ...config,
            method: 'GET',
        });
        return response.data as T;
    }

    /**
     * POST request
     */
    static async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        const response = await apiRequest<T>(url, {
            ...config,
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
        return response.data as T;
    }

    /**
     * PUT request
     */
    static async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        const response = await apiRequest<T>(url, {
            ...config,
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
        return response.data as T;
    }

    /**
     * PATCH request
     */
    static async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        const response = await apiRequest<T>(url, {
            ...config,
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
        return response.data as T;
    }

    /**
     * DELETE request
     */
    static async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
        const response = await apiRequest<T>(url, {
            ...config,
            method: 'DELETE',
        });
        return response.data as T;
    }

    /**
     * Upload file
     */
    static async upload<T = any>(url: string, file: File | FormData, config?: RequestConfig): Promise<T> {
        const formData = file instanceof FormData ? file : (() => {
            const fd = new FormData();
            fd.append('file', file);
            return fd;
        })();

        const response = await apiRequest<T>(url, {
            ...config,
            method: 'POST',
            body: formData,
            skipCsrf: false, // CSRF still needed for file uploads
        });
        return response.data as T;
    }
}

// Export default instance
export default ApiClient;

