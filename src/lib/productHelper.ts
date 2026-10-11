import { slugify } from "@/lib/format";

export function getProductLocalizedSlugs(product: any) {
  if (product?.alternate_slugs) {
    const alt = product.alternate_slugs;
    return {
      viCatSlug: alt.vi?.category_slug || "san-pham",
      viProductSlug: alt.vi?.slug || product?.slug || "",
      enCatSlug: alt.en?.category_slug || alt.vi?.category_slug || "product",
      enProductSlug: alt.en?.slug || alt.vi?.slug || product?.slug || "",
    };
  }

  const cat = product?.categories && product.categories.length > 0 ? product.categories[0] : product?.category;

  // VI Category & Product
  const viCatTrans = cat?.translations?.find((t: any) => t.locale === 'vi');
  const viCatSlug = cat?.slug || slugify(viCatTrans?.title || cat?.title || "san-pham") || "san-pham";

  const viProdTrans = product?.translations?.find((t: any) => t.locale === 'vi');
  const viProductSlug = (viProdTrans as any)?.slug || product?.slug || slugify(viProdTrans?.custom_name || viProdTrans?.name || product?.custom_name || product?.name || "");

  // EN Category & Product
  const enCatTrans = cat?.translations?.find((t: any) => t.locale === 'en');
  const enCatSlug = (enCatTrans as any)?.slug || slugify(enCatTrans?.title || "") || cat?.slug || "product";

  const enProdTrans = product?.translations?.find((t: any) => t.locale === 'en');
  const enProductSlug = (enProdTrans as any)?.slug || product?.slug || "";

  return {
    viCatSlug,
    viProductSlug,
    enCatSlug,
    enProductSlug,
  };
}
