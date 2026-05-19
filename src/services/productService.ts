import { getApi, getSingleApi } from './apiService';
import { slugify, getTranslation } from '@/lib/format';

export interface Translation {
  id: number;
  locale: string;
  name: string;
  description: string;
  product_id: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface Ingredient {
  id: number;
  slug?: string;
  name: string;
  image: string;
}

export interface Product {
  id: number;
  slug?: string;
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
  variant_type?: string;
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
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
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

// Enhanced lookup: try exact slug first, then fallback to scanning products for variants like "slug-2", "slug-3".
export const getProductBySlugWithFallback = async (slug: string, options: { revalidate?: number; lang?: string } = {}): Promise<Product | null> => {
  try {
    const product = await getProductBySlug(slug, options);
    if (product) return product;

    // Fallback: fetch a larger list and find a close match (e.g. slug-2, slug-3)
    const { lang } = options;
    const params: any = { per_page: 500 };
    if (lang) params.lang = lang;
    const listRes = await getApi<Product>('products', { params });
    const products = listRes.data || [];

    // escape slug for regex
    const esc = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^${esc(slug)}(?:-\\d+)?$`);

    const match = products.find(p => {
      // 1. Check primary slug
      if (regex.test(p.slug)) return true;

      // 2. Check localized slug (slugify(translated name))
      if (lang) {
        const translation = getTranslation(p.translations, lang);
        const translatedName = (translation as any)?.name || p.name;
        if (slugify(translatedName) === slug) return true;
      }
      return false;
    });

    if (match) {
      console.warn(`Fallback match for slug ${slug} -> ${match.slug}`);
      return match;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching product (fallback) with slug ${slug}:`, error);
    return null;
  }
};
