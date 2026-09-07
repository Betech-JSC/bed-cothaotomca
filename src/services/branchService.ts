import { ApiKey, getApi, ApiResponse } from './apiService';

export interface Branch {
  id: number;
  sort_order?: number;
  title: string;
  address: string;
  address_link: string | null;
  phone: string | null;
  is_main: boolean;
  created_at: string;
  updated_at: string;
  image: string;
}

export async function getBranches(lang?: string): Promise<Branch[]> {
  try {
    const params = lang ? { lang } : undefined;
    const response = await getApi<Branch>('branches', { params, revalidate: 60 });
    return [...response.data].sort((a, b) => {
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}
