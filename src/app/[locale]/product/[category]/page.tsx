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

  // 1. Fetch categories, ingredients, and banners in parallel for step 1
  const [categoriesResp, ingredientsResp, bannerResp] = await Promise.all([
    getApi<Category>('categories', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<Ingredient>('ingredients', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<HeroBanner>('banners', { params: { position: 'banner_product', lang: locale } }).catch(() => ({ data: [] }))
  ]);

  const categories = categoriesResp.data;
  const ingredients = ingredientsResp.data;

  // Helper to translate and slugify for matching - Consistent with ProductIndexPage
  const findCategoryIdBySlug = (categories: Category[], slug: string, lang: string) => {
    return categories.find(cat => {
      const translation = cat.translations?.find(t => t.locale === lang) ||
        cat.translations?.find(t => t.locale.startsWith(lang))
      const title = translation?.title || cat.title || ''
      return slugify(title) === slug
    })?.id
  }

  // 1. Resolve category ID from slug
  const categoryId = findCategoryIdBySlug(categories, categorySlug, locale)

  // If category is provided in URL but not found in API, return 0 products
  if (categorySlug && !categoryId) {
    return (
      <main>
        <Banner banner={{ image: { url: bannerResp.data[0]?.image || '/images/demo/banner-product.jpg', alt: 'banner product' } }} />
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

  // Map ingredient slugs to IDs for the products API call
  const selectedIngredientsSlugs = ingredientsParam ? ingredientsParam.split(',').filter(Boolean) : []
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
  const productsResp = await getApi<Product>('products', {
    params: {
      lang: locale,
      per_page: 9,
      page: page,
      ingredients: ingredientIds,
      category_id: categoryId || ''
    }
  }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }));

  const bannerItem = bannerResp.data[0];
  const banner = {
    image: {
      url: bannerItem?.image || '/images/demo/banner-product.jpg',
      alt: bannerItem?.title || 'banner product'
    },
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
