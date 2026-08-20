'use client'

import { useMemo, useState } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'
import CardBlog from '../Card/CardBlog'
import Chevron from '../Icons/Chevron'
import { Product } from '@/services/productService'
import { Blog } from '@/services/blogService'
import { Policy } from '@/services/policyService'
import { slugify } from '@/lib/format'

interface SearchResultPageProps {
  query: string
  products: Product[]
  blogs: Blog[]
  policies?: Policy[]
  initialTab?: string
  locale: string
  productPagination: {
    currentPage: number
    lastPage: number
    total: number
  }
  blogPagination: {
    currentPage: number
    lastPage: number
    total: number
  }
}

export default function SearchResultPage({
  query,
  products,
  blogs,
  policies = [],
  initialTab = 'products',
  locale,
  productPagination,
  blogPagination,
}: SearchResultPageProps) {
  const router = useRouter()
  const t = useTranslations()

  const policyCount = policies.length

  // Auto select tab with results if initial tab has 0 results
  const defaultTab = useMemo(() => {
    if (initialTab === 'policies' && policyCount > 0) return 'policies'
    if (initialTab === 'blogs' && blogPagination.total > 0) return 'blogs'
    if (productPagination.total > 0) return 'products'
    if (blogPagination.total > 0) return 'blogs'
    if (policyCount > 0) return 'policies'
    return 'products'
  }, [initialTab, productPagination.total, blogPagination.total, policyCount])

  const [activeTab, setActiveTab] = useState<'products' | 'blogs' | 'policies'>(defaultTab as any)

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const productsDisplay = useMemo(() => products.map(p => {
    const translation = getTranslation(p.translations, locale) as any;
    const name = translation?.name || p.name;
    const catTranslation = getTranslation(p.category?.translations, locale) as any;
    const categoryName = catTranslation?.title || p.category?.title || "";
    const categoryId = p.category?.id?.toString() || "";
    const categorySlug = slugify(categoryName);

    return {
      id: p.id,
      title: name,
      custom_name: p.custom_name,
      slug: slugify(name),
      price: parseFloat(p.price as string) || 0,
      category: { id: categoryId, title: categoryName, slug: categorySlug },
      ingredientIds: p.ingredients?.map(ing => ing.id.toString()) || [],
      variants: p.variants,
      image: {
        url: p.image || "/cover.jpg",
        alt: name
      },
      description: translation?.description || p.description || "",
      created_at: p.created_at || '2024-03-15T00:00:00Z',
    };
  }), [products, locale]);

  const blogsDisplay = useMemo(() => blogs.map(b => {
    const translation = getTranslation(b.translations, locale) as any;
    const title = translation?.title || b.title;
    const catTranslation = getTranslation(b.category?.translations, locale) as any;
    const categoryName = catTranslation?.title || b.category?.title || "Tin tức";
    const categorySlug = b.category?.slug || slugify(categoryName) || "tin-tuc";

    return {
      id: b.id,
      title,
      slug: b.slug,
      image: {
        url: b.thumbnail || "/cover.jpg",
        alt: title
      },
      category: {
        title: categoryName,
        slug: categorySlug
      },
      created_at: b.created_at || '2024-03-15T00:00:00Z',
    };
  }), [blogs, locale]);

  const policiesDisplay = useMemo(() => policies.map(pol => {
    const translation = getTranslation(pol.translations, locale) as any;
    const title = translation?.title || pol.title;
    const content = translation?.content || pol.content || "";
    // Clean html tags for summary preview
    const cleanSnippet = content.replace(/<[^>]*>?/gm, '').slice(0, 140);

    return {
      id: pol.id,
      title,
      slug: pol.slug,
      snippet: cleanSnippet ? `${cleanSnippet}...` : ""
    };
  }), [policies, locale]);

  const handleProductPageChange = (page: number) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (page > 1) params.set('page', page.toString())
    if (blogPagination.currentPage > 1) params.set('blog_page', blogPagination.currentPage.toString())
    params.set('tab', 'products')

    router.push({
      pathname: '/search',
      query: Object.fromEntries(params.entries())
    })
  }

  const handleBlogPageChange = (page: number) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (productPagination.currentPage > 1) params.set('page', productPagination.currentPage.toString())
    if (page > 1) params.set('blog_page', page.toString())
    params.set('tab', 'blogs')

    router.push({
      pathname: '/search',
      query: Object.fromEntries(params.entries())
    })
  }

  const handleTabChange = (tab: 'products' | 'blogs' | 'policies') => {
    setActiveTab(tab)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (productPagination.currentPage > 1) params.set('page', productPagination.currentPage.toString())
    if (blogPagination.currentPage > 1) params.set('blog_page', blogPagination.currentPage.toString())
    params.set('tab', tab)

    router.push({
      pathname: '/search',
      query: Object.fromEntries(params.entries())
    }, { scroll: false })
  }

  const breadcrumbs = useMemo(() => {
    const base: { title: string; url?: any }[] = [
      { title: t('common.search') }
    ]
    return base
  }, [t])

  const totalResults = productPagination.total + blogPagination.total + policyCount

  return (
    <section className="py-[60px]">
      <div className="container xl:space-y-8 md:space-y-6 space-y-4">

        <div className="flex flex-col items-center justify-center gap-3">
          <Breadcrumb breadcrumbs={breadcrumbs} classNameNav="mx-auto w-max" />
          <h1 className="display-3 text-center text-primary hidden">
            {t('common.search')}
          </h1>
          {query && (
            <h2 className="headline-2 text-primary text-center">
              {t('search.results_for')} <br className="md:hidden" /> “{query}”
            </h2>
          )}
        </div>

        {totalResults > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gray-200 pb-4">
            <button
              onClick={() => handleTabChange('products')}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 cursor-pointer
                ${activeTab === 'products'
                  ? 'bg-primary text-yellow shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>🛒 {t('common.product')}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'products' ? 'bg-secondary text-yellow' : 'bg-gray-200 text-gray-700'}`}>
                {productPagination.total}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('blogs')}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 cursor-pointer
                ${activeTab === 'blogs'
                  ? 'bg-primary text-yellow shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>📰 {t('common.blog')}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'blogs' ? 'bg-secondary text-yellow' : 'bg-gray-200 text-gray-700'}`}>
                {blogPagination.total}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('policies')}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 cursor-pointer
                ${activeTab === 'policies'
                  ? 'bg-primary text-yellow shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>📜 {t('common.policy')}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'policies' ? 'bg-secondary text-yellow' : 'bg-gray-200 text-gray-700'}`}>
                {policyCount}
              </span>
            </button>
          </div>
        )}

        {totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-gray-200 space-y-8">
            <div className="space-y-3">
              <h2 className="headline-1 text-primary">
                {query ? t('common.no_products_found') : t('search.enter_keyword')}
              </h2>
              <p className="body-1 text-gray-900">
                {query ? t('search.try_different_keyword') : t('common.search_placeholder')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              <div>
                {productsDisplay.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {t('common.no_products_found')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                    {productsDisplay.map(product => (
                      <CardProduct key={product.id} item={product} />
                    ))}
                  </div>
                )}

                {productPagination.lastPage > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => handleProductPageChange(productPagination.currentPage - 1)}
                      disabled={productPagination.currentPage === 1}
                      className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer group"
                    >
                      <div className="rotate-90">
                        <Chevron />
                      </div>
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: productPagination.lastPage }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleProductPageChange(p)}
                          className={`
                            size-12 flex items-center justify-center rounded-full transition-all duration-300 title-2 cursor-pointer
                            ${productPagination.currentPage === p
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
                      onClick={() => handleProductPageChange(productPagination.currentPage + 1)}
                      disabled={productPagination.currentPage === productPagination.lastPage}
                      className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed group"
                    >
                      <div className="-rotate-90">
                        <Chevron />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'blogs' && (
              <div>
                {blogsDisplay.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {t('common.no_products_found')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                    {blogsDisplay.map(blog => (
                      <CardBlog key={blog.id} item={blog} />
                    ))}
                  </div>
                )}

                {blogPagination.lastPage > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => handleBlogPageChange(blogPagination.currentPage - 1)}
                      disabled={blogPagination.currentPage === 1}
                      className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer group"
                    >
                      <div className="rotate-90">
                        <Chevron />
                      </div>
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: blogPagination.lastPage }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleBlogPageChange(p)}
                          className={`
                            size-12 flex items-center justify-center rounded-full transition-all duration-300 title-2 cursor-pointer
                            ${blogPagination.currentPage === p
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
                      onClick={() => handleBlogPageChange(blogPagination.currentPage + 1)}
                      disabled={blogPagination.currentPage === blogPagination.lastPage}
                      className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed group"
                    >
                      <div className="-rotate-90">
                        <Chevron />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'policies' && (
              <div>
                {policiesDisplay.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {t('common.no_products_found')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {policiesDisplay.map(policy => (
                      <Link
                        key={policy.id}
                        href={{ pathname: '/policy/[slug]', params: { slug: policy.slug } }}
                        className="block p-6 rounded-2xl bg-white border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-yellow transition-colors duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div className="space-y-2 flex-1">
                            <h3 className="title-2 text-primary group-hover:text-secondary transition-colors duration-300">
                              {policy.title}
                            </h3>
                            {policy.snippet && (
                              <p className="body-2 text-gray-600 line-clamp-2">
                                {policy.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
