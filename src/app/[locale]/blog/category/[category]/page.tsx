import { getBlogCategories, getBlogs, Blog } from "@/services/blogService";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import BlogListPage from "@/components/Blog/BlogListPage";
import { notFound } from "next/navigation";
import { slugify, getTranslation, formatImageUrl, cleanBlogSlugSegment, filterAndLocalizeBlogs } from "@/lib/format";
import { redirect } from "@/i18n/routing";
import { Metadata } from "next";
import AlternateLinksUpdater from "@/components/SEO/AlternateLinksUpdater";

export const revalidate = 60

const BLOG_CAT_VI_TO_EN: Record<string, string> = {
  "hai-san-tuoi-song": "fresh-seafood",
  "bi-quyet": "secrets",
  "meo-hay": "useful-tips",
  "am-thuc": "cuisine",
  "tin-tuc": "news",
};

const BLOG_CAT_EN_TO_VI: Record<string, string> = Object.entries(BLOG_CAT_VI_TO_EN).reduce(
  (acc, [vi, en]) => {
    acc[en] = vi;
    return acc;
  },
  {} as Record<string, string>
);

function resolveBlogCategorySlugs(matched: any, rawCategorySlug: string, locale: string) {
  const isEn = locale === 'en';
  const cleanedSlug = cleanBlogSlugSegment(rawCategorySlug) || (isEn ? 'news' : 'tin-tuc');
  const viTrans = getTranslation(matched?.translations, 'vi') as any;
  const enTrans = getTranslation(matched?.translations, 'en') as any;
  const curTrans = getTranslation(matched?.translations, locale) as any;

  const fallbackName = (cleanedSlug === 'blog' ? 'news' : cleanedSlug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const categoryName = matched
    ? (curTrans?.title || matched.title || fallbackName)
    : fallbackName;

  const rawViCatSlug = matched
    ? (matched.slug_vi ||
        matched.original_slug ||
        viTrans?.slug ||
        (!isEn ? matched.slug : '') ||
        slugify(viTrans?.title || (!isEn ? matched.title : '') || '') ||
        BLOG_CAT_EN_TO_VI[cleanedSlug] ||
        cleanedSlug)
    : (BLOG_CAT_EN_TO_VI[cleanedSlug] || (cleanedSlug === 'blog' || cleanedSlug === 'news' ? 'tin-tuc' : cleanedSlug));
  const viCatSlug = cleanBlogSlugSegment(rawViCatSlug) || 'tin-tuc';

  const rawEnCatSlug = matched
    ? (matched.slug_en ||
        enTrans?.slug ||
        slugify(enTrans?.title || (isEn ? matched.title : '') || '') ||
        BLOG_CAT_VI_TO_EN[viCatSlug] ||
        (isEn ? matched.slug : '') ||
        cleanedSlug)
    : (BLOG_CAT_VI_TO_EN[viCatSlug] || cleanedSlug || 'news');
  const cleanedEnCat = cleanBlogSlugSegment(rawEnCatSlug) || 'news';
  const enCatSlug = cleanedEnCat === 'blog' ? 'news' : cleanedEnCat;

  return { categoryName, viCatSlug, enCatSlug };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>
}): Promise<Metadata> {
  const { locale, category: categorySlug } = await params
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')

  let matched: any = undefined
  try {
    const categoriesRes = await getBlogCategories({ lang: locale })
    const cleanedTarget = cleanBlogSlugSegment(categorySlug)
    matched = (categoriesRes.data || []).find((cat: any) => {
      const t = getTranslation(cat.translations, locale) as any
      const s = cat.slug || slugify(t?.title || cat.title || '')
      return (
        s === categorySlug ||
        s === cleanedTarget ||
        cat.slug === categorySlug ||
        cat.translations?.some((tr: any) => tr?.slug === categorySlug || slugify(tr?.title || '') === cleanedTarget)
      )
    })
  } catch {}

  const { categoryName, viCatSlug, enCatSlug } = resolveBlogCategorySlugs(matched, categorySlug, locale)

  const isEn = locale === 'en'
  const titleSuffix = isEn ? 'Blog & News | Co Thao Tom Ca' : 'Tin tức | Cô Thảo Tôm Cá'
  const descSuffix = isEn
    ? `Articles about ${categoryName} — Co Thao Tom Ca shares tips, insights and recipes.`
    : `Tin tức về ${categoryName} — Cô Thảo Tôm Cá chia sẻ kiến thức, mẹo hay và thông tin hữu ích.`

  const viUrl = `${baseUrl}/tin-tuc/${viCatSlug}`
  const enUrl = `${baseUrl}/en/blog/${enCatSlug}`
  const canonicalUrl = isEn ? enUrl : viUrl

  return {
    title: `${categoryName} | ${titleSuffix}`,
    description: descSuffix,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: viUrl,
        en: enUrl,
        'x-default': viUrl,
      },
    },
    openGraph: {
      title: `${categoryName} | ${titleSuffix}`,
      description: descSuffix,
      url: canonicalUrl,
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
      const { viCatSlug, enCatSlug } = resolveBlogCategorySlugs(currentCategory, categorySlug, locale);
      const correctSlug = locale === 'en' ? enCatSlug : viCatSlug;
      
      // Use localized redirect with guard condition to prevent infinite redirect loops
      if (correctSlug && correctSlug.trim() !== categorySlug) {
        redirect({
          href: {
            pathname: '/blog/category/[category]',
            params: { category: correctSlug.trim() },
          },
          locale: locale as any,
        });
      }
    }
  }

  if (!currentCategory) {
    notFound();
  }

  const { viCatSlug, enCatSlug } = resolveBlogCategorySlugs(currentCategory, categorySlug, locale);
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
    featuredBlogs = filterAndLocalizeBlogs(featuredRes.data || [], locale);
    totalBlogs = Number(gridRes.total ?? featuredRes.total ?? 0);

    const featuredIds = new Set(featuredBlogs.map(b => b.id));
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
    <>
      <AlternateLinksUpdater
        links={{
          vi: {
            pathname: "/blog/category/[category]",
            params: { category: viCatSlug },
          },
          en: {
            pathname: "/blog/category/[category]",
            params: { category: enCatSlug },
          },
        }}
      />
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
        currentCategorySlug={locale === 'en' ? enCatSlug : viCatSlug}
      />
    </>
  );
}
