import { getApi, ApiResponse } from './apiService';
import type { Banner } from '@/types/banner';

export * from '@/types/banner';

export interface GetBannersParams {
  position?: string;
  lang?: string;
  revalidate?: number;
}

export const getBanners = async (params: GetBannersParams = {}): Promise<ApiResponse<Banner>> => {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.position) queryParams.position = params.position;
  if (params.lang) queryParams.lang = params.lang;

  return getApi<Banner>('banners', {
    params: queryParams,
    revalidate: params.revalidate ?? 60,
  });
};

export const getPopupHomeBanner = async (lang?: string): Promise<Banner | null> => {
  try {
    const res = await getBanners({ position: 'popup_home', lang, revalidate: 60 });
    if (res.data && res.data.length > 0) {
      // Find active banner (status === 1 or status === true or status undefined)
      const active = res.data.find(b => b.status === 1 || b.status === true || (b.status as any) === undefined);
      return active || res.data[0];
    }
    return null;
  } catch (error) {
    console.warn('Failed to load popup_home banner:', error);
    return null;
  }
};
