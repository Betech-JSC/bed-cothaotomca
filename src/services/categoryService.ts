import { getApi } from './apiService';

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
  description?: string;
  image: string;
  is_featured: number;
  sort_order: number;
  parent_id: number | null;
  products_count?: number;
  children?: Category[];
  translations: CategoryTranslation[];
}

export const getCategories = async () => {
  return getApi<Category>('categories');
};

export const getCategoryTree = async () => {
  return getApi<Category>('categories/tree');
};
