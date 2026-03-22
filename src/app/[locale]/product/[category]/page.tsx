import ProductIndexPage from '@/components/Product/ProductIndexPage'
import { getApi } from '@/services/apiService'
import { Product } from '@/services/productService'
import { Category } from '@/services/categoryService'
import { Ingredient } from '@/services/ingredientService'
import { HeroBanner } from '@/services/heroBannerService'
import Banner from '@/components/Banner'

interface Props {
  params: Promise<{
    locale: string
    category: string
  }>
  searchParams: Promise<{
    ingredients?: string
  }>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category } = await params
  const { ingredients: ingredientsParam } = await searchParams

  const [ingredientsData, categoriesData, productsData, bannerData] = await Promise.all([
    getApi<Ingredient>('ingredients', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<Category>('categories', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<Product>('products', { params: { lang: locale, per_page: 12 } }).catch(() => ({ data: [] })),
    getApi<HeroBanner>('banners', { params: { position: 'banner_product', lang: locale } }).catch(() => ({ data: [] }))
  ]);

  const selectedCategory = category || null
  const selectedIngredients = ingredientsParam ? ingredientsParam.split(',').filter(Boolean) : []

  const bannerItem = bannerData.data[0];
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
        category={selectedCategory}
        selectedIngredients={selectedIngredients}
        products={productsData.data}
        categories={categoriesData.data}
        ingredients={ingredientsData.data}
        locale={locale}
      />
    </main>
  )
}
