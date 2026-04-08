'use client'

import React, { useMemo } from 'react';
import Banner from "@/components/Banner";
import CardBlog from "@/components/Card/CardBlog";
import CardBlogRow from "@/components/Card/CardBlogRow";
import { Blog, BlogCategory } from "@/services/blogService";
import { HeroBanner } from "@/services/heroBannerService";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { slugify } from "@/lib/format";
import Chevron from "@/components/Icons/Chevron";

interface BlogListPageProps {
  locale: string;
  banner: {
    image: {
      url: string;
      alt: string;
    };
  };
  categories: BlogCategory[];
  featuredBlogs: Blog[];
  allBlogs: Blog[];
  pagination: {
    currentPage: number;
    lastPage: number;
    total: number;
  };
  currentCategoryId?: string;
  currentCategorySlug?: string;
}

export default function BlogListPage({
  locale,
  banner,
  categories,
  featuredBlogs,
  allBlogs,
  pagination,
  currentCategoryId,
  currentCategorySlug,
}: BlogListPageProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const transformBlog = (blog: Blog) => {
    const translation = getTranslation(blog.translations, locale) as any;
    const catTranslation = getTranslation(blog.category?.translations, locale) as any;
    const categoryName = catTranslation?.title || blog.category?.title || "Tin tức";

    return {
      id: blog.id,
      title: translation?.title || blog.title,
      slug: blog.slug,
      category: {
        title: categoryName,
        slug: blog.category?.slug || slugify(categoryName),
      },
      image: {
        url: blog.thumbnail,
        alt: translation?.title || blog.title,
      },
      created_at: blog.created_at,
    };
  };

  const featuredBlogsDisplay = useMemo(() => featuredBlogs.map(transformBlog), [featuredBlogs, locale]);
  const allBlogsDisplay = useMemo(() => allBlogs.map(transformBlog), [allBlogs, locale]);

  const categoriesDisplay = useMemo(() => {
    return categories.map(cat => {
      const translation = getTranslation(cat.translations, locale) as any;
      return {
        id: cat.id,
        name: translation?.title || cat.title || "Danh mục",
        slug: cat.slug || slugify(translation?.title || cat.title || "danh-muc"),
      };
    });
  }, [categories, locale]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    const query = Object.fromEntries(params.entries());

    if (currentCategorySlug) {
      router.push({ pathname: '/blog/category/[category]', params: { category: currentCategorySlug }, query });
    } else {
      router.push({ pathname: '/blog', query });
    }
  };

  const handleCategoryChange = (slug?: string) => {
    if (!slug) {
      router.push({ pathname: '/blog' });
    } else {
      router.push({ pathname: '/blog/category/[category]', params: { category: slug } });
    }
  };

  return (
    <main>
      <Banner banner={banner} />
      <section className="py-8 md:py-14 xl:py-16">
        <div className="container space-y-12 md:space-y-16 xl:space-y-20">
          <div className="space-y-4 md:space-y-8 xl:space-y-8">
            <h1 className="display-2 text-primary text-center">
              {t('blog.title')}
            </h1>

            <div className="w-full overflow-x-auto">
              <div className="flex items-center justify-center gap-4 flex-nowrap w-max mx-auto py-2">
                {categoriesDisplay.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={`btn label-1 !min-w-auto px-6 py-2.5 rounded-full transition-all duration-300 ${currentCategoryId === category.id.toString() ? 'bg-secondary text-yellow' : 'bg-white text-gray-900 border border-gray-200 lg:hover:bg-primary lg:hover:text-white'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {featuredBlogsDisplay.length > 0 && (
              <div className="flex flex-col items-start gap-6 md:gap-6 lg:flex-row xl:gap-8">
                <div className="w-full lg:max-w-[500px] xl:max-w-[725px]">
                  <CardBlog isHot item={featuredBlogsDisplay[0]} />
                </div>
                <div className="flex-1 space-y-4 md:space-y-4 xl:space-y-8 w-full">
                  {featuredBlogsDisplay.slice(1, 5).map((item, index) => (
                    <CardBlogRow key={index} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-10 md:space-y-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-4 gap-x-3 xl:gap-x-6 md:gap-y-8 gap-y-5 xl:gap-y-10">
              {allBlogsDisplay.map((item, index) => (
                <CardBlog key={index} item={item} />
              ))}
            </div>

            {pagination.lastPage > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  aria-label="Previous page"
                  className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer group"
                >
                  <div className="rotate-90">
                    <Chevron />
                  </div>
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`
                        size-12 flex items-center justify-center rounded-full transition-all duration-300 title-2 cursor-pointer
                        ${pagination.currentPage === p
                          ? 'bg-secondary text-yellow'
                          : 'bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow'
                        }
                      `}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.lastPage}
                  aria-label="Next page"
                  className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer group"
                >
                  <div className="-rotate-90">
                    <Chevron />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
