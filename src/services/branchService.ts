import { ApiKey, getApi, ApiResponse } from './apiService';

export interface Branch {
  id: number;
  title: string;
  address: string;
  address_link: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBranches(): Promise<Branch[]> {
  try {
    const response = await getApi<Branch>('branches');
    return response.data;
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}
