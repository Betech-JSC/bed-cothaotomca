import Breadcrumb from "@/components/Common/Breadcrumb"
import SocialShare from "@/components/SocialShare";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getBlogDetail, getBlogs, Blog, BlogTranslation, BlogCategoryTranslation } from "@/services/blogService";
import { getTranslation, formatDate, formatRichTextContent, slugify } from "@/lib/format";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";
import SectionRelatedPosts from "@/components/Blog/SectionRelatedPosts";
import BlogTableOfContents from "@/components/Blog/BlogTableOfContents";

export const revalidate = 60; // ISR: revalidate mỗi 60 giây

async function fetchBlog(slug: string, locale: string) {
  // 1. Try fetching directly with current locale
  let blogResponse = await getBlogDetail(slug, { lang: locale }).catch(() => null);

  // 2. If not found and locale is not 'vi', try with lang='vi' (using the same slug)
  if (!blogResponse?.data && locale !== 'vi') {
    const viResponse = await getBlogDetail(slug, { lang: 'vi' }).catch(() => null);
    if (viResponse?.data) {
      const reFetched = await getBlogDetail(viResponse.data.slug, { lang: locale }).catch(() => null);
      blogResponse = reFetched?.data ? reFetched : viResponse;
    }
  }

  // 3. Fallback: search in list for matched slug/id
  if (!blogResponse?.data && locale !== 'vi') {
    const listResponse = await getBlogs({ lang: locale, per_page: 100 }).catch(() => null);
    const matchedBlog = listResponse?.data?.find((b: any) => b.slug === slug);

    if (matchedBlog) {
      const viListResponse = await getBlogs({ lang: 'vi', per_page: 100 }).catch(() => null);
      const viMatchedBlog = viListResponse?.data?.find((b: any) => b.id === matchedBlog.id);

      if (viMatchedBlog) {
        blogResponse = await getBlogDetail(viMatchedBlog.slug, { lang: locale }).catch(() => null);
      }
    }
  }

  return (blogResponse?.data as any) as Blog;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}): Promise<Metadata> {
  const { locale, category, slug } = await params
  const blog = await fetchBlog(slug, locale);
  if (!blog) {
    return {};
  }

  const translation = getTranslation<BlogTranslation>(blog.translations, locale);
  const isEn = locale === 'en';
  const blogTitle = (isEn ? translation?.title : null) || blog.title || translation?.title || "";
  const blogDescription = (isEn ? translation?.description : null) || blog.description || translation?.description || "";

  // Ưu tiên SEO từ bản dịch -> Tên theo ngôn ngữ -> Fallback root
  const seoTitle = translation?.seo_title || (isEn ? (blogTitle || blog.seo_title || blog.meta_title) : (blog.seo_title || blog.meta_title || blogTitle));
  const seoDescription = translation?.seo_description || (isEn ? (blogDescription || blog.seo_description || blog.meta_description) : (blog.seo_description || blog.meta_description || blogDescription));
  const seoKeywords = translation?.seo_keywords || blog.seo_keywords || blog.meta_keywords || "";

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const customCanonical = translation?.canonical_url || blog.canonical_url;
  const canonicalUrl = customCanonical || `${baseUrl}/${locale}/blog/category/${category}/${slug}`;
  const customOgImage = translation?.og_image || blog.og_image;
  const blogImage = customOgImage || blog.thumbnail || "/cover.jpg";
  const customRobots = translation?.meta_robots || blog.meta_robots || undefined;

  const metadata = {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    robots: customRobots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `${baseUrl}/vi/blog/category/${category}/${slug}`,
        en: `${baseUrl}/en/blog/category/${category}/${slug}`,
      },
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      images: [blogImage],
      type: 'article' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: seoTitle,
      description: seoDescription,
      images: [blogImage],
    }
  };

  return metadata;
}


export default async function BlogDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { locale, category, slug } = await params
  
  // Parallelize translations and blog data fetching
  const [t, blog] = await Promise.all([
    getTranslations({ locale }),
    fetchBlog(slug, locale)
  ]);

  if (!blog) {
    notFound();
  }

  const translation = getTranslation<BlogTranslation>(blog.translations, locale);
  const catTranslation = getTranslation<BlogCategoryTranslation>(blog.category?.translations, locale);

  const blogTitle = translation?.title || blog.title || "";
  const blogDescription = translation?.description || blog.description || "";
  const blogContent = formatRichTextContent(translation?.content || blog.content || "");
  const categoryName = catTranslation?.title || blog.category?.title || t('blog.category');

  const breadcrumbs = [
    {
      title: t('breadcrumb.blog'),
      url: { pathname: '/blog' },
    },
    {
      title: blogTitle,
    },
  ] as const

  // Fetch related blogs from the same category or overall blogs
  let relatedBlogsRes = await getBlogs({
    blog_category_id: blog.category?.id,
    per_page: 6,
    lang: locale
  }).catch(() => null);

  let relatedBlogsData = (relatedBlogsRes?.data || []).filter((b: Blog) => b.id !== blog.id);

  // If not enough posts in same category, fetch recent blogs as fallback
  if (relatedBlogsData.length < 4) {
    const allBlogsRes = await getBlogs({ per_page: 6, lang: locale }).catch(() => null);
    if (allBlogsRes?.data) {
      const extraBlogs = allBlogsRes.data.filter((b: Blog) => b.id !== blog.id && !relatedBlogsData.some((rb: Blog) => rb.id === b.id));
      relatedBlogsData = [...relatedBlogsData, ...extraBlogs];
    }
  }

  const relatedPostsDisplay = relatedBlogsData.slice(0, 4).map((item: Blog) => {
    const itemTranslation = getTranslation<BlogTranslation>(item.translations, locale);
    const itemCatTranslation = getTranslation<BlogCategoryTranslation>(item.category?.translations, locale);
    const title = itemTranslation?.title || item.title;
    const catName = itemCatTranslation?.title || item.category?.title || categoryName;

    return {
      image: {
        url: item.thumbnail || "/cover.jpg",
        alt: title,
      },
      title: title,
      slug: item.slug,
      category: {
        title: catName,
        slug: item.category?.slug || slugify(catName),
      },
      created_at: item.created_at,
    };
  });

  return (
    <main>
      <JsonLd
        type="Article"
        data={blog}
        url={`${(process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')}/${locale}/blog/category/${category}/${slug}`}
      />
      <section className="min-h-screen w-full md:py-12 py-8 xl:py-16">
        <div className="container md:space-y-8 space-y-6 xl:space-y-8">
          <div className="flex flex-col items-center md:gap-4 gap-4 xl:gap-6 w-full max-w-[880px] mx-auto">
            <div className="flex flex-col gap-3 w-full">
              <Breadcrumb breadcrumbs={breadcrumbs} classNameNav="md:mx-auto" />
              <h1 className="display-3 max-md:text-[28px] text-primary text-center">
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

          <div className="flex flex-col items-center w-full max-w-[880px] mx-auto md:space-y-4 space-y-6 xl:space-y-6">
            <div className="prose-content max-w-full w-full" dangerouslySetInnerHTML={{ __html: blogContent }}></div>
            <div className="w-full border-t border-gray-300 pt-3">
              <SocialShare />
            </div>
          </div>
        </div>
      </section>

      <SectionRelatedPosts items={relatedPostsDisplay} />
      <BlogTableOfContents />
    </main>
  )
}

