import { getApi } from '@/services/apiService'
import { Product } from '@/services/productService'
import { HeroBanner } from '@/services/heroBannerService'
import SearchResultPage from '@/components/Search/SearchResultPage'

interface Props {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q = '', page = '1' } = await searchParams

  const [productsResp, bannerResp] = await Promise.all([
    q
      ? getApi<Product>('products', {
        params: {
          lang: locale,
          per_page: 9,
          page: page,
          search: q
        },
        revalidate: 0
      }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }))
      : Promise.resolve({ data: [] as Product[], last_page: 1, current_page: 1, total: 0 }),
    getApi<HeroBanner>('banners', { params: { position: 'banner_product', lang: locale } }).catch(() => ({ data: [] }))
  ])

  return (
    <main>
      <SearchResultPage
        query={q}
        products={productsResp.data}
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
