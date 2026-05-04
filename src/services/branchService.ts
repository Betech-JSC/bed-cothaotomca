import { ApiKey, getApi, ApiResponse } from './apiService';

export interface Branch {
  id: number;
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
    const response = await getApi<Branch>('branches', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}
