import { getBlogCategories, getBlogs, Blog } from "@/services/blogService";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import BlogListPage from "@/components/Blog/BlogListPage";
import { notFound } from "next/navigation";
import { slugify, getTranslation } from "@/lib/format";
import { redirect } from "@/i18n/routing";
import { Metadata } from "next";

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>
}): Promise<Metadata> {
  const { locale, category: categorySlug } = await params
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')

  let categoryName = categorySlug.replace(/-/g, ' ')
  try {
    const categoriesRes = await getBlogCategories({ lang: locale })
    const matched = (categoriesRes.data || []).find((cat: any) => {
      const t = getTranslation(cat.translations, locale) as any
      const s = cat.slug || slugify(t?.title || cat.title || '')
      return s === categorySlug
    })
    if (matched) {
      const t = getTranslation(matched.translations, locale) as any
      categoryName = t?.title || matched.title || categoryName
    }
  } catch {}

  return {
    title: `${categoryName} | Tin tức | Cô Thảo Tôm Cá`,
    description: `Tin tức về ${categoryName} — Cô Thảo Tôm Cá chia sẻ kiến thức, mẹo hay và thông tin hữu ích.`,
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/category/${categorySlug}`,
      languages: {
        vi: `${baseUrl}/vi/blog/category/${categorySlug}`,
        en: `${baseUrl}/en/blog/category/${categorySlug}`,
      },
    },
    openGraph: {
      title: `${categoryName} | Tin tức | Cô Thảo Tôm Cá`,
      description: `Tin tức về ${categoryName} — Cô Thảo Tôm Cá`,
      type: 'website',
    },
  }
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, category: categorySlug } = await params;
  const { page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  const categoriesData = await getBlogCategories({ lang: locale }).catch(() => ({ data: [] }));
  const categories = categoriesData.data || [];
  
  // Find category using the same logic as BlogListPage
  let currentCategory = categories.find(cat => {
    const translation = getTranslation(cat.translations, locale) as any;
    const derivedSlug = cat.slug || slugify(translation?.title || cat.title || "danh-muc");
    return derivedSlug === categorySlug;
  });

  // If not found by current language slug, search across all translations
  // This handles the case where someone (like LanguageSwitcher) used a slug from another language
  if (!currentCategory) {
    currentCategory = categories.find(cat => {
      // Check if it matches the main category slug (if it hasn't changed)
      if (cat.slug === categorySlug) return true;
      
      // Check all translations for this category
      return cat.translations?.some(t => slugify(t.title) === categorySlug);
    });

    // If found via another language, redirect to the correct localized slug
    if (currentCategory) {
      const translation = getTranslation(currentCategory.translations, locale) as any;
      const correctSlug = currentCategory.slug || slugify(translation?.title || currentCategory.title || "danh-muc");
      
      // Use localized redirect
      redirect({
        pathname: '/blog/category/[category]',
        params: { category: correctSlug }
      } as any);
    }
  }

  if (!currentCategory) {
    notFound();
  }

  const activeCategoryId = currentCategory.id.toString();

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

    const featuredIds = new Set(featuredBlogs.map(b => b.id));
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
      categories={categories}
      featuredBlogs={featuredBlogs}
      allBlogs={gridBlogs}
      pagination={{
        currentPage,
        lastPage,
        total: totalBlogs,
      }}
      currentCategoryId={activeCategoryId}
      currentCategorySlug={categorySlug}
    />
  );
}
