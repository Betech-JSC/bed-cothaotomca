const BASE_URL = 'https://staging-cothaotomca.betech-digital.com/api/v1';

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
export async function getApi<T>(key: ApiKey, options: { params?: Record<string, string | number>, revalidate?: number } = {}): Promise<ApiResponse<T>> {
  const { params, revalidate = 3600 } = options;
  
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
