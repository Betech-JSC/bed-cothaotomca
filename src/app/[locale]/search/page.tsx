import { getApi } from '@/services/apiService'
import { Product } from '@/services/productService'
import { getBlogs, Blog } from '@/services/blogService'
import { getPolicies, Policy } from '@/services/policyService'
import SearchResultPage from '@/components/Search/SearchResultPage'

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
