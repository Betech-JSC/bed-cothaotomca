export interface BannerTranslation {
  id?: number;
  banner_id?: number;
  locale: string;
  title: string;
  description?: string | null;
  button_text?: string | null;
}

export interface Banner {
  id: number;
  title: string;
  description?: string | null;
  button_text?: string | null;
  image: string;
  image_mobile?: string | null;
  link?: string | null;
  position: string;
  sort_order?: number;
  status?: number | boolean;
  created_at?: string;
  updated_at?: string;
  translations?: BannerTranslation[];
}
