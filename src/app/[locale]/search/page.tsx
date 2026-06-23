import { getApi } from "@/services/apiService";
import { getProductCatalog } from "@/services/productService";
import { HeroBanner } from "@/services/heroBannerService";
import SearchResultPage from "@/components/Search/SearchResultPage";

interface Props {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", page = "1" } = await searchParams;
  const query = q.trim().toLowerCase();

  const [catalog] = await Promise.all([
    query
      ? getProductCatalog(locale, { revalidate: 0 }).catch(() => [])
      : Promise.resolve([]),
    getApi<HeroBanner>("banners", {
      params: { position: "banner_product", lang: locale },
    }).catch(() => ({ data: [] })),
  ]);

  const allMatched = query
    ? catalog.filter((p) => {
        const name = p.name.toLowerCase();
        const slug = (p.slug || "").toLowerCase();
        return name.includes(query) || slug.includes(query);
      })
    : [];

  const perPage = 9;
  const currentPage = Number(page);
  const total = allMatched.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (currentPage - 1) * perPage;
  const pageItems = allMatched.slice(start, start + perPage);

  return (
    <main>
      <SearchResultPage
        query={q}
        products={pageItems}
        locale={locale}
        pagination={{
          currentPage,
          lastPage,
          total,
        }}
      />
    </main>
  );
}
