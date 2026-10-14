import { slugify } from "@/lib/format";

export function getProductLocalizedSlugs(product: any) {
  const cat = product?.categories && product.categories.length > 0 ? product.categories[0] : product?.category;
  const viCatTrans = cat?.translations?.find((t: any) => t.locale === 'vi');
  const enCatTrans = cat?.translations?.find((t: any) => t.locale === 'en');
  const viProdTrans = product?.translations?.find((t: any) => t.locale === 'vi');
  const enProdTrans = product?.translations?.find((t: any) => t.locale === 'en');

  const fallbackViCatSlug = cat?.slug || slugify(viCatTrans?.title || cat?.title || "san-pham") || "san-pham";
  const fallbackViProductSlug = (viProdTrans as any)?.slug || product?.slug || slugify(viProdTrans?.custom_name || viProdTrans?.name || product?.custom_name || product?.name || "");
  const fallbackEnCatSlug = (enCatTrans as any)?.slug || slugify(enCatTrans?.title || "") || fallbackViCatSlug || "product";
  const fallbackEnProductSlug = (enProdTrans as any)?.slug || slugify(enProdTrans?.custom_name || enProdTrans?.name || "") || fallbackViProductSlug || "";

  if (product?.alternate_slugs) {
    const alt = product.alternate_slugs;
    return {
      viCatSlug: alt.vi?.category_slug || fallbackViCatSlug,
      viProductSlug: alt.vi?.slug || fallbackViProductSlug,
      enCatSlug: alt.en?.category_slug || fallbackEnCatSlug,
      enProductSlug: alt.en?.slug || fallbackEnProductSlug,
    };
  }

  return {
    viCatSlug: fallbackViCatSlug,
    viProductSlug: fallbackViProductSlug,
    enCatSlug: fallbackEnCatSlug,
    enProductSlug: fallbackEnProductSlug,
  };
}
