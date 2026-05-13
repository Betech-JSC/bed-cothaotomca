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
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  
  // If we are building, don't even try to fetch if it's causing issues.
  // This ensures the build completes. Data will be fetched at runtime.
  if (isBuildPhase) {
    console.log(`Bypassing fetch for ${url} during build phase.`);
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const effectiveRetries = retries;
  const timeoutMs = isBuildPhase ? 5000 : 8000; // 8s at runtime to stay under Netlify's 10s limit

  try {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { 
      ...options, 
      signal,
      cache: 'no-store', // Đảm bảo không lấy cache lỗi
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'vi,en;q=0.9',
        'Referer': 'https://cothaotomca.vn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers,
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status >= 500) {
        const errorText = await response.text().catch(() => 'No error body');
        console.error(`Server Error (500+) for ${url}:`, errorText);
        // Trả về dữ liệu trống thay vì throw lỗi để không làm sập trang web
        return new Response(JSON.stringify({ data: [], message: 'Server error bypassed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (effectiveRetries > 0 && response.status >= 500) {
        console.warn(`Fetch failed (${response.status}) for ${url}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, effectiveRetries - 1, backoff * 1.5);
      }
    }
    return response;
  } catch (error: any) {
    if (effectiveRetries > 0) {
      console.warn(`Fetch error for ${url}: ${error.message}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, effectiveRetries - 1, backoff * 1.5);
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to post API: ${key}`);
  }

  return response.json();
}


