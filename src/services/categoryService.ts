import { getApi } from './apiService';
import { slugify } from '@/lib/format';

export interface CategoryTranslation {
  id: number;
  title: string;
  locale: string;
  category_id: number;
}

export interface Category {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  image: string | null;
  is_featured: number;
  sort_order: number;
  parent_id: number | null;
  products_count?: number;
  children?: Category[];
  translations: CategoryTranslation[];
}

export interface GetCategoriesParams {
  lang?: string;
  is_featured?: boolean;
}

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop';

/** Chuẩn hóa GET /api/categories */
export function normalizeCategory(cat: Category): Category {
  return {
    ...cat,
    slug: cat.slug || slugify(cat.title),
    description: cat.description ?? null,
    image: cat.image ?? null,
    is_featured: cat.is_featured ?? 0,
    sort_order: cat.sort_order ?? 0,
    parent_id: cat.parent_id ?? null,
    products_count: cat.products_count ?? 0,
    translations: cat.translations ?? [],
    children: undefined,
  };
}

export const getCategories = async (params: GetCategoriesParams = {}) => {
  const apiParams: Record<string, string | number | boolean> = {};
  if (params.lang) apiParams.lang = params.lang;
  if (params.is_featured) apiParams.is_featured = 1;

  const result = await getApi<Category>('categories', { params: apiParams });
  const data = (result.data || [])
    .map(normalizeCategory)
    .sort((a, b) => a.sort_order - b.sort_order);

  return { ...result, data };
};

export const getCategoryTree = async (lang?: string) => {
  const result = await getApi<Category>('categories/tree', {
    params: lang ? { lang } : {},
  });
  return {
    ...result,
    data: (result.data || []).map(normalizeCategory),
  };
};

/** Slug từ BE (vd: menu) hoặc slugify title */
export function getCategorySlug(cat: Category, _locale?: string): string {
  return cat.slug || slugify(cat.title);
}

/** Ảnh category — BE thường null */
export function getCategoryImageUrl(cat: Category): string {
  return cat.image || DEFAULT_CATEGORY_IMAGE;
}
