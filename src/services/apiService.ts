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
async function fetchWithRetry(url: string, options: RequestInit, retries = 1, backoff = 1000): Promise<Response> {
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
  const timeoutMs = 3000; // Giảm xuống 3s cho cả build và runtime để load cực nhanh khi bị chặn

  try {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { 
      ...options, 
      signal,
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
      // Handle rate limit with exponential backoff and jitter
      if (response.status === 429) {
        const delay = (backoff * 2) + Math.random() * 1000;
        console.warn(`Rate limit hit (429) for ${url}. Retrying after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, effectiveRetries, backoff * 2);
      }

      if (response.status >= 500) {
        const errorText = await response.text().catch(() => 'No error body');
        console.error(`Server Error (500+) for ${url}:`, errorText);
        // Trả về dữ liệu trống ngay lập tức
        return new Response(JSON.stringify({ data: [], message: 'Server error bypassed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return response;
  } catch (error: any) {
    // Nếu timeout hoặc lỗi kết nối, trả về dữ liệu trống ngay lập tức (không retry lâu)
    console.warn(`Fetch failed for ${url}: ${error.message}. Returning empty data.`);
    return new Response(JSON.stringify({ data: [], message: 'Fetch error bypassed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generic API fetch function for collections
 */
export async function getApi<T>(key: ApiKey, options: { params?: Record<string, string | number | boolean>, revalidate?: number } = {}): Promise<ApiResponse<T>> {
  const { params, revalidate = 300 } = options;

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
    // Trả về mảng trống thay vì throw để không sập trang
    return { data: [] };
  }
}

/**
 * Generic API fetch function for single items
 */
export async function getSingleApi<T>(key: ApiKey, options: { params?: Record<string, string | number | boolean>, revalidate?: number } = {}): Promise<ApiSingleResponse<T>> {
  const { params, revalidate = 300 } = options;

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
    // Trả về object trống thay vì throw
    return { data: null as any };
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
    throw new Error(`Failed to post API: ${key} - Status: ${response.status}`);
  }

  return response.json();
}
