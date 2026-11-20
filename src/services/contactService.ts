import { getApiBaseUrl, postApi } from './apiService';

export interface ContactData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface AddressCallbackItem {
  product_id?: number;
  product_code?: string;
  product_name: string;
  quantity: number;
  price?: number;
}

export interface AddressCallbackRequestPayload {
  name: string;
  phone: string;
  email?: string;
  is_callback_request: true;
  type: 'address_callback';
  address: string;
  ward?: string;
  suggested_ward?: string;
  verification_status?: string;
  items?: AddressCallbackItem[];
}

export interface ContactResponse {
  message: string;
  status?: string | number;
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

export async function submitAddressCallbackRequest(
  payload: AddressCallbackRequestPayload
): Promise<ContactResponse> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (typeof json?.message === 'string' && json.message) ||
        'Không thể gửi yêu cầu gọi lại lúc này. Vui lòng liên hệ Hotline.'
    );
  }

  return json as ContactResponse;
}
