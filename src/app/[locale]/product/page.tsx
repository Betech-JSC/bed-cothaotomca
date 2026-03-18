import Banner from '@/components/Banner'
import ProductIndexPage from '@/components/Product/ProductIndexPage'

interface Props {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    ingredients?: string
  }>
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { ingredients } = await searchParams

  const selectedIngredients = ingredients ? ingredients.split(',').filter(Boolean) : []

  const banner = {
    image: { url: '/images/demo/banner-product.jpg', alt: 'banner product' },
  }

  return (
    <main>
      <Banner banner={banner} />
      <ProductIndexPage
        category={null}
        selectedIngredients={selectedIngredients}
      />
    </main>
  )
}
