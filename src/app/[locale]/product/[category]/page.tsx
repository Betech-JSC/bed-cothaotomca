import ProductIndexPage from '@/components/Product/ProductIndexPage'
import { getApi } from '@/services/apiService'
import { Product, getProductBySlugWithFallback } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { HeroBanner } from '@/services/heroBannerService'
import Banner from '@/components/Banner'
import AlternateLinksUpdater from '@/components/SEO/AlternateLinksUpdater'
import { slugify, getTranslation, formatImageUrl } from '@/lib/format'
import {
  getProductLocalizedSlugs,
  getCategoryCandidateSlugs,
  getIngredientAliases,
  translateCategorySlug,
  findCategory,
} from '@/lib/productHelper'
import { redirect } from '@/i18n/routing'
import { Metadata } from 'next'

export const revalidate = 60

function resolveCategoryLocalizedInfo(targetCategory: any, categorySlug: string, locale: string) {
  const isEn = locale === 'en'
  const viTrans = getTranslation(targetCategory?.translations, 'vi') as any
  const enTrans = getTranslation(targetCategory?.translations, 'en') as any
  const currentTrans = getTranslation(targetCategory?.translations, locale) as any

  const viTitle = targetCategory?.vi_title || viTrans?.title || (!isEn ? targetCategory?.title : '') || ''
  const enTitle = targetCategory?.en_title || enTrans?.title || (isEn ? targetCategory?.title : '') || ''

  const fallbackCapitalized = categorySlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const displayTitle = targetCategory
    ? (isEn
        ? (enTitle || currentTrans?.title || targetCategory.title || fallbackCapitalized)
        : (viTitle || currentTrans?.title || targetCategory.title || fallbackCapitalized))
    : fallbackCapitalized

  const viCategorySlug = targetCategory
    ? (targetCategory.alternate_slugs?.vi?.slug ||
        targetCategory.original_slug ||
        targetCategory.slug_vi ||
        viTrans?.slug ||
        (!isEn ? targetCategory.slug : '') ||
        slugify(viTitle) ||
        translateCategorySlug(categorySlug, 'vi'))
    : translateCategorySlug(categorySlug, 'vi')

  const enCategorySlug = targetCategory
    ? (targetCategory.alternate_slugs?.en?.slug ||
        enTrans?.slug ||
        targetCategory.slug_en ||
        slugify(enTitle || (isEn ? targetCategory.title : '')) ||
        translateCategorySlug(viCategorySlug || categorySlug, 'en') ||
        slugify(targetCategory.title || '') ||
        targetCategory.slug)
    : translateCategorySlug(categorySlug, 'en')

  const canonicalCategorySlug = isEn ? enCategorySlug : viCategorySlug

  return {
    displayTitle,
    viCategorySlug,
    enCategorySlug,
    canonicalCategorySlug,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>
}): Promise<Metadata> {
  const { locale, category: categorySlug } = await params
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')

  let matched: Category | undefined
  try {
    const categoriesRes = await getApi<Category>('categories', { params: { lang: locale } })
    matched = findCategory(categoriesRes.data || [], categorySlug, locale)
  } catch {}

  const { displayTitle: categoryName, viCategorySlug, enCategorySlug } = resolveCategoryLocalizedInfo(
    matched,
    categorySlug,
    locale
  )

  const isEn = locale === 'en'
  const titleSuffix = isEn ? 'Products | Co Thao Tom Ca' : 'Sản phẩm | Cô Thảo Tôm Cá'
  const descSuffix = isEn
    ? `Product category ${categoryName} — Co Thao Tom Ca specializes in premium fresh seafood.`
    : `Danh mục sản phẩm ${categoryName} — Cô Thảo Tôm Cá chuyên cung cấp hải sản tươi ngon, chất lượng cao.`

  const viUrl = `${baseUrl}/san-pham/${viCategorySlug}`
  const enUrl = `${baseUrl}/en/product/${enCategorySlug}`
  const canonicalUrl = isEn ? enUrl : viUrl

  return {
    title: `${categoryName} | ${titleSuffix}`,
    description: descSuffix,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: viUrl,
        en: enUrl,
        'x-default': viUrl,
      },
    },
    openGraph: {
      title: `${categoryName} | ${titleSuffix}`,
      description: descSuffix,
      url: canonicalUrl,
      type: 'website',
    },
  }
}

interface Props {
  params: Promise<{
    locale: string
    category: string
  }>
  searchParams: Promise<{
    ingredients?: string
    page?: string
  }>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category: categorySlug } = await params
  const { ingredients: ingredientsParam, page = '1' } = await searchParams

  const selectedIngredientsSlugs = ingredientsParam ? ingredientsParam.split(',').filter(Boolean) : []
  
  // Define promises
  const categoriesPromise = getApi<Category>('categories', { params: { lang: locale } }).catch(() => ({ data: [] }));
  const ingredientsPromise = getApi<Ingredient>('ingredients', { params: { lang: locale } }).catch(() => ({ data: [] }));
  const bannerPromise = getApi<HeroBanner>('banners', { params: { position: 'banner_product', lang: locale } }).catch(() => ({ data: [] }));

  let categoriesResp: { data: Category[] };
  let ingredientsResp: { data: Ingredient[] };
  let bannerResp: { data: HeroBanner[] };
  let productsResp: { data: Product[], last_page?: number, current_page?: number, total?: number };

  // 1. Fetch metadata first (categories, ingredients, banner)
  [categoriesResp, ingredientsResp, bannerResp] = await Promise.all([
    categoriesPromise,
    ingredientsPromise,
    bannerPromise,
  ]);

  const categories = categoriesResp.data;
  const ingredients = ingredientsResp.data;

  const targetCategory = findCategory(categories, categorySlug, locale);
  const categoryId = targetCategory?.id;
  const { viCategorySlug, enCategorySlug, canonicalCategorySlug } = resolveCategoryLocalizedInfo(
    targetCategory,
    categorySlug,
    locale
  );

  // If category is provided in URL but not found in API, check if it's a product slug first
  if (categorySlug && !targetCategory) {
    const product = await getProductBySlugWithFallback(categorySlug, { revalidate: 60, lang: locale });
    if (product && product.id) {
      const { viCatSlug, enCatSlug, viProductSlug, enProductSlug } = getProductLocalizedSlugs(product);
      redirect({
        href: {
          pathname: '/product/[category]/[slug]',
          params: {
            category: locale === 'en' ? enCatSlug : viCatSlug,
            slug: locale === 'en' ? enProductSlug : viProductSlug,
          },
        },
        locale: locale as any,
      });
    }

    return (
      <main>
        <Banner banner={{
          image: { url: formatImageUrl(bannerResp.data[0]?.image) || '/images/demo/banner-product.jpg', alt: 'banner product' },
          image_mobile: { url: formatImageUrl(bannerResp.data[0]?.image_mobile) || formatImageUrl(bannerResp.data[0]?.image) || '/images/demo/banner-product.jpg', alt: 'banner product' }
        }} />
        <ProductIndexPage
          category={categorySlug}
          selectedIngredients={[]}
          products={[]}
          categories={categories}
          ingredients={ingredients}
          locale={locale}
          pagination={{ currentPage: 1, lastPage: 1, total: 0 }}
        />
      </main>
    )
  }

  if (selectedIngredientsSlugs.length === 0) {
    // Fetch products using canonical DB category slug or category ID
    const dbCategorySlug = (targetCategory as any)?.original_slug || targetCategory?.slug || canonicalCategorySlug;
    const productsData = await getApi<Product>('products', {
      params: {
        lang: locale,
        per_page: 12,
        page: page,
        ...(categoryId ? { category_id: categoryId } : { category_slug: dbCategorySlug }),
        ingredients: ''
      }
    }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }));

    productsResp = productsData;
  } else {
    // Map ingredient slugs to IDs for the products API call
    const ingredientIds = Array.from(
      new Set(
        selectedIngredientsSlugs
          .map(slug => {
            const normSlug = slugify(slug) || slug;
            const ing = ingredients.find(item => getIngredientAliases(item).includes(normSlug));
            return ing?.id;
          })
          .filter(Boolean)
      )
    ).join(',')

    const { getProductCatalog } = await import('@/services/productService');
    const fullCatalog = await getProductCatalog(locale);

    let filteredList = fullCatalog;
    if (categorySlug) {
      filteredList = filteredList.filter(p => {
        if (categoryId && (
          p.categories?.some(c => String(c.id) === String(categoryId)) ||
          (p.category && String(p.category.id) === String(categoryId))
        )) {
          return true;
        }
        const productCat = p.categories && p.categories.length > 0 ? p.categories[0] : p.category;
        const allSlugs = p.categories && p.categories.length > 0
          ? p.categories.flatMap(cat => getCategoryCandidateSlugs(cat))
          : getCategoryCandidateSlugs(productCat);
        
        return (
          allSlugs.includes(canonicalCategorySlug) ||
          allSlugs.includes(categorySlug) ||
          allSlugs.includes(viCategorySlug) ||
          allSlugs.includes(enCategorySlug)
        );
      });
    }
    if (ingredientIds) {
      const idArr = ingredientIds.split(',');
      filteredList = filteredList.filter(p => 
        idArr.some(id => p.ingredients?.some(ing => String(ing.id) === String(id)))
      );
    }

    const perPage = 12;
    const currPage = parseInt(page, 10) || 1;
    const total = filteredList.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const start = (currPage - 1) * perPage;
    const pageData = filteredList.slice(start, start + perPage);

    productsResp = {
      data: pageData,
      current_page: currPage,
      last_page: lastPage,
      total: total
    };
  }

  const bannerItem = bannerResp.data[0];
  const banner = {
    image: {
      url: formatImageUrl(bannerItem?.image) || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    },
    image_mobile: {
      url: formatImageUrl(bannerItem?.image_mobile) || formatImageUrl(bannerItem?.image) || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    }
  }

  return (
    <main>
      <AlternateLinksUpdater
        alternateLinks={{
          vi: `/san-pham/${viCategorySlug}`,
          en: `/en/product/${enCategorySlug}`,
        }}
      />
      <Banner banner={banner} />
      <ProductIndexPage
        category={canonicalCategorySlug}
        selectedIngredients={selectedIngredientsSlugs}
        products={productsResp.data}
        categories={categories}
        ingredients={ingredients}
        locale={locale}
        pagination={{
          currentPage: productsResp.current_page || 1,
          lastPage: productsResp.last_page || 1,
          total: productsResp.total || 0,
        }}
      />
    </main>
  )
}
