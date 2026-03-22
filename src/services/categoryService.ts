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
  image: string;
  translations: CategoryTranslation[];
}

export const getCategories = async () => {
  return getApi<Category>('categories');
};
