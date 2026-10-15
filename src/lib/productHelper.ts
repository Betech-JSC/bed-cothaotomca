import { slugify } from "@/lib/format";

export function getProductLocalizedSlugs(product: any) {
  const cat = product?.categories && product.categories.length > 0 ? product.categories[0] : product?.category;
  const viCatTrans = cat?.translations?.find((t: any) => t.locale === 'vi');
  const enCatTrans = cat?.translations?.find((t: any) => t.locale === 'en');
  const viProdTrans = product?.translations?.find((t: any) => t.locale === 'vi');
  const enProdTrans = product?.translations?.find((t: any) => t.locale === 'en');

  const fallbackViCatSlug =
    cat?.original_slug ||
    cat?.slug_vi ||
    (viCatTrans as any)?.slug ||
    cat?.slug ||
    slugify(viCatTrans?.title || cat?.vi_title || cat?.title || "san-pham") ||
    "san-pham";
  const fallbackViProductSlug =
    product?.original_slug ||
    product?.slug_vi ||
    (viProdTrans as any)?.slug ||
    product?.slug ||
    slugify(viProdTrans?.custom_name || viProdTrans?.name || product?.custom_name || product?.name || "");
  const fallbackEnCatSlug =
    (enCatTrans as any)?.slug ||
    cat?.slug_en ||
    slugify(enCatTrans?.title || cat?.en_title || "") ||
    translateCategorySlug(fallbackViCatSlug, "en") ||
    fallbackViCatSlug ||
    "product";
  const fallbackEnProductSlug =
    (enProdTrans as any)?.slug ||
    product?.slug_en ||
    slugify(enProdTrans?.custom_name || enProdTrans?.name || product?.custom_name_en || product?.name_en || "") ||
    fallbackViProductSlug ||
    "";

  if (product?.alternate_slugs) {
    const alt = product.alternate_slugs;
    const resolvedViCatSlug = alt.vi?.category_slug || fallbackViCatSlug;
    const resolvedViProductSlug = alt.vi?.slug || fallbackViProductSlug;
    return {
      viCatSlug: resolvedViCatSlug,
      viProductSlug: resolvedViProductSlug,
      enCatSlug:
        alt.en?.category_slug ||
        (enCatTrans as any)?.slug ||
        cat?.slug_en ||
        slugify(enCatTrans?.title || cat?.en_title || "") ||
        translateCategorySlug(resolvedViCatSlug, "en") ||
        resolvedViCatSlug ||
        "product",
      enProductSlug:
        alt.en?.slug ||
        (enProdTrans as any)?.slug ||
        product?.slug_en ||
        slugify(enProdTrans?.custom_name || enProdTrans?.name || product?.custom_name_en || product?.name_en || "") ||
        resolvedViProductSlug ||
        "",
    };
  }

  return {
    viCatSlug: fallbackViCatSlug,
    viProductSlug: fallbackViProductSlug,
    enCatSlug: fallbackEnCatSlug,
    enProductSlug: fallbackEnProductSlug,
  };
}

export const CATEGORY_BILINGUAL_PAIRS: Array<{ vi: string; en: string; extra?: string[] }> = [
  { vi: "tom", en: "shrimp", extra: ["shrimps"] },
  { vi: "ca-hai-san", en: "fish-seafood", extra: ["fish-and-seafood", "seafood"] },
  { vi: "cha-ram", en: "spring-rolls", extra: ["spring-roll", "fried-spring-rolls"] },
  { vi: "khac", en: "others", extra: ["other"] },
  { vi: "ca-hoi", en: "salmon" },
  { vi: "cua", en: "crab", extra: ["crabs"] },
  { vi: "so-diep", en: "scallop", extra: ["scallops"] },
  { vi: "mon-ngam-tuong", en: "soy-marinated", extra: ["soy-marinated-seafood"] },
  { vi: "gia-vi-do-an-kem", en: "condiments-side-dishes", extra: ["side-dishes"] },
  { vi: "combo", en: "combo" },
  { vi: "sashimi", en: "sashimi" },
];

export const INGREDIENT_BILINGUAL_PAIRS: Array<{ vi: string; en: string; extra?: string[] }> = [
  { vi: "ca-hoi", en: "salmon" },
  { vi: "tom", en: "shrimp", extra: ["shrimps"] },
  { vi: "cua", en: "crab", extra: ["crabs"] },
  { vi: "so-diep", en: "scallop", extra: ["scallops"] },
  { vi: "trung-ca-hoi", en: "salmon-roe", extra: ["ikura"] },
  { vi: "ca-trich", en: "herring" },
  { vi: "luon", en: "eel" },
  { vi: "bach-tuoc", en: "octopus", extra: ["bachtuoc"] },
  { vi: "muc", en: "squid" },
  { vi: "ca-ngu", en: "tuna" },
  { vi: "hau", en: "oyster", extra: ["oysters"] },
  { vi: "ngheu", en: "clam", extra: ["clams"] },
  { vi: "oc", en: "snail", extra: ["snails"] },
  { vi: "bo", en: "beef" },
  { vi: "heo", en: "pork" },
  { vi: "ga", en: "chicken" },
  { vi: "pho-mai", en: "cheese" },
  { vi: "rong-bien", en: "seaweed" },
  { vi: "nam", en: "mushroom", extra: ["mushrooms"] },
  { vi: "trung", en: "egg", extra: ["eggs"] },
  { vi: "com-nhat", en: "japanese-rice" },
];

export function getBilingualPairAliases(
  slug: string,
  pairs: Array<{ vi: string; en: string; extra?: string[] }>
): string[] {
  const norm = slugify(slug) || slug;
  if (!norm) return [];
  const matched = pairs.find(
    (p) => p.vi === norm || p.en === norm || (p.extra && p.extra.includes(norm))
  );
  if (!matched) return [norm];
  return Array.from(new Set([matched.vi, matched.en, ...(matched.extra || [])]));
}

export function translateCategorySlug(slug: string, targetLocale: string): string {
  const norm = slugify(slug) || slug;
  const matched = CATEGORY_BILINGUAL_PAIRS.find(
    (p) => p.vi === norm || p.en === norm || (p.extra && p.extra.includes(norm))
  );
  if (!matched) return norm;
  return targetLocale === "en" ? matched.en : matched.vi;
}

export function translateIngredientSlug(slug: string, targetLocale: string): string {
  const norm = slugify(slug) || slug;
  const matched = INGREDIENT_BILINGUAL_PAIRS.find(
    (p) => p.vi === norm || p.en === norm || (p.extra && p.extra.includes(norm))
  );
  if (!matched) return norm;
  return targetLocale === "en" ? matched.en : matched.vi;
}

export function getCategoryCandidateSlugs(cat: any): string[] {
  if (!cat) return [];
  const altSlugs = cat.alternate_slugs;
  const baseSlugs = [
    cat.slug,
    cat.original_slug,
    cat.slug_vi,
    cat.slug_en,
    slugify(cat.title || ""),
    slugify(cat.vi_title || ""),
    slugify(cat.en_title || ""),
    typeof altSlugs?.en === "string" ? altSlugs.en : altSlugs?.en?.slug,
    typeof altSlugs?.vi === "string" ? altSlugs.vi : altSlugs?.vi?.slug,
    ...(cat.translations?.flatMap((tr: any) => [tr?.slug, slugify(tr?.title || "")]) || []),
  ].filter(Boolean) as string[];

  const expanded = baseSlugs.flatMap((s) => [
    s,
    ...getBilingualPairAliases(s, CATEGORY_BILINGUAL_PAIRS),
  ]);
  return Array.from(new Set(expanded.filter(Boolean)));
}

export function getIngredientAliases(ing: any): string[] {
  if (!ing) return [];
  const baseSlugs = [
    ing.slug,
    ing.original_slug,
    ing.slug_vi,
    ing.slug_en,
    slugify(ing.name || ""),
    slugify(ing.title || ""),
    slugify(ing.vi_title || ""),
    slugify(ing.en_title || ""),
    slugify(ing.name_vi || ""),
    slugify(ing.name_en || ""),
    ...(ing.translations?.flatMap((tr: any) => [
      tr?.slug,
      slugify(tr?.name || ""),
      slugify(tr?.title || ""),
    ]) || []),
  ].filter(Boolean) as string[];

  const expanded = baseSlugs.flatMap((s) => [
    s,
    ...getBilingualPairAliases(s, INGREDIENT_BILINGUAL_PAIRS),
  ]);
  return Array.from(new Set(expanded.filter(Boolean)));
}

export function findCategory<T extends Record<string, any> = any>(
  categories: T[],
  slugParam: string,
  lang: string = "vi"
): T | undefined {
  const normalizedTarget = slugify(slugParam) || slugParam;
  return (categories || []).find((cat: any) => {
    if (
      cat.slug === slugParam ||
      cat.slug === normalizedTarget ||
      cat.original_slug === slugParam ||
      cat.original_slug === normalizedTarget
    ) {
      return true;
    }

    const translation =
      cat.translations?.find((t: any) => t.locale === lang) ||
      cat.translations?.find((t: any) => t.locale?.startsWith(lang));
    const title = translation?.title || cat.title || "";
    if (
      slugify(title) === normalizedTarget ||
      slugify(cat.title || "") === normalizedTarget ||
      slugify(cat.vi_title || "") === normalizedTarget ||
      slugify(cat.en_title || "") === normalizedTarget
    ) {
      return true;
    }

    const candidates = getCategoryCandidateSlugs(cat);
    return candidates.includes(slugParam) || candidates.includes(normalizedTarget);
  });
}

