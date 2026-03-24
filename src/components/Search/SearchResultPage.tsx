'use client'

import { useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'
import Chevron from '../Icons/Chevron'
import { Product } from '@/services/productService'
import { slugify } from '@/lib/format'

interface SearchResultPageProps {
  query: string
  products: Product[]
  locale: string
  pagination: {
    currentPage: number
    lastPage: number
    total: number
  }
}

export default function SearchResultPage({
  query,
  products,
  locale,
  pagination,
}: SearchResultPageProps) {
  const router = useRouter()
  const t = useTranslations()

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

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (page > 1) params.set('page', page.toString())
    router.push({
      pathname: '/search',
      query: Object.fromEntries(params.entries())
    })
  }

  const breadcrumbs = useMemo(() => {
    const base: { title: string; url?: any }[] = [
      { title: t('common.search') }
    ]
    return base
  }, [t])

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

        {productsDisplay.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
            {productsDisplay.map(product => (
              <CardProduct key={product.id} item={product} />
            ))}
          </div>
        )}

        {pagination.lastPage > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer group"
            >
              <div className="rotate-90">
                <Chevron />
              </div>
            </button>

            <div className="flex gap-2">
              {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).map((p) => {
                return (
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
                )
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.lastPage}
              className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed group"
            >
              <div className="-rotate-90">
                <Chevron />
              </div>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
