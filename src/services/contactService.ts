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
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to submit contact');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error submitting contact form:', error);
    throw error;
  }
}
