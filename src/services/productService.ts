import { getApi, getSingleApi } from './apiService';

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
  categories?: {
    id: number;
    title: string;
    slug?: string;
    translations?: any[];
  }[];
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

export const getProductBySlug = async (slug: string, options: { revalidate?: number; lang?: string } = {}): Promise<Product | null> => {
  try {
    const { lang, ...restOptions } = options;
    const params = lang ? { lang } : undefined;
    const response = await getSingleApi<Product>(`products/slug/${slug}`, { ...restOptions, params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }
};
