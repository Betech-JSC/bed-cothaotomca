import { postApi } from './apiService';

export interface ContactData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface ContactResponse {
  message: string;
  status: string | number;
  data?: any;
}

export async function submitContact(data: ContactData): Promise<ContactResponse> {
  try {
    return await postApi<ContactResponse>('contacts', data);
  } catch (error: any) {
    console.error('Error submitting contact form:', error);
    throw error;
  }
}
