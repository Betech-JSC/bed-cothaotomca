'use client'

import { useMemo, useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'
import Chevron from '../Icons/Chevron'
import ProductFilter from './ProductFilter'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { slugify } from '@/lib/format'
import AnimateOnScroll from '../Animated/animated-appear'

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
    
    // Get category from categories array (new structure) or category object (old structure)
    const productCategory = p.categories && p.categories.length > 0 
      ? p.categories[0] 
      : p.category;
    
    const catTranslation = getTranslation(productCategory?.translations, locale) as any;
    const categoryName = catTranslation?.title || productCategory?.title || "";
    const categoryId = productCategory?.id?.toString() || "";
    const categorySlug = slugify(categoryName);
    
    // Store all category slugs for filtering (support multi-category)
    const allCategorySlugs = p.categories && p.categories.length > 0
      ? p.categories.map(cat => {
          const trans = getTranslation(cat.translations, locale) as any;
          const title = trans?.title || cat.title || "";
          return slugify(title);
        })
      : [categorySlug];

    return {
      id: p.id,
      title: name,
      slug: slugify(name),
      price: parseFloat(p.price as string) || 0,
      category: { id: categoryId, title: categoryName, slug: categorySlug },
      allCategorySlugs, // Add this for multi-category filtering
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
      }, { scroll: false })
    } else {
      router.push({
        pathname: '/product',
        query: query
      }, { scroll: false })
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
      // Otherwise, check if ANY of the product's categories matches the URL slug.
      const catMatch = !category || p.allCategorySlugs.includes(category)

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
          <AnimateOnScroll animate="slideup" delay={0}>
            <Breadcrumb breadcrumbs={breadcrumbs} />
          </AnimateOnScroll>
          <div className="flex items-center max-lg:justify-between max-lg:w-full">
            <AnimateOnScroll animate="slideup" delay={0}>
              <h1 className="display-3 text-center text-primary">
                {currentCategory ? currentCategory.title : t('breadcrumb.product')}
              </h1>
            </AnimateOnScroll>

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

        <div className='flex lg:flex-row flex-col items-start md:gap-6 gap-4 xl:gap-8'>
          <ProductFilter
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
            category={category}
            selectedIngredients={selectedIngredients}
            categoriesDisplay={categoriesDisplay}
            ingredientsDisplay={ingredientsDisplay}
            handleCategoryClick={handleCategoryClick}
            toggleIngredient={toggleIngredient}
            clearCategory={clearCategory}
            clearIngredients={clearIngredients}
          />
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
              <AnimateOnScroll animate="slideup" delay={300} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                {filteredProductsSorted.map(product => (
                  <CardProduct key={product.id} item={product} />
                ))}
              </AnimateOnScroll>
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
