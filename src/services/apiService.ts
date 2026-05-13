const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://staging-cothaotomca.betech-digital.com/api/v1';

export type ApiKey = 'hero-banners' | 'products' | 'categories' | 'banners' | string;

export interface ApiResponse<T> {
  data: T[];
  [key: string]: any;
}

export interface ApiSingleResponse<T> {
  data: T;
  [key: string]: any;
}

/**
 * Enhanced fetch with retry logic for handling intermittent connection issues
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0 && response.status >= 500) {
      console.warn(`Fetch failed with status ${response.status}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (error: any) {
    if (retries > 0 && (error.name === 'ConnectTimeoutError' || error.name === 'TimeoutError' || error.message.includes('timeout') || error.message.includes('fetch failed'))) {
      console.warn(`Fetch encountered a timeout/error: ${error.message}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Generic API fetch function for collections
 */
export async function getApi<T>(key: ApiKey, options: { params?: Record<string, string | number | boolean>, revalidate?: number } = {}): Promise<ApiResponse<T>> {
  const { params, revalidate = 60 } = options;

  let url = `${BASE_URL}/${key}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      searchParams.append(k, v.toString());
    });
    url += `?${searchParams.toString()}`;
  }

  try {
    const response = await fetchWithRetry(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API: ${key} - Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error in getApi(${key}):`, error);
    throw error;
  }
}

/**
 * Generic API fetch function for single items
 */
export async function getSingleApi<T>(key: ApiKey, options: { params?: Record<string, string | number | boolean>, revalidate?: number } = {}): Promise<ApiSingleResponse<T>> {
  const { params, revalidate = 60 } = options;

  let url = `${BASE_URL}/${key}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      searchParams.append(k, v.toString());
    });
    url += `?${searchParams.toString()}`;
  }

  try {
    const response = await fetchWithRetry(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API: ${key} - Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error in getSingleApi(${key}):`, error);
    throw error;
  }
}

/**
 * Generic API POST function
 */
export async function postApi<T>(key: ApiKey, body: any): Promise<T> {
  const url = `${BASE_URL}/${key}`;

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to post API: ${key}`);
  }

  return response.json();
}

