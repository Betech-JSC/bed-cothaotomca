'use client'

import { useMemo, useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'
import Chevron from '../Icons/Chevron'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { slugify } from '@/lib/format'

// Custom Checkbox component
function CustomCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 w-full px-3 py-2 group transition-colors duration-200 cursor-pointer"
    >
      <span
        className={`
          relative flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200
          ${checked
            ? 'bg-primary border-primary'
            : 'bg-white border-gray-500 lg:group-hover:border-primary'
          }
        `}
      >
        <svg className={`absolute inset-0 w-full h-full p-0.5 text-white transition-all duration-150 ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

      </span>
      <span
        className={`title-3 transition-colors duration-200 ${checked ? 'text-primary' : 'text-gray-800 lg:group-hover:text-primary'}`}
      >
        {label}
      </span>
    </button>
  )
}

interface ProductIndexPageProps {
  category: string | null // Current slug in URL
  selectedIngredients: string[] // Current slugs in URL
  products: Product[]
  categories: Category[]
  ingredients: Ingredient[]
  locale: string
  pagination: {
    currentPage: number
    lastPage: number
    total: number
  }
}

export default function ProductIndexPage({
  category,
  selectedIngredients,
  products,
  categories,
  ingredients,
  locale,
  pagination,
}: ProductIndexPageProps) {
  const router = useRouter()
  const t = useTranslations()
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const categoriesDisplay = useMemo(() => categories.map(cat => {
    const translation = getTranslation(cat.translations, locale) as any;
    const title = translation?.title || cat.title || "";
    return {
      id: cat.id.toString(),
      title,
      slug: slugify(title)
    }
  }), [categories, locale]);

  const ingredientsDisplay = useMemo(() => ingredients.map(ing => {
    const translation = getTranslation(ing.translations, locale) as any;
    const name = translation?.name || ing.name || "";
    return {
      id: ing.id.toString(),
      title: name,
      slug: slugify(name)
    }
  }), [ingredients, locale]);

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

  const pushWithFilters = (newCategorySlug: string | null, newIngredientSlugs: string[], newPage: number = 1) => {
    setIsFilterOpen(false)
    const query: Record<string, string> = {}
    if (newIngredientSlugs.length > 0) {
      query.ingredients = newIngredientSlugs.join(',')
    }
    if (newPage > 1) {
      query.page = newPage.toString()
    }

    if (newCategorySlug) {
      router.push({
        pathname: '/product/[category]',
        params: { category: newCategorySlug },
        query: query
      })
    } else {
      router.push({
        pathname: '/product',
        query: query
      })
    }
  }

  const handleCategoryClick = (slug: string) => {
    const nextCategory = category === slug ? null : slug
    pushWithFilters(nextCategory, selectedIngredients, 1)
  }

  const toggleIngredient = (slug: string) => {
    const nextIngredients = selectedIngredients.includes(slug)
      ? selectedIngredients.filter(s => s !== slug)
      : [...selectedIngredients, slug]
    pushWithFilters(category, nextIngredients, 1)
  }

  const handlePageChange = (page: number) => {
    pushWithFilters(category, selectedIngredients, page)
  }

  const clearCategory = () => pushWithFilters(null, selectedIngredients, 1)
  const clearIngredients = () => pushWithFilters(category, [], 1)
  const clearAll = () => pushWithFilters(null, [], 1)
  const currentCategory = useMemo(() => {
    return categoriesDisplay.find(cat => cat.slug === category)
  }, [category, categoriesDisplay])

  const breadcrumbs = useMemo(() => {
    const base: { title: string; url?: any }[] = [
      { title: t('breadcrumb.product'), url: '/product' }
    ]
    if (currentCategory) {
      base.push({ title: currentCategory.title })
    }
    return base
  }, [currentCategory, t])

  const filteredProductsSorted = useMemo(() => {
    return productsDisplay.filter(p => {
      // Category match: if no category in URL, match all. 
      // Otherwise, match the product's category slug with the URL slug.
      const catMatch = !category || p.category.slug === category

      // Ingredient match: the product must have ALL selected ingredients.
      const ingMatch =
        selectedIngredients.length === 0 ||
        selectedIngredients.every(slug => {
          const ingId = ingredientsDisplay.find(ing => ing.slug === slug)?.id
          return ingId && p.ingredientIds.includes(ingId)
        })
      return catMatch && ingMatch
    })
  }, [category, selectedIngredients, productsDisplay, ingredientsDisplay])

  return (
    <section className="py-[60px]">
      <div className="container md:space-y-6 space-y-4 xl:space-y-8">
        <div className="flex flex-col items-center gap-3 md:gap-4">
          <Breadcrumb breadcrumbs={breadcrumbs} />
          <div className="flex items-center max-lg:justify-between max-lg:w-full">
            <h1 className="display-3 text-center text-primary">
              {currentCategory ? currentCategory.title : t('breadcrumb.product')}
            </h1>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 rounded-[12px] bg-white py-1.5 px-3 label-1 text-gray-900 font-semibold"
            >
              <span>{t('common.category')}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.38589 5.66687C2.62955 4.82155 2.25138 4.39889 2.23712 4.03968C2.22473 3.72764 2.35882 3.42772 2.59963 3.22889C2.87684 3 3.44399 3 4.57828 3H19.4212C20.5555 3 21.1227 3 21.3999 3.22889C21.6407 3.42772 21.7748 3.72764 21.7624 4.03968C21.7481 4.39889 21.3699 4.82155 20.6136 5.66687L14.9074 12.0444C14.7566 12.2129 14.6812 12.2972 14.6275 12.3931C14.5798 12.4781 14.5448 12.5697 14.5236 12.6648C14.4997 12.7721 14.4997 12.8852 14.4997 13.1113V18.4584C14.4997 18.6539 14.4997 18.7517 14.4682 18.8363C14.4403 18.911 14.395 18.9779 14.336 19.0315C14.2692 19.0922 14.1784 19.1285 13.9969 19.2012L10.5969 20.5612C10.2293 20.7082 10.0455 20.7817 9.89802 20.751C9.76901 20.7242 9.6558 20.6476 9.583 20.5377C9.49975 20.4122 9.49975 20.2142 9.49975 19.8184V13.1113C9.49975 12.8852 9.49975 12.7721 9.47587 12.6648C9.45469 12.5697 9.41971 12.4781 9.37204 12.3931C9.31828 12.2972 9.2429 12.2129 9.09213 12.0444L3.38589 5.66687Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className='flex md:flex-row flex-col items-start md:gap-6 gap-4 xl:gap-8'>
          <>
            {isFilterOpen && (
              <div
                className="fixed inset-0 z-[100] bg-black/50 lg:hidden"
                onClick={() => setIsFilterOpen(false)}
              />
            )}
            <div className={`
              md:max-w-[280px] w-full flex-shrink-0 lg:block duration-300 ease-in-out
              ${isFilterOpen ? 'fixed top-0 right-0 bottom-0 z-[110] w-[85%] max-w-[360px] bg-gray-50 flex flex-col shadow-xl translate-x-0' : 'max-md:translate-x-full hidden lg:block'}
            `}>
              {/* Mobile Header */}
              {isFilterOpen && (
                <div className="lg:hidden flex justify-between items-center p-4 bg-white border-b border-gray-100">
                  <span className="title-2 text-primary">{t('common.category')}</span>
                  <button onClick={() => setIsFilterOpen(false)} className="text-gray-900 hover:text-primary transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}

              <div className={`
                bg-white space-y-2
                ${isFilterOpen ? 'flex-1 overflow-y-auto p-4' : 'rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24'}
              `}>
                <div className="pt-4.5 space-y-3">
                  <div className="px-3 flex items-center justify-between">
                    <span className="label-1 font-semibold text-gray-900">{t('common.category')}</span>
                    {category && (
                      <button
                        onClick={clearCategory}
                        className="label-3 font-semibold text-primary lg:hover:text-secondary duration-300 ease-in-out cursor-pointer"
                      >
                        {t('common.clear')}
                      </button>
                    )}
                  </div>
                  <div>
                    {categoriesDisplay.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat.slug)}
                        className={`
                        w-full text-left p-3 title-3 cursor-pointer duration-300 ease-in-out
                        ${category === cat.slug
                            ? 'bg-secondary/5 text-secondary'
                            : 'text-gray-800 lg:hover:text-secondary'
                          }
                      `}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                    <span className="label-1 font-semibold text-gray-900">{t('common.ingredient')}</span>
                    {selectedIngredients.length > 0 && (
                      <button
                        onClick={clearIngredients}
                        className="label-3 font-semibold text-primary lg:hover:text-secondary duration-300 ease-in-out cursor-pointer"
                      >
                        {t('common.clear')} ({selectedIngredients.length})
                      </button>
                    )}
                  </div>
                  <div className="pb-2 space-y-2">
                    {ingredientsDisplay.map(ing => (
                      <CustomCheckbox
                        key={ing.id}
                        checked={selectedIngredients.includes(ing.slug)}
                        onChange={() => toggleIngredient(ing.slug)}
                        label={ing.title}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
          <div className="flex-1 space-y-12">
            {filteredProductsSorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-gray-200 space-y-8">
                <div className="space-y-3">
                  <h2 className="headline-1 text-primary">{t('common.no_products_found')}</h2>
                  <p className="body-1 text-gray-900">{t('common.try_changing_filters')}</p>
                </div>
                <button
                  onClick={clearAll}
                  className="btn btn-primary"
                >
                  {t('common.clear_all')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                {filteredProductsSorted.map(product => (
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
        </div>
      </div>
    </section>
  )
}
