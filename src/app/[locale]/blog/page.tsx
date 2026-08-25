import { getBlogCategories, getBlogs, Blog } from "@/services/blogService";
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
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const activeCategoryId = category_id;

  const categoriesData = await getBlogCategories({ lang: locale }).catch(() => ({ data: [] }));

  let featuredBlogs: Blog[] = [];
  let gridBlogs: Blog[] = [];
  let totalBlogs = 0;
  let bannerData: any;

  if (currentPage === 1) {
    const [bannerRes, featuredRes, gridRes] = await Promise.all([
      getApi<HeroBanner>('banners', { params: { position: 'banner_news', lang: locale } }).catch(() => ({ data: [] })),
      getBlogs({ per_page: 5, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [], total: 0 })),
      getBlogs({ offset: 5, per_page: 9, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [], total: 0 })),
    ]);

    bannerData = bannerRes;
    featuredBlogs = featuredRes.data || [];
    totalBlogs = Number(gridRes.total ?? featuredRes.total ?? 0);

    const featuredIds = new Set(featuredBlogs.map((b: Blog) => b.id));
    gridBlogs = (gridRes.data || []).filter((b: Blog) => !featuredIds.has(b.id));
  } else {
    const offset = 14 + (currentPage - 2) * 12;
    const [bannerRes, gridRes] = await Promise.all([
      getApi<HeroBanner>('banners', { params: { position: 'banner_news', lang: locale } }).catch(() => ({ data: [] })),
      getBlogs({ offset, per_page: 12, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [], total: 0 })),
    ]);

    bannerData = bannerRes;
    featuredBlogs = [];
    totalBlogs = Number(gridRes.total ?? 0);
    gridBlogs = gridRes.data || [];
  }

  const lastPage = totalBlogs <= 14 ? 1 : 1 + Math.ceil((totalBlogs - 14) / 12);

  const bannerItem = bannerData?.data?.[0];
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
      allBlogs={gridBlogs}
      pagination={{
        currentPage,
        lastPage,
        total: totalBlogs,
      }}
      currentCategoryId={activeCategoryId}
    />
  );
}
