/**
 * API Fetch Helper with CSRF Token Handling
 * Handles CSRF token automatically and retries on 419 errors
 */

/**
 * Get fresh CSRF token from meta tag
 */
function getCsrfToken(): string {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') || '';
}

/**
 * Fetch with CSRF token handling and automatic retry on 419
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {},
    retryCount = 0
): Promise<Response> {
    const maxRetries = 1;
    const csrfToken = getCsrfToken();

    // Merge headers
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');
    
    // Add CSRF token if available
    if (csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken);
    }

    // Merge options
    const fetchOptions: RequestInit = {
        ...options,
        headers,
        credentials: 'same-origin', // Include cookies for session
    };

    try {
        const response = await fetch(url, fetchOptions);

        // Handle 419 CSRF token mismatch
        if (response.status === 419 && retryCount < maxRetries) {
            console.warn('CSRF token expired (419), refreshing page to get new token...');
            
            // Reload page to get fresh CSRF token
            window.location.reload();
            throw new Error('CSRF token expired, page reloaded');
        }

        // Handle other errors
        if (!response.ok && response.status !== 419) {
            // Try to parse error response
            try {
                const errorData = await response.clone().json();
                const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                
                // Create error object with response data
                const error = new Error(errorMessage) as any;
                error.response = {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData,
                };
                throw error;
            } catch (parseError) {
                // If parsing fails, throw generic error
                if (parseError instanceof Error && parseError.response) {
                    throw parseError;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }

        return response;
    } catch (error) {
        // If it's a 419 error and we haven't retried yet, reload page
        if (error instanceof Error && error.message.includes('419') && retryCount < maxRetries) {
            console.warn('CSRF token expired (419), refreshing page to get new token...');
            window.location.reload();
        }
        throw error;
    }
}

/**
 * Fetch JSON with automatic CSRF token handling
 */
export async function apiFetchJson<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await apiFetch(url, options);
    return response.json();
}

/**
 * POST JSON with CSRF token
 */
export async function apiPost<T = any>(
    url: string,
    data: any,
    options: RequestInit = {}
): Promise<T> {
    return apiFetchJson<T>(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * GET JSON with CSRF token
 */
export async function apiGet<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    return apiFetchJson<T>(url, {
        ...options,
        method: 'GET',
    });
}





