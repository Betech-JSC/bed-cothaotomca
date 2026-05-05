const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type ApiKey = 'hero-banners' | 'products' | 'categories' | 'banners' | string;

export interface ApiResponse<T> {
  data: T[];
  [key: string]: any; // For paginated responses like products
}

/**
 * Generic API fetch function
 * @param key The endpoint key (e.g. 'hero-banners', 'products')
 * @param options Additional fetch options including searchParams
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

  const response = await fetch(url, {
    next: { revalidate }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${key}`);
  }

  return response.json();
}

/**
 * Generic API POST function
 * @param key The endpoint key (e.g. 'contacts')
 * @param body The request body object
 */
export async function postApi<T>(key: ApiKey, body: any): Promise<T> {
  const url = `${BASE_URL}/${key}`;

  const response = await fetch(url, {
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
