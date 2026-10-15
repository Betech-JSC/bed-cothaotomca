import { getBlogCategories, getBlogs, Blog } from "@/services/blogService";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import BlogListPage from "@/components/Blog/BlogListPage";
import { formatImageUrl, filterAndLocalizeBlogs } from "@/lib/format";
import { Metadata } from 'next';
import { getMetaPage, resolveMetaTitle, resolveMetaDescription, resolveMetaKeywords } from '@/services/seoService';

export const revalidate = 60; // ISR: revalidate mỗi 60 giây

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  const meta = await getMetaPage('blog', locale).catch(() => null);

  const rawBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000'))
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'https://cothaotomca.vn';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');
  const viUrl = `${baseUrl}/tin-tuc`;
  const enUrl = `${baseUrl}/en/blog`;
  const canonicalUrl = isEn ? enUrl : viUrl;

  const defaultTitle = isEn
    ? 'News & Culinary Tips | Co Thao Tom Ca'
    : 'Tin tức & Bí quyết ẩm thực | Cô Thảo Tôm Cá';
  const defaultDescription = isEn
    ? 'Culinary news, cooking recipes, seafood secrets and delicious promotions from Co Thao Tom Ca.'
    : 'Tin tức ẩm thực, cẩm nang nấu ăn, bí quyết chế biến hải sản và khuyến mãi hấp dẫn từ Cô Thảo Tôm Cá.';

  const title = resolveMetaTitle(meta, locale, defaultTitle);
  const description = resolveMetaDescription(meta, locale, defaultDescription);
  const keywords = resolveMetaKeywords(meta, locale);

  let robots: any = undefined;
  if (meta?.noindex || meta?.nofollow) {
    robots = {
      index: !meta.noindex,
      follow: !meta.nofollow,
    };
  }

  const ogImage = (isEn && meta?.og_image_en) || meta?.og_image;

  return {
    title,
    description,
    keywords,
    robots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: viUrl,
        en: enUrl,
        'x-default': viUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: ogImage ? [ogImage] : undefined,
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
    featuredBlogs = filterAndLocalizeBlogs(featuredRes.data || [], locale);
    totalBlogs = Number(gridRes.total ?? featuredRes.total ?? 0);

    const featuredIds = new Set(featuredBlogs.map((b: Blog) => b.id));
    gridBlogs = filterAndLocalizeBlogs(
      (gridRes.data || []).filter((b: Blog) => !featuredIds.has(b.id)),
      locale
    );
  } else {
    const offset = 14 + (currentPage - 2) * 12;
    const [bannerRes, gridRes] = await Promise.all([
      getApi<HeroBanner>('banners', { params: { position: 'banner_news', lang: locale } }).catch(() => ({ data: [] })),
      getBlogs({ offset, per_page: 12, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [], total: 0 })),
    ]);

    bannerData = bannerRes;
    featuredBlogs = [];
    totalBlogs = Number(gridRes.total ?? 0);
    gridBlogs = filterAndLocalizeBlogs(gridRes.data || [], locale);
  }

  const lastPage = totalBlogs <= 14 ? 1 : 1 + Math.ceil((totalBlogs - 14) / 12);

  const bannerItem = bannerData?.data?.[0];
  const banner = {
    image: {
      url: formatImageUrl(bannerItem?.image) || "/images/demo/banner-blog.jpg",
      alt: bannerItem?.title || "banner blog",
    },
    image_mobile: {
      url: formatImageUrl(bannerItem?.image_mobile) || formatImageUrl(bannerItem?.image) || "/images/demo/banner-blog.jpg",
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
