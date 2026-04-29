/**
 * Centralized API fetch utility — replaces axios.
 * Automatically handles:
 *  - CSRF token from <meta name="csrf-token">
 *  - JSON request/response
 *  - 419 CSRF expiry → page reload
 *  - 401 Unauthorised → page reload
 *  - Typed error responses
 */

export interface ApiError {
    status: number;
    message: string;
    data?: any;
}

function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    return document.head
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content') ?? '';
}

function buildHeaders(extra: HeadersInit = {}): HeadersInit {
    return {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': getCsrfToken(),
        Accept: 'application/json',
        ...extra,
    };
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (typeof window !== 'undefined') {
        if (res.status === 419) {
            window.location.reload();
            return Promise.reject<T>({ status: 419, message: 'CSRF token expired' });
        }
        if (res.status === 401) {
            window.location.reload();
            return Promise.reject<T>({ status: 401, message: 'Unauthorised' });
        }
    }

    if (!res.ok) {
        let data: any;
        try { data = await res.json(); } catch { data = {}; }
        return Promise.reject<T>({ status: res.status, message: data?.message ?? res.statusText, data });
    }

    // 204 No Content
    if (res.status === 204) return undefined as unknown as T;

    return res.json() as Promise<T>;
}

/** GET */
export function apiGet<T = any>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
    const fullUrl = params
        ? `${url}?${new URLSearchParams(
              Object.fromEntries(
                  Object.entries(params)
                      .filter(([, v]) => v !== undefined)
                      .map(([k, v]) => [k, String(v)]),
              ),
          ).toString()}`
        : url;

    return fetch(fullUrl, { headers: buildHeaders() }).then(handleResponse<T>);
}

/** POST (JSON body) */
export function apiPost<T = any>(url: string, body?: unknown): Promise<T> {
    return fetch(url, {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>);
}

/** POST (FormData — file uploads etc.) */
export function apiPostForm<T = any>(url: string, formData: FormData): Promise<T> {
    // Do NOT set Content-Type — browser sets it with boundary automatically
    return fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: formData,
    }).then(handleResponse<T>);
}

/** PUT (JSON body) */
export function apiPut<T = any>(url: string, body?: unknown): Promise<T> {
    return fetch(url, {
        method: 'PUT',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>);
}

/** DELETE */
export function apiDelete<T = any>(url: string, body?: unknown): Promise<T> {
    return fetch(url, {
        method: 'DELETE',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>);
}
