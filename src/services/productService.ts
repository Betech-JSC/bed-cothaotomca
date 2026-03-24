import { getApi } from './apiService';

export interface Translation {
  id: number;
  locale: string;
  name: string;
  description: string;
  product_id: number;
}

export interface Ingredient {
  id: number;
  name: string;
  image: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  is_best_seller: boolean;
  ingredients: Ingredient[];
  translations: Translation[];
  category?: {
    id: number;
    title: string;
    slug?: string;
    translations: any[];
  };
  created_at: string;
  variants?: any[];
  gallery?: string[];
  images?: {
    id: number;
    product_id?: number;
    image: string;
    sort_order?: number;
  }[];
  sections?: {
    id: number;
    title: string;
    content: string;
  }[];
  related_products?: Product[];
}

export const getProducts = async (params: { page?: number; per_page?: number; lang?: string } = {}) => {
  return getApi<Product>('products', { params });
};

export const getProductBySlug = async (slug: string, options: { revalidate?: number } = {}): Promise<Product | null> => {
  try {
    const response = await getApi<Product>(`products/slug/${slug}`, options);
    // for detail API, sometimes the response might be the object directly or wrapped in data
    // based on getApi implementation, it returns the json response directly
    // but getApi assumes the response is ApiResponse<T> where data is T[]
    // let's adjust for single object response
    return (response as any).data || response;
  } catch (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }
};
