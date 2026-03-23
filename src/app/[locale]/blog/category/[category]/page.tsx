import { getBlogCategories, getBlogs } from "@/services/blogService";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import BlogListPage from "@/components/Blog/BlogListPage";
import { notFound } from "next/navigation";
import { slugify, getTranslation } from "@/lib/format";
import { redirect } from "@/i18n/routing";

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, category: categorySlug } = await params;
  const { page = "1" } = await searchParams;

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

  const [bannerData, featuredBlogsData, allBlogsData] = await Promise.all([
    getApi<HeroBanner>('banners', { params: { position: 'banner_news', lang: locale } }).catch(() => ({ data: [] })),
    getBlogs({ is_featured: true, per_page: 5, lang: locale }).catch(() => ({ data: [] })),
    getBlogs({ page: Number(page), per_page: 9, lang: locale, blog_category_id: activeCategoryId }).catch(() => ({ data: [], current_page: 1, last_page: 1, total: 0 })),
  ]);

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
      categories={categories}
      featuredBlogs={featuredBlogsData.data}
      allBlogs={allBlogsData.data}
      pagination={{
        currentPage: allBlogsData.current_page || 1,
        lastPage: allBlogsData.last_page || 1,
        total: allBlogsData.total || 0,
      }}
      currentCategoryId={activeCategoryId}
      currentCategorySlug={categorySlug}
    />
  );
}
