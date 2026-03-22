import { getApi } from './apiService';

export interface Translation {
  id: number;
  title: string;
  status: string;
  location: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  hero_banner_id: number;
  locale: string;
}

export interface HeroBanner {
  id: number;
  title: string;
  status: string;
  location: string;
  description: string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
  translations: Translation[];
}

export const getHeroBanners = async () => {
  return getApi<HeroBanner>('hero-banners');
};
