'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'
import Chevron from '../Icons/Chevron'
import ProductFilter from './ProductFilter'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { slugify, formatImageUrl } from '@/lib/format'
import {
  getProductLocalizedSlugs,
  getCategoryCandidateSlugs,
  getIngredientAliases,
  translateIngredientSlug,
} from '@/lib/productHelper'
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
  const [isPending, startTransition] = useTransition()
  const [pendingPage, setPendingPage] = useState<number | null>(null)

  // Reset pending state when currentPage updates
  useEffect(() => {
    setPendingPage(null)
  }, [pagination.currentPage])

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const categoriesDisplay = useMemo(() => (categories || []).map(cat => {
    const translation = getTranslation(cat?.translations, locale) as any;
    const title = translation?.title || cat?.title || "";
    const slug = locale === 'vi'
      ? ((cat as any)?.original_slug || cat?.slug || slugify(title))
      : slugify((cat as any)?.en_title || title || cat?.slug || "");
    const candidateSlugs = Array.from(new Set([
      slug,
      ...getCategoryCandidateSlugs(cat),
    ].filter(Boolean) as string[]));
    return {
      id: cat?.id?.toString() || "",
      title,
      slug: slug || cat?.slug || "",
      candidateSlugs,
    }
  }), [categories, locale]);

  const ingredientsDisplay = useMemo(() => (ingredients || []).map(ing => {
    const translation = getTranslation(ing?.translations, locale) as any;
    const name = translation?.name || (ing as any)?.title || ing?.name || "";
    const rawSlug = slugify(name);
    const canonicalSlug = locale === 'vi'
      ? ((ing as any)?.original_slug || slugify((ing as any)?.vi_title || (ing as any)?.name_vi || name) || translateIngredientSlug(rawSlug, 'vi'))
      : (slugify((ing as any)?.en_title || (ing as any)?.name_en || name) || translateIngredientSlug(rawSlug, 'en'));
    const aliases = Array.from(new Set([
      canonicalSlug,
      rawSlug,
      ...getIngredientAliases(ing),
    ].filter(Boolean) as string[]));
    return {
      id: ing?.id?.toString() || "",
      title: name,
      slug: canonicalSlug || rawSlug,
      aliases,
    }
  }), [ingredients, locale]);

  const normalizedSelectedIngredients = useMemo(() => {
    if (!selectedIngredients || selectedIngredients.length === 0) return [];
    const mapped = selectedIngredients
      .map(raw => {
        const norm = slugify(raw) || raw;
        if (!norm) return "";
        const matched = ingredientsDisplay.find(
          ing => ing.slug === norm || ing.aliases.includes(norm)
        );
        if (matched) return matched.slug;
        return translateIngredientSlug(norm, locale);
      })
      .filter(Boolean);
    return Array.from(new Set(mapped));
  }, [selectedIngredients, ingredientsDisplay, locale]);

  const currentCategory = useMemo(() => {
    if (!category) return undefined;
    const norm = slugify(category) || category;
    return categoriesDisplay.find(
      cat =>
        cat.slug === category ||
        slugify(cat.title) === category ||
        cat.candidateSlugs.includes(category) ||
        cat.candidateSlugs.includes(norm)
    );
  }, [category, categoriesDisplay])

  // Automatically normalize URL if selectedIngredients contains cross-locale aliases or duplicates
  useEffect(() => {
    if (!selectedIngredients || selectedIngredients.length === 0) return;
    const rawJoined = selectedIngredients.filter(Boolean).join(',');
    const normJoined = normalizedSelectedIngredients.join(',');
    if (rawJoined && normJoined && rawJoined !== normJoined) {
      const query: Record<string, string> = { ingredients: normJoined };
      if (pagination.currentPage > 1) {
        query.page = pagination.currentPage.toString();
      }
      const targetCat = currentCategory?.slug || category;
      if (targetCat) {
        router.replace(
          { pathname: '/product/[category]', params: { category: targetCat }, query },
          { scroll: false }
        );
      } else {
        router.replace(
          { pathname: '/product', query },
          { scroll: false }
        );
      }
    }
  }, [selectedIngredients, normalizedSelectedIngredients, category, currentCategory, pagination.currentPage, router]);

  // Prefetch adjacent pages in the background for instant navigation
  useEffect(() => {
    const buildQuery = (p: number) => {
      const q: Record<string, string> = {}
      if (normalizedSelectedIngredients.length > 0) q.ingredients = normalizedSelectedIngredients.join(',')
      if (p > 1) q.page = p.toString()
      return q
    }

    const prevPage = pagination.currentPage - 1
    const nextPage = pagination.currentPage + 1
    const targetCat = currentCategory?.slug || category

    if (nextPage <= pagination.lastPage) {
      if (targetCat) {
        router.prefetch({ pathname: '/product/[category]', params: { category: targetCat }, query: buildQuery(nextPage) })
      } else {
        router.prefetch({ pathname: '/product', query: buildQuery(nextPage) })
      }
    }

    if (prevPage >= 1) {
      if (targetCat) {
        router.prefetch({ pathname: '/product/[category]', params: { category: targetCat }, query: buildQuery(prevPage) })
      } else {
        router.prefetch({ pathname: '/product', query: buildQuery(prevPage) })
      }
    }
  }, [pagination.currentPage, pagination.lastPage, category, currentCategory, normalizedSelectedIngredients, router])

  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return (products || []).filter(p => {
      const key = p?.slug || `${p?.id}-${p?.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [products]);

  const productsDisplay = useMemo(() => (uniqueProducts || []).map(p => {
    const translation = getTranslation(p?.translations, locale) as any;
    const name = translation?.custom_name || p?.custom_name || translation?.name || p?.name || "";

    // Get category from categories array (new structure) or category object (old structure)
    const productCategory = p?.categories && p.categories.length > 0 
      ? p.categories[0] 
      : p?.category;
    
    const catTranslation = getTranslation(productCategory?.translations, locale) as any;
    const categoryName = catTranslation?.title || productCategory?.title || "";
    const categoryId = productCategory?.id?.toString() || "";
    const { viCatSlug, viProductSlug, enCatSlug, enProductSlug } = getProductLocalizedSlugs(p);
    const categorySlug = locale === 'en'
      ? (enCatSlug || slugify((productCategory as any)?.en_title || categoryName || productCategory?.slug || "") || productCategory?.slug)
      : (viCatSlug || (productCategory as any)?.original_slug || productCategory?.slug || slugify(categoryName));
    
    const allCategoryIds = Array.from(new Set([
      ...(p?.categories?.map(c => c?.id?.toString()).filter(Boolean) || []),
      ...(p?.category?.id ? [p.category.id.toString()] : []),
      categoryId,
    ].filter(Boolean) as string[]));

    // Store all category slugs for filtering (support DB slug, title slug, alternate_slugs, and mapped categoriesDisplay slugs by id)
    const rawCatSlugs = p?.categories && p.categories.length > 0
      ? p.categories.flatMap(cat => {
          const matchedDisplay = categoriesDisplay.find(cd => cd.id && String(cd.id) === String(cat?.id));
          return [
            ...getCategoryCandidateSlugs(cat),
            ...(matchedDisplay ? matchedDisplay.candidateSlugs : []),
          ].filter(Boolean) as string[];
        })
      : [
          categorySlug,
          ...getCategoryCandidateSlugs(productCategory),
          ...(categoriesDisplay.find(cd => cd.id && cd.id === categoryId)?.candidateSlugs || []),
        ].filter(Boolean) as string[];

    const allCategorySlugs = Array.from(new Set(rawCatSlugs));

    const productSlug = locale === 'en'
      ? (enProductSlug || p?.slug || slugify(name))
      : (viProductSlug || p?.slug || slugify(name));
    const rawDesc = translation?.description || p?.description || "";
    const cleanedDesc = locale === 'en' && typeof rawDesc === 'string'
      ? rawDesc.replace(/\bat Bếp\b/gi, 'at Cô Thảo Tôm Cá')
      : rawDesc;

    return {
      id: p?.id || 0,
      title: name,
      custom_name: p?.custom_name,

      slug: productSlug,
      price: parseFloat(String(p?.price || 0)) || 0,
      campaign_price: (p as any)?.campaign_price,
      original_price: (p as any)?.original_price,
      active_campaign: (p as any)?.active_campaign,
      category: { id: categoryId, title: categoryName, slug: categorySlug },
      allCategoryIds,
      allCategorySlugs, // Add this for multi-category filtering
      ingredientIds: p?.ingredients?.map(ing => ing?.id?.toString()).filter(Boolean) as string[] || [],
      variants: p?.variants,
      image: {
        url: formatImageUrl(p?.image) || "/cover.jpg",
        alt: name
      },
      description: cleanedDesc,
      created_at: p?.created_at || '2024-03-15T00:00:00Z',
    };
  }), [uniqueProducts, locale, categoriesDisplay]);

  const pushWithFilters = (newCategorySlug: string | null, newIngredientSlugs: string[], newPage: number = 1) => {
    setIsFilterOpen(false)
    const query: Record<string, string> = {}
    const uniqueIngredients = Array.from(new Set(newIngredientSlugs.filter(Boolean)))
    if (uniqueIngredients.length > 0) {
      query.ingredients = uniqueIngredients.join(',')
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
    const isSame = category === slug || currentCategory?.slug === slug || currentCategory?.candidateSlugs.includes(slug);
    const nextCategory = isSame ? null : slug
    pushWithFilters(nextCategory, normalizedSelectedIngredients, 1)
  }

  const toggleIngredient = (slug: string) => {
    const norm = slugify(slug) || slug
    const matched = ingredientsDisplay.find(
      ing => ing.slug === norm || ing.aliases.includes(norm)
    )
    const canonicalSlug = matched ? matched.slug : translateIngredientSlug(norm, locale)
    const nextIngredients = normalizedSelectedIngredients.includes(canonicalSlug)
      ? normalizedSelectedIngredients.filter(s => s !== canonicalSlug)
      : Array.from(new Set([...normalizedSelectedIngredients, canonicalSlug]))
    pushWithFilters(currentCategory?.slug || category, nextIngredients, 1)
  }

  const handlePageChange = (page: number) => {
    if (page === pagination.currentPage || isPending) return
    setPendingPage(page)
    startTransition(() => {
      pushWithFilters(currentCategory?.slug || category, normalizedSelectedIngredients, page)
    })
    const section = document.getElementById('products-section')
    if (section) {
      const rect = section.getBoundingClientRect()
      if (rect.top < 0) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const clearCategory = () => pushWithFilters(null, normalizedSelectedIngredients, 1)
  const clearIngredients = () => pushWithFilters(currentCategory?.slug || category, [], 1)
  const clearAll = () => pushWithFilters(null, [], 1)

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
      // Otherwise, check if ANY of the product's categories matches by id, slug, or candidateSlugs.
      const catMatch =
        !category ||
        p.allCategorySlugs.includes(category) ||
        p.allCategorySlugs.includes(slugify(category)) ||
        Boolean(currentCategory?.id && p.allCategoryIds.includes(currentCategory.id)) ||
        Boolean(currentCategory && p.allCategorySlugs.some(s => currentCategory.candidateSlugs.includes(s)))

      // Ingredient match: the product has ANY of the selected ingredients (OR logic for combos/multi-ingredients).
      const ingMatch =
        normalizedSelectedIngredients.length === 0 ||
        normalizedSelectedIngredients.some(slug => {
          const matchedIng = ingredientsDisplay.find(
            ing => ing.slug === slug || ing.aliases.includes(slug)
          )
          const ingId = matchedIng?.id
          return ingId && p.ingredientIds.includes(ingId)
        })
      return catMatch && ingMatch
    })
  }, [category, currentCategory, normalizedSelectedIngredients, productsDisplay, ingredientsDisplay])

  return (
    <section id="products-section" className="py-[60px] scroll-mt-24">
      <div className="container md:space-y-6 space-y-4 xl:space-y-8">
        <div className="flex flex-col items-center gap-3 md:gap-4 text-center w-full">
          <AnimateOnScroll animate="slideup" delay={0}>
            <Breadcrumb breadcrumbs={breadcrumbs} />
          </AnimateOnScroll>
          <AnimateOnScroll animate="slideup" delay={0} className="w-full">
            <h1 className="display-3 text-center text-primary w-full leading-tight">
              {currentCategory ? currentCategory.title : t('breadcrumb.product')}
            </h1>
          </AnimateOnScroll>
        </div>

        <div className='flex lg:flex-row flex-col items-start md:gap-6 gap-4 xl:gap-8'>
          <ProductFilter
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
            category={currentCategory?.slug || category}
            selectedIngredients={normalizedSelectedIngredients}
            categoriesDisplay={categoriesDisplay}
            ingredientsDisplay={ingredientsDisplay}
            handleCategoryClick={handleCategoryClick}
            toggleIngredient={toggleIngredient}
            clearCategory={clearCategory}
            clearIngredients={clearIngredients}
          />
          <div className="flex-1 space-y-12 w-full">
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
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
                {filteredProductsSorted.map(product => (
                  <CardProduct key={`${product.id}-${product.slug}`} item={product} />
                ))}
              </div>
            )}

            {pagination.lastPage > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || isPending}
                  className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed group"
                  aria-label="Previous page"
                >
                  <div className="rotate-90">
                    <Chevron />
                  </div>
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).map((p) => {
                    const isActive = (pendingPage ?? pagination.currentPage) === p
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        disabled={isPending && pendingPage === p}
                        className={`
                          size-12 flex items-center justify-center rounded-full transition-colors duration-200 title-2 cursor-pointer
                          ${isActive
                            ? 'bg-secondary text-yellow shadow-xs'
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
                  disabled={pagination.currentPage === pagination.lastPage || isPending}
                  className="size-12 flex items-center justify-center rounded-full disabled:invisible disabled:opacity-0 bg-yellow text-primary lg:hover:bg-secondary lg:hover:text-yellow transition-colors duration-300 cursor-pointer disabled:cursor-not-allowed group"
                  aria-label="Next page"
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

      {/* Mobile Floating Filter Pill Button (Bottom Left Position) */}
      <div className="fixed bottom-6 left-5 z-40 lg:hidden pointer-events-auto">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary text-yellow px-4.5 py-2.5 rounded-full shadow-2xl border border-yellow/40 font-semibold text-xs uppercase tracking-wider whitespace-nowrap active:scale-95 transition-all duration-300 backdrop-blur-md cursor-pointer"
          aria-label={t('common.filter')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.38589 5.66687C2.62955 4.82155 2.25138 4.39889 2.23712 4.03968C2.22473 3.72764 2.35882 3.42772 2.59963 3.22889C2.87684 3 3.44399 3 4.57828 3H19.4212C20.5555 3 21.1227 3 21.3999 3.22889C21.6407 3.42772 21.7748 3.72764 21.7624 4.03968C21.7481 4.39889 21.3699 4.82155 20.6136 5.66687L14.9074 12.0444C14.7566 12.2129 14.6812 12.2972 14.6275 12.3931C14.5798 12.4781 14.5448 12.5697 14.5236 12.6648C14.4997 12.7721 14.4997 12.8852 14.4997 13.1113V18.4584C14.4997 18.6539 14.4997 18.7517 14.4682 18.8363C14.4403 18.911 14.395 18.9779 14.336 19.0315C14.2692 19.0922 14.1784 19.1285 13.9969 19.2012L10.5969 20.5612C10.2293 20.7082 10.0455 20.7817 9.89802 20.751C9.76901 20.7242 9.6558 20.6476 9.583 20.5377C9.49975 20.4122 9.49975 20.2142 9.49975 19.8184V13.1113C9.49975 12.8852 9.49975 12.7721 9.47587 12.6648C9.45469 12.5697 9.41971 12.4781 9.37204 12.3931C9.31828 12.2972 9.2429 12.2129 9.09213 12.0444L3.38589 5.66687Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('common.filter')}</span>
          {(currentCategory || normalizedSelectedIngredients.length > 0) && (
            <span className="flex items-center justify-center size-4.5 rounded-full bg-secondary text-yellow text-[10px] font-bold">
              {(currentCategory ? 1 : 0) + normalizedSelectedIngredients.length}
            </span>
          )}
        </button>
      </div>
    </section>
  )
}
