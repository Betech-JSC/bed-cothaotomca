import { getBlogCategories, getBlogs } from "@/services/blogService";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import BlogListPage from "@/components/Blog/BlogListPage";
import { Metadata } from 'next';
import { getMetaPage } from '@/services/seoService';

export const revalidate = 60; // ISR: revalidate mỗi 60 giây

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getMetaPage('blog', locale).catch(() => null);
  if (!meta) return {};

  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');
  const canonicalUrl = meta.canonical_url || `${baseUrl}/${locale}/blog`;

  let robots: any = undefined;
  if (meta.noindex || meta.nofollow) {
    robots = {
      index: !meta.noindex,
      follow: !meta.nofollow,
    };
  }

  return {
    title: meta.seo_title || undefined,
    description: meta.seo_description || undefined,
    keywords: meta.seo_keywords || undefined,
    robots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `${baseUrl}/vi/blog`,
        en: `${baseUrl}/en/blog`,
      },
    },
    openGraph: {
      title: meta.seo_title || undefined,
      description: meta.seo_description || undefined,
      url: canonicalUrl,
      images: meta.og_image ? [meta.og_image] : undefined,
      type: 'website',
    },
  };
}

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; category_id?: string }>;
}) {
  const { locale } = await params;
  const { page = "1", category_id } = await searchParams;

  const categoriesData = await getBlogCategories({ lang: locale }).catch(() => ({ data: [] }));
  const activeCategoryId = category_id;

  const [bannerData, featuredBlogsData, allBlogsData] = await Promise.all([
    getApi<HeroBanner>('banners', { params: { position: 'banner_news', lang: locale } }).catch(() => ({ data: [] })),
    getBlogs({ is_featured: true, per_page: 5, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [] })),
    getBlogs({ page: Number(page), per_page: 12, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [], current_page: 1, last_page: 1, total: 0 })),
  ]);

  let featuredBlogs = featuredBlogsData.data || [];
  if (featuredBlogs.length === 0 && allBlogsData.data && allBlogsData.data.length > 0) {
    featuredBlogs = allBlogsData.data.slice(0, 5);
  }

  const bannerItem = bannerData.data[0];
  const banner = {
    image: {
      url: bannerItem?.image || "/images/demo/banner-blog.jpg",
      alt: bannerItem?.title || "banner blog",
    },
  };

  return (
    <BlogListPage
      locale={locale}
      banner={banner}
      categories={categoriesData.data}
      featuredBlogs={featuredBlogs}
      allBlogs={allBlogsData.data}
      pagination={{
        currentPage: allBlogsData.current_page || 1,
        lastPage: allBlogsData.last_page || 1,
        total: allBlogsData.total || 0,
      }}
      currentCategoryId={activeCategoryId}
    />
  );
}
