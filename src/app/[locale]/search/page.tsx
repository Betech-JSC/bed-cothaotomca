import { getApi } from '@/services/apiService'
import { Product } from '@/services/productService'
import { getBlogs, Blog } from '@/services/blogService'
import { getPolicies, Policy } from '@/services/policyService'
import SearchResultPage from '@/components/Search/SearchResultPage'
import { Metadata } from 'next'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { q = '' } = await searchParams
  const isEn = locale === 'en'

  const title = isEn
    ? (q ? `Search results: "${q}" | Co Thao Tom Ca` : 'Search | Co Thao Tom Ca')
    : (q ? `Kết quả tìm kiếm: "${q}" | Cô Thảo Tôm Cá` : 'Tìm kiếm | Cô Thảo Tôm Cá')
  const description = isEn
    ? (q ? `Search results for "${q}" on Co Thao Tom Ca` : 'Search products, blog articles and policies on Co Thao Tom Ca')
    : (q ? `Kết quả tìm kiếm cho "${q}" trên Cô Thảo Tôm Cá` : 'Tìm kiếm sản phẩm, tin tức và chính sách tại Cô Thảo Tôm Cá')

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')

  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `${baseUrl}/${locale}/search`,
    },
  }
}

interface Props {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    q?: string
    page?: string
    blog_page?: string
    tab?: string
  }>
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q = '', page = '1', blog_page = '1', tab = 'products' } = await searchParams

  const [productsResp, blogsResp, policiesResp] = await Promise.all([
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
    q
      ? getBlogs({
        lang: locale,
        per_page: 6,
        page: parseInt(blog_page, 10) || 1,
        search: q
      }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }))
      : Promise.resolve({ data: [] as Blog[], last_page: 1, current_page: 1, total: 0 }),
    q
      ? getPolicies({
        lang: locale,
        search: q
      }).catch(() => ({ data: [] as Policy[] }))
      : Promise.resolve({ data: [] as Policy[] })
  ])

  return (
    <main>
      <SearchResultPage
        query={q}
        products={productsResp.data || []}
        blogs={blogsResp.data || []}
        policies={policiesResp.data || []}
        initialTab={tab}
        locale={locale}
        productPagination={{
          currentPage: productsResp.current_page || 1,
          lastPage: productsResp.last_page || 1,
          total: productsResp.total || 0,
        }}
        blogPagination={{
          currentPage: blogsResp.current_page || 1,
          lastPage: blogsResp.last_page || 1,
          total: blogsResp.total || 0,
        }}
      />
    </main>
  )
}
