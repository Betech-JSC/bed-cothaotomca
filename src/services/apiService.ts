const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type ApiKey = 'hero-banners' | 'products' | 'categories' | 'banners' | string;

export interface ApiResponse<T> {
  data: T[];
  [key: string]: any; // For paginated responses like products
}

export interface ApiSingleResponse<T> {
  data: T;
  [key: string]: any;
}

/**
 * Generic API fetch function for collections
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

  try {
    const response = await fetch(url, {
      next: { revalidate }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API: ${key}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Generic API fetch function for single items
 * @param key The endpoint key (e.g. 'products/slug/abc')
 * @param options Additional fetch options including searchParams
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
    const response = await fetch(url, {
      next: { revalidate }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API: ${key}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
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
