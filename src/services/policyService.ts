import { getApi } from './apiService';

export interface PolicyTranslation {
  id: number;
  title: string;
  content: string;
  locale: string;
  policy_id: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_robots?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
}

export interface Policy {
  id: number;
  title: string;
  content: string;
  slug: string;
  image: string | null;
  translations: PolicyTranslation[];
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_robots?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
}

export const getPolicies = async (params: { lang?: string } = {}) => {
  return getApi<Policy>('policies', { params });
};
