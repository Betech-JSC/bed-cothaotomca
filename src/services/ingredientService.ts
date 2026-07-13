import { getApi } from './apiService';

export interface IngredientTranslation {
  id: number;
  locale: string;
  name: string;
  ingredient_id: number;
}

export interface Ingredient {
  id: number;
  name: string;
  image: string | null;
  translations: IngredientTranslation[];
}

export const getIngredients = async (lang?: string) => {
  return getApi<Ingredient>('ingredients', { params: lang ? { lang } : {} });
};
