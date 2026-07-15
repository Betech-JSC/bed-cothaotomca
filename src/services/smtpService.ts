import { getSingleApi } from './apiService';

export interface SmtpSettings {
  id: number;
  host: string;
  port: number;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
  encryption: 'ssl' | 'tls' | 'none';
  mail_to?: string; // Additional field for destination email
  company_email?: string; // Another field for company email
  [key: string]: any;
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const response = await getSingleApi<SmtpSettings>('smtp-settings', { revalidate: 0 });
  return response.data;
}
