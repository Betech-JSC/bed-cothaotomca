import ProductIndexPage from '@/components/Product/ProductIndexPage'

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
  const { category } = await params
  const { ingredients } = await searchParams

  const selectedCategory = category || null
  const selectedIngredients = ingredients ? ingredients.split(',').filter(Boolean) : []

  return (
    <ProductIndexPage
      category={selectedCategory}
      selectedIngredients={selectedIngredients}
    />
  )
}
