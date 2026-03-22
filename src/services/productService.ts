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
    translations: any[];
  };
  created_at: string;
  variants?: any[];
}

export const getProducts = async (params: { page?: number; per_page?: number; lang?: string } = {}) => {
  return getApi<Product>('products', { params });
};
