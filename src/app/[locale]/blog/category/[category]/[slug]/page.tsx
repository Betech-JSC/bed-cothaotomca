import Breadcrumb from "@/components/Common/Breadcrumb"
import SocialShare from "@/components/SocialShare";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getBlogDetail, getBlogs, Blog, BlogTranslation, BlogCategoryTranslation } from "@/services/blogService";
import { getTranslation, formatDate } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function BlogDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { locale, category, slug } = await params
  const t = await getTranslations({ locale })

  let blogResponse = await getBlogDetail(slug, { lang: locale }).catch(() => null);

  // Fallback for English blogs where the slug might be localized in the list but the API only accepts the original (VI) slug for the detail view
  if (!blogResponse?.data && locale === 'en') {
    const listResponse = await getBlogs({ lang: 'en', per_page: 100 }).catch(() => null);
    const matchedBlog = listResponse?.data?.find((b: any) => b.slug === slug);

    if (matchedBlog) {
      const viListResponse = await getBlogs({ lang: 'vi', per_page: 100 }).catch(() => null);
      const viMatchedBlog = viListResponse?.data?.find((b: any) => b.id === matchedBlog.id);

      if (viMatchedBlog) {
        blogResponse = await getBlogDetail(viMatchedBlog.slug, { lang: locale }).catch(() => null);
      }
    }
  }

  const blog = (blogResponse?.data as any) as Blog;

  if (!blog) {
    notFound();
  }

  const translation = getTranslation<BlogTranslation>(blog.translations, locale);
  const catTranslation = getTranslation<BlogCategoryTranslation>(blog.category?.translations, locale);

  const blogTitle = translation?.title || blog.title || "";
  const blogDescription = translation?.description || blog.description || "";
  const blogContent = translation?.content || blog.content || "";
  const categoryName = catTranslation?.title || blog.category?.title || t('blog.category');

  const breadcrumbs = [
    {
      title: t('breadcrumb.blog'),
      url: { pathname: '/blog' },
    },
    {
      title: categoryName,
      url: { pathname: '/blog/category/[category]', params: { category: blog.category?.slug || category } },
    },
    {
      title: blogTitle,
    },
  ] as const

  return (
    <main>
      <section className="min-h-screen w-full md:py-16 py-12 xl:py-20">
        <div className="container md:space-y-12 space-y-8 xl:space-y-16">
          <div className="flex flex-col items-center md:gap-6 gap-4 xl:gap-8 w-full max-w-[880px] mx-auto">
            <div className="flex flex-col gap-3 w-full">
              <Breadcrumb breadcrumbs={breadcrumbs} classNameNav="md:mx-auto" />
              <h1 className="display-3 text-primary text-center">
                {blogTitle}
              </h1>

              <div className="flex justify-center items-center gap-3 w-full">
                <span className="label-2 text-[#941417] font-semibold ">
                  {categoryName}
                </span>
                <div className="text-[#941417]">|</div>
                <span className="body-2 text-[#941417]">
                  {formatDate(blog.created_at, locale)}
                </span>
              </div>
            </div>
            {blogDescription && (
              <div className="w-full text-center body-1 text-black">
                {blogDescription}
              </div>
            )}
          </div>

          <div className="rounded-3xl relative aspect-w-2 aspect-h-1 overflow-hidden">
            <Image
              src={blog.thumbnail || "/cover.jpg"}
              alt={blogTitle}
              className="w-full h-full object-cover"
              fill
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-8 w-full max-w-[880px] mx-auto md:space-y-4 space-y-3 xl:space-y-6">
            <div className="prose prose-blog max-w-full w-full" dangerouslySetInnerHTML={{ __html: blogContent }}></div>
            <div className="w-full border-t border-gray-300 pt-3">
              <SocialShare />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
