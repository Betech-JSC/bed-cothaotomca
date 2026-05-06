import { getApi } from './apiService';

export interface BlogCategoryTranslation {
  id: number;
  locale: string;
  title: string;
  description: string;
}

export interface BlogCategory {
  id: number;
  title: string;
  slug: string;
  translations: BlogCategoryTranslation[];
}

export interface BlogTranslation {
  id: number;
  locale: string;
  title: string;
  description: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  thumbnail: string;
  is_featured: boolean;
  category: BlogCategory;
  created_at: string;
  translations: BlogTranslation[];
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export const getBlogCategories = async (params: { lang?: string } = {}) => {
  return getApi<BlogCategory>('blog-categories', { params });
};

export const getBlogs = async (params: { page?: number; per_page?: number; lang?: string; is_featured?: boolean | string | number; blog_category_id?: number | string } = {}) => {
  const apiParams: Record<string, string | number> = {};
  if (params.page) apiParams.page = params.page;
  if (params.per_page) apiParams.per_page = params.per_page;
  if (params.lang) apiParams.lang = params.lang;
  if (params.blog_category_id) apiParams.blog_category_id = params.blog_category_id;
  if (params.is_featured !== undefined) {
    apiParams.is_featured = params.is_featured === true ? 1 : (params.is_featured === false ? 0 : params.is_featured.toString());
  }

  return getApi<Blog>('blogs', { params: apiParams });
};
export const getBlogDetail = async (slug: string, params: { lang?: string } = {}, revalidate?: number) => {
  return getApi<Blog>(`blogs/${slug}`, { params, revalidate });
};
