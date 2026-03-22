'use client'

import { useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { slugify } from '@/lib/format'
import Search from '../Icons/Search'

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
}

export default function ProductIndexPage({
  category,
  selectedIngredients,
  products,
  categories,
  ingredients,
  locale,
}: ProductIndexPageProps) {
  const router = useRouter()
  const t = useTranslations()

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

  // Map slugs to IDs for internal filtering
  const categoryIdToFilter = useMemo(() => {
    if (!category) return null;
    return categoriesDisplay.find(c => c.slug === category)?.id || null;
  }, [category, categoriesDisplay]);

  const ingredientIdsToFilter = useMemo(() => {
    return selectedIngredients
      .map(slug => ingredientsDisplay.find(ing => ing.slug === slug)?.id)
      .filter(Boolean) as string[];
  }, [selectedIngredients, ingredientsDisplay]);

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
      image: {
        url: p.image || "/cover.jpg",
        alt: name
      },
      description: translation?.description || p.description || "",
      created_at: p.created_at || '2024-03-15T00:00:00Z',
    };
  }), [products, locale]);

  const pushWithFilters = (newCategorySlug: string | null, newIngredientSlugs: string[]) => {
    const query: Record<string, string> = {}
    if (newIngredientSlugs.length > 0) {
      query.ingredients = newIngredientSlugs.join(',')
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
    pushWithFilters(nextCategory, selectedIngredients)
  }

  const toggleIngredient = (slug: string) => {
    const nextIngredients = selectedIngredients.includes(slug)
      ? selectedIngredients.filter(s => s !== slug)
      : [...selectedIngredients, slug]
    pushWithFilters(category, nextIngredients)
  }

  const clearCategory = () => pushWithFilters(null, selectedIngredients)
  const clearIngredients = () => pushWithFilters(category, [])
  const clearAll = () => pushWithFilters(null, [])

  const filteredProductsSorted = useMemo(() => {
    return productsDisplay.filter(p => {
      const catMatch = !categoryIdToFilter || p.category.id === categoryIdToFilter
      const ingMatch =
        ingredientIdsToFilter.length === 0 ||
        ingredientIdsToFilter.every(id => p.ingredientIds.includes(id))
      return catMatch && ingMatch
    })
  }, [categoryIdToFilter, ingredientIdsToFilter, productsDisplay])

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
  }, [currentCategory])

  return (
    <section className="py-[60px]">
      <div className="container space-y-8">

        <div className="flex flex-col items-center gap-4">
          <Breadcrumb breadcrumbs={breadcrumbs} />
          <h1 className="display-3 text-center text-primary">
            {currentCategory ? currentCategory.title : t('breadcrumb.product')}
          </h1>
        </div>

        <div className='flex items-start gap-8'>
          <div className="max-w-[280px] w-full flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24 space-y-2">
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
          <div className="flex-1">
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
          </div>
        </div>
      </div>
    </section>
  )
}
