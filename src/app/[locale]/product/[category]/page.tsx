import ProductIndexPage from '@/components/Product/ProductIndexPage'
import { getApi } from '@/services/apiService'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { HeroBanner } from '@/services/heroBannerService'
import Banner from '@/components/Banner'
import { slugify } from '@/lib/format'

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

  if (selectedIngredientsSlugs.length === 0) {
    // 100% Parallel fetch on initial load using category_slug directly
    [categoriesResp, ingredientsResp, bannerResp, productsResp] = await Promise.all([
      categoriesPromise,
      ingredientsPromise,
      bannerPromise,
      getApi<Product>('products', {
        params: {
          lang: locale,
          per_page: 9,
          page: page,
          category_slug: categorySlug,
          ingredients: ''
        }
      }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }))
    ]);
  } else {
    // Fetch lookup metadata first, then products
    [categoriesResp, ingredientsResp, bannerResp] = await Promise.all([
      categoriesPromise,
      ingredientsPromise,
      bannerPromise
    ]);
  }

  const categories = categoriesResp.data;
  const ingredients = ingredientsResp.data;

  // Helper to translate and slugify for matching - Consistent with ProductIndexPage
  const findCategoryIdBySlug = (categories: Category[], slug: string, lang: string) => {
    return categories.find(cat => {
      const translation = cat.translations?.find(t => t.locale === lang) ||
        cat.translations?.find(t => t.locale.startsWith(lang))
      const title = translation?.title || cat.title || ''
      const categorySlug = lang === 'vi' ? (cat.slug || slugify(title)) : slugify(title)
      return categorySlug === slug
    })?.id
  }

  // 1. Resolve category ID from slug
  const categoryId = findCategoryIdBySlug(categories, categorySlug, locale)

  // If category is provided in URL but not found in API, return 0 products
  if (categorySlug && !categoryId) {
    return (
      <main>
        <Banner banner={{
          image: { url: bannerResp.data[0]?.image || '/images/demo/banner-product.jpg', alt: 'banner product' },
          image_mobile: { url: bannerResp.data[0]?.image_mobile || bannerResp.data[0]?.image || '/images/demo/banner-product.jpg', alt: 'banner product' }
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

  if (selectedIngredientsSlugs.length > 0) {
    // Map ingredient slugs to IDs for the products API call
    const ingredientIds = selectedIngredientsSlugs
      .map(slug => {
        const ing = ingredients.find(ing => {
          const translation = ing.translations?.find((t: any) => t.locale === locale) ||
            ing.translations?.find((t: any) => t.locale.startsWith(locale))
          const name = translation?.name || ing.name
          return slugify(name) === slug
        })
        return ing?.id
      })
      .filter(Boolean)
      .join(',')

    // 2. Call API products with the resolved category_id and mapped ingredientIds
    productsResp = await getApi<Product>('products', {
      params: {
        lang: locale,
        per_page: 9,
        page: page,
        ingredients: ingredientIds,
        category_id: categoryId || ''
      }
    }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }));
  }

  const bannerItem = bannerResp.data[0];
  const banner = {
    image: {
      url: bannerItem?.image || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    },
    image_mobile: {
      url: bannerItem?.image_mobile || bannerItem?.image || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    }
  }

  return (
    <main>
      <Banner banner={banner} />
      <ProductIndexPage
        category={categorySlug}
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
