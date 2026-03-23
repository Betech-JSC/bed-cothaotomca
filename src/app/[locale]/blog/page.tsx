import { getBlogCategories, getBlogs } from "@/services/blogService";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import BlogListPage from "@/components/Blog/BlogListPage";

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
  const activeCategoryId = category_id || categoriesData.data[0]?.id?.toString();

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
      categories={categoriesData.data}
      featuredBlogs={featuredBlogsData.data}
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
