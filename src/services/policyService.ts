import { getApi } from './apiService';

export interface PolicyTranslation {
  id: number;
  title: string;
  content: string;
  locale: string;
  policy_id: number;
}

export interface Policy {
  id: number;
  title: string;
  content: string;
  slug: string;
  image: string | null;
  translations: PolicyTranslation[];
}

export const getPolicies = async (params: { lang?: string } = {}) => {
  return getApi<Policy>('policies', { params });
};
