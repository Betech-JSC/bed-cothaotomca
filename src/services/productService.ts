import { getApi, getSingleApi } from "./apiService";
import { slugify, getTranslation } from "@/lib/format";
import type { Ingredient } from "./ingredientService";

export interface Translation {
  id: number;
  locale: string;
  name: string;
  custom_name?: string;
  description: string;
  product_id: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface ProductVariant {
  size?: string;
  size_en?: string;
  price?: string | number;
  stock?: number;
}

export interface ProductImage {
  id: number;
  product_id?: number;
  image: string;
  sort_order?: number;
}

export interface ProductSection {
  id: number;
  title: string;
  content: string;
}

export interface Product {
  id: number;
  slug?: string;
  name: string;
  custom_name?: string;
  description: string;
  price: string;
  image: string | null;
  is_best_seller: boolean;
  ingredients: Ingredient[];
  translations: Translation[];
  category?: {
    id: number;
    title: string;
    slug?: string;
    translations: any[];
  };
  categories?: {
    id: number;
    title: string;
    slug?: string;
    translations?: any[];
  }[];
  created_at: string;
  variant_type?: string | null;
  variants?: ProductVariant[];
  gallery?: string[];
  images?: ProductImage[];
  sections?: ProductSection[];
  related_products?: Product[];
  code?: string;
  unit?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

/** Props cho ProductDetailsInfo — map từ GET /products/slug/{slug} */
export interface ProductDetailView {
  title: string;
  description: string;
  variant_type?: string | null;
  code?: string;
  unit?: string;
  images: { url: string; alt: string }[];
  sizes: { title: string; price: number }[];
  infos: { title: string; content: string }[];
  category: { title: string; slug: string };
  checkout: {
    productId: number;
    productCode: string;
    slug: string;
    categorySlug: string;
  };
}

export interface ProductListResponse {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page?: number;
  total: number;
}

export interface GetProductsParams {
  page?: number;
  per_page?: number;
  lang?: string;
  search?: string;
  pageSize?: number;
  currentItem?: number;
  revalidate?: number;
  /** Gom nhiều request BE rồi phân trang FE */
  catalog?: boolean;
}

/** Chuẩn hóa item list từ GET /api/products */
export function normalizeProduct(item: Product): Product {
  return {
    ...item,
    slug: item.slug || slugify(item.name),
    image: item.image || "",
    price: String(item.price ?? "0"),
    description: item.description || "",
    ingredients: item.ingredients || [],
    translations: item.translations || [],
    is_best_seller: item.is_best_seller ?? false,
    created_at: item.created_at || new Date().toISOString(),
    variant_type: item.variant_type ?? null,
    variants: item.variants ?? [],
    gallery: item.gallery ?? [],
    images: item.images ?? [],
    sections: item.sections ?? [],
    related_products: item.related_products ?? [],
  };
}

/** Chuẩn hóa detail từ GET /api/products/slug/{slug} */
export function normalizeProductDetail(item: Product): Product {
  const base = normalizeProduct(item);
  const variants = (item.variants ?? []).map((v) => ({
    size: v.size,
    size_en: v.size_en ?? v.size,
    price: String(v.price ?? base.price),
    stock: v.stock ?? 0,
  }));

  const images = (item.images ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return {
    ...base,
    images,
    gallery: item.gallery ?? images.map((img) => img.image).filter(Boolean),
    variants: variants.length > 0 ? variants : undefined,
    variant_type:
      item.variant_type ?? (variants.length > 1 ? "size" : null),
    sections: item.sections ?? [],
    code: item.code,
    unit: item.unit,
    related_products: item.related_products ?? [],
  };
}

/** Map Product detail → productData cho [slug]/page.tsx & ProductDetailsInfo */
export function mapProductToDetailView(
  product: Product,
  locale: string,
  labels: { standard: string },
): ProductDetailView {
  const translation = getTranslation(product.translations, locale) as
    | Translation
    | undefined;
  const name = translation?.custom_name || product.custom_name || translation?.name || product.name;
  const description =
    translation?.description || product.description || "";

  const unitPrice = parseFloat(String(product.price)) || 0;
  const categoryTitle = product.category?.title || "Sản phẩm";
  const categorySlug =
    product.category?.slug || slugify(categoryTitle) || "san-pham";

  const sortedImages = (product.images ?? []).slice().sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  const images: { url: string; alt: string }[] =
    sortedImages.length > 0
      ? sortedImages.map((img, idx) => ({
          url: img.image || "/cover.jpg",
          alt: `${name} ${idx + 1}`,
        }))
      : (product.gallery ?? [])
          .filter(Boolean)
          .map((url, idx) => ({
            url,
            alt: `${name} ${idx + 1}`,
          }));

  if (images.length === 0) {
    images.push({ url: product.image || "/cover.jpg", alt: name });
  }

  const variants = product.variants ?? [];
  const sizes =
    variants.length > 0
      ? variants.map((v) => {
          const title =
            locale === "en"
              ? v.size_en || v.size || labels.standard
              : v.size || v.size_en || labels.standard;
          return {
            title: title || labels.standard,
            price: parseFloat(String(v.price)) || unitPrice,
          };
        })
      : [{ title: labels.standard, price: unitPrice }];

  const infos = (product.sections ?? []).map((section) => ({
    title: section.title,
    content: section.content,
  }));

  return {
    title: name,
    description,
    variant_type: product.variant_type,
    code: product.code,
    unit: product.unit,
    images,
    sizes,
    infos,
    category: { title: categoryTitle, slug: categorySlug },
    checkout: {
      productId: product.id,
      productCode: product.code || String(product.id),
      slug: product.slug || slugify(name),
      categorySlug,
    },
  };
}

/** Map Product → props CardProduct / SectionHotProduct */
export function mapProductToCardItem(
  item: Product,
  locale: string,
): {
  id: number;
  title: string;
  slug: string;
  price: number;
  category: { title: string; id: string; slug: string };
  allCategorySlugs: string[];
  ingredientIds: string[];
  variants?: any[];
  image: { url: string; alt: string };
  description: string;
  created_at: string;
} {
  const translation = getTranslation(item.translations, locale) as Translation | undefined;
  const name = translation?.custom_name || item.custom_name || translation?.name || item.name;
  const productCategory = item.category;
  const catTranslation = getTranslation(
    productCategory?.translations,
    locale,
  ) as { title?: string } | undefined;
  const categoryName = catTranslation?.title || productCategory?.title || "";
  const categorySlug =
    productCategory?.slug || slugify(categoryName) || "san-pham";

  return {
    id: item.id,
    title: name,
    slug: item.slug || slugify(name),
    price: parseFloat(String(item.price)) || 0,
    category: {
      id: String(productCategory?.id ?? ""),
      title: categoryName,
      slug: categorySlug,
    },
    allCategorySlugs: [categorySlug],
    ingredientIds: (item.ingredients || []).map((ing) => String(ing.id)),
    variants: item.variants,
    image: {
      url: item.image || "/cover.jpg",
      alt: name,
    },
    description: translation?.description || item.description || "",
    created_at: item.created_at,
  };
}

/**
 * Gom toàn bộ SP từ BE (KiotViet trả rất ít item mỗi request `page` — không đủ 1 trang UI).
 * Lặp `page` + `per_page` đến khi hết batch.
 */
export async function getProductCatalog(
  lang?: string,
  options: { revalidate?: number } = {},
): Promise<Product[]> {
  const byId = new Map<number, Product>();
  const chunkSize = 20;
  let page = 1;

  for (let i = 0; i < 40; i++) {
    const apiParams: Record<string, string | number> = {
      page,
      per_page: chunkSize,
    };
    if (lang) apiParams.lang = lang;

    const result = await getApi<Product>("products", {
      params: apiParams,
      revalidate: options.revalidate ?? 300,
    });

    const batch = (result.data || []).map(normalizeProduct);
    if (batch.length === 0) break;

    batch.forEach((p) => byId.set(p.id, p));
    const reportedTotal = result.total ?? 0;
    page += 1;

    if (reportedTotal > 0 && byId.size >= reportedTotal) break;
    if (batch.length < 1) break;
  }

  return Array.from(byId.values());
}

export const getProducts = async (
  params: GetProductsParams = {},
): Promise<ProductListResponse> => {
  const { revalidate, search, catalog, ...query } = params;
  const perPage = query.per_page ?? 9;
  const page = query.page ?? 1;

  if (catalog || search) {
    const all = await getProductCatalog(query.lang, { revalidate });
    let list = all;
    if (search) {
      const q = search.trim().toLowerCase();
      list = all.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.slug || "").toLowerCase().includes(q),
      );
    }
    const start = (page - 1) * perPage;
    const data = list.slice(start, start + perPage);
    const lastPage = Math.max(1, Math.ceil(list.length / perPage));
    return {
      data,
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total: list.length,
    };
  }

  const apiParams: Record<string, string | number | boolean> = {};
  if (query.lang) apiParams.lang = query.lang;
  apiParams.page = page;
  apiParams.per_page = perPage;
  if (query.pageSize != null) apiParams.pageSize = query.pageSize;
  if (query.currentItem != null) apiParams.currentItem = query.currentItem;

  const result = await getApi<Product>("products", {
    params: apiParams,
    revalidate: revalidate ?? 300,
  });

  const data = (result.data || []).map(normalizeProduct);

  // BE thường trả 1–3 item dù per_page=9 → gom catalog rồi cắt trang
  if (data.length < perPage && (result.total ?? 0) > data.length) {
    return getProducts({ ...params, catalog: true, page, per_page: perPage });
  }

  return {
    data,
    current_page: result.current_page ?? page,
    last_page: result.last_page ?? 1,
    per_page: result.per_page ?? perPage,
    total: result.total ?? data.length,
  };
};

export const getProductBySlug = async (
  slug: string,
  options: { revalidate?: number; lang?: string } = {},
): Promise<Product | null> => {
  try {
    const { lang, ...restOptions } = options;
    const params = lang ? { lang } : undefined;
    const response = await getSingleApi<Product>(`products/slug/${slug}`, {
      ...restOptions,
      params,
    });
    return response.data ? normalizeProductDetail(response.data) : null;
  } catch (error) {
    console.warn(`Product slug API failed for ${slug}:`, error);
    return null;
  }
};

/** GET /products/slug/{slug} → fallback quét catalog nếu slug API lỗi */
export const getProductBySlugWithFallback = async (
  slug: string,
  options: { revalidate?: number; lang?: string } = {},
): Promise<Product | null> => {
  try {
    const product = await getProductBySlug(slug, options);
    if (product) return product;

    const { lang } = options;
    const products = await getProductCatalog(lang, {
      revalidate: options.revalidate,
    });

    const esc = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`^${esc(slug)}(?:-\\d+)?$`);

    const match = products.find((p) => {
      if (p.slug && regex.test(p.slug)) return true;
      if (lang) {
        const translation = getTranslation(p.translations, lang);
        const translatedName = (translation as Translation | undefined)?.name || p.name;
        if (slugify(translatedName) === slug) return true;
      }
      return slugify(p.name) === slug;
    });

    if (match) {
      return match;
    }

    return null;
  } catch (error) {
    console.warn(`Product fallback failed for slug ${slug}:`, error);
    return null;
  }
};
