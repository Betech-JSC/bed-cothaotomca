import { getApi } from './apiService';

export interface CustomVariable {
  key: string;
  value: string;
  description: string;
}

export interface CustomVariablesResponse {
  data: CustomVariable[];
  map: Record<string, string>;
}

/**
 * Fetch public custom variables as key-value pairs.
 * Returns both array and map format for easy access.
 */
export async function getCustomVariables(): Promise<CustomVariablesResponse> {
  try {
    const response = await getApi<any>('custom-variables', { revalidate: 3600 });
    return {
      data: response.data || [],
      map: (response as any).map || {},
    };
  } catch {
    return { data: [], map: {} };
  }
}

/**
 * Helper: get a single variable by key with optional fallback
 */
export function getVariable(
  map: Record<string, string>,
  key: string,
  fallback: string = ''
): string {
  return map[key] || fallback;
}
