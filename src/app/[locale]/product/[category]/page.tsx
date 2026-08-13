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

  // 1. Fetch metadata first (categories, ingredients, banner)
  [categoriesResp, ingredientsResp, bannerResp] = await Promise.all([
    categoriesPromise,
    ingredientsPromise,
    bannerPromise,
  ]);

  const categories = categoriesResp.data;
  const ingredients = ingredientsResp.data;

  // Helper to find category by DB slug or translated title slug
  const findCategory = (categories: Category[], slug: string, lang: string) => {
    return categories.find(cat => {
      // 1. Direct DB slug match
      if (cat.slug === slug) return true;

      // 2. Translated title slug match for current language
      const translation = cat.translations?.find((t: any) => t.locale === lang) ||
        cat.translations?.find((t: any) => t.locale.startsWith(lang));
      const title = translation?.title || cat.title || '';
      if (slugify(title) === slug) return true;

      // 3. Fallback check across any translation title
      if (cat.translations?.some((t: any) => slugify(t.title) === slug)) return true;

      return false;
    });
  };

  const targetCategory = findCategory(categories, categorySlug, locale);
  const categoryId = targetCategory?.id;
  // Use canonical DB slug if target category found, fallback to categorySlug
  const canonicalCategorySlug = targetCategory?.slug || (targetCategory ? slugify(targetCategory.title) : categorySlug);

  // If category is provided in URL but not found in API, return 0 products
  if (categorySlug && !targetCategory) {
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

  if (selectedIngredientsSlugs.length === 0) {
    // Fetch products using canonical DB category slug
    const productsData = await getApi<Product>('products', {
      params: {
        lang: locale,
        per_page: 9,
        page: page,
        category_slug: canonicalCategorySlug,
        ingredients: ''
      }
    }).catch(() => ({ data: [], last_page: 1, current_page: 1, total: 0 }));

    productsResp = productsData;
  } else {
    // Map ingredient slugs to IDs for the products API call
    const ingredientIds = selectedIngredientsSlugs
      .map(slug => {
        const ing = ingredients.find(ing => {
          const translation = ing.translations?.find((t: any) => t.locale === locale) ||
            ing.translations?.find((t: any) => t.locale.startsWith(locale))
          const name = translation?.name || ing.name
          if (slugify(name) === slug) return true
          if (slugify(ing.name) === slug) return true
          if (ing.translations?.some((t: any) => slugify(t.name) === slug)) return true
          return false
        })
        return ing?.id
      })
      .filter(Boolean)
      .join(',')

    const { getProductCatalog } = await import('@/services/productService');
    const fullCatalog = await getProductCatalog(locale);

    let filteredList = fullCatalog;
    if (categorySlug) {
      filteredList = filteredList.filter(p => {
        const productCat = p.categories && p.categories.length > 0 ? p.categories[0] : p.category;
        const catTrans = productCat?.translations?.find((t: any) => t.locale === locale) ||
                         productCat?.translations?.find((t: any) => t.locale?.startsWith(locale));
        const catTitle = catTrans?.title || productCat?.title || '';
        const pCatSlug = productCat?.slug || slugify(catTitle);
        
        const allSlugs = p.categories && p.categories.length > 0
          ? p.categories.flatMap(cat => {
              const trans = cat.translations?.find((t: any) => t.locale === locale) ||
                            cat.translations?.find((t: any) => t.locale?.startsWith(locale));
              const title = trans?.title || cat.title || '';
              const slugs = [];
              if (cat.slug) slugs.push(cat.slug);
              if (title) slugs.push(slugify(title));
              return slugs;
            })
          : [pCatSlug];
        
        return allSlugs.includes(canonicalCategorySlug) || allSlugs.includes(categorySlug);
      });
    }
    if (ingredientIds) {
      const idArr = ingredientIds.split(',');
      filteredList = filteredList.filter(p => 
        idArr.some(id => p.ingredients?.some(ing => String(ing.id) === String(id)))
      );
    }

    const perPage = 9;
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
