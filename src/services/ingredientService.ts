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

/** Chuẩn hóa GET /api/ingredients (BE chỉ trả ingredient có SP match) */
export function normalizeIngredient(ing: Ingredient): Ingredient {
  return {
    ...ing,
    image: ing.image ?? null,
    translations: ing.translations ?? [],
  };
}

export const getIngredients = async (lang?: string) => {
  const result = await getApi<Ingredient>('ingredients', {
    params: lang ? { lang } : {},
  });
  const data = (result.data || []).map(normalizeIngredient);
  return { ...result, data };
};
