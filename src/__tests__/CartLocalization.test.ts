import { describe, it, expect } from "vitest";
import {
  getCartItemTitle,
  getCartItemVariant,
  healCartItem,
  normalizeVariantToken,
  getCanonicalCartItemKey,
  isSameCartProductVariant,
  mergeCartItemPair,
  mergeDuplicateCartItems,
} from "@/lib/cartLocalization";
import { checkItemOutOfStock, type CartItem } from "@/contexts/CartContext";

describe("CartLocalization Helpers & Self-Healing", () => {
  const sampleItemWithEn: CartItem = {
    id: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong-Set 2 (Cơm gạo Nhật)",
    productId: 3516704,
    productCode: "S2",
    slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
    categorySlug: "set-com",
    title: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
    title_vi: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
    title_en: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
    imageUrl: "/images/salmon-set.jpg",
    variant: "Set 2 (Cơm gạo Nhật)",
    variant_vi: "Set 2 (Cơm gạo Nhật)",
    variant_en: "Set 2 (Japanese Rice)",
    unitPrice: 135000,
    originalPrice: 135000,
    quantity: 2,
    variantId: 3516705,
    product_variant_id: 3516705,
    parentProductId: 3516704,
  };

  const sampleLegacyItem: CartItem = {
    id: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong-Set 2 (Cơm gạo Nhật)",
    productId: 3516704,
    productCode: "S2",
    slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
    categorySlug: "set-com",
    title: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
    imageUrl: "/images/salmon-set.jpg",
    variant: "Set 2 (Cơm gạo Nhật)",
    unitPrice: 135000,
    originalPrice: 135000,
    quantity: 1,
    variantId: 3516705,
  };

  const mockProductsCache = [
    {
      id: 3516704,
      kiotviet_id: 3516704,
      code: "S2",
      name: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
      name_en: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
      slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
      price: 135000,
      status: 1,
      variants: [
        {
          id: 3516705,
          kiotviet_id: 3516705,
          code: "S2-VAR",
          size: "Set 2 (Cơm gạo Nhật)",
          size_en: "Set 2 (Japanese Rice)",
          price: 135000,
          status: 1,
        },
      ],
    },
  ];

  describe("1. getCartItemTitle", () => {
    it("returns Vietnamese title when locale is 'vi'", () => {
      const title = getCartItemTitle(sampleItemWithEn, "vi");
      expect(title).toBe("[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương");
    });

    it("returns title_vi when locale is 'vi' even if item.title is English", () => {
      const enAddedItem = {
        ...sampleItemWithEn,
        title: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
        title_vi: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
      };
      expect(getCartItemTitle(enAddedItem, "vi")).toBe(
        "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương"
      );
    });

    it("returns English title when locale is 'en' and title_en exists", () => {
      const title = getCartItemTitle(sampleItemWithEn, "en");
      expect(title).toBe("[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set");
    });

    it("falls back to item.title when locale is 'en' but title_en is missing or empty", () => {
      const fallbackItem = { ...sampleItemWithEn, title_en: undefined };
      expect(getCartItemTitle(fallbackItem, "en")).toBe(
        "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương"
      );

      const emptyItem = { ...sampleItemWithEn, title_en: "   " };
      expect(getCartItemTitle(emptyItem, "en")).toBe(
        "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương"
      );
    });

    it("handles null or undefined item gracefully without crashing", () => {
      expect(getCartItemTitle(null, "en")).toBe("");
      expect(getCartItemTitle(undefined, "vi")).toBe("");
    });
  });

  describe("2. getCartItemVariant", () => {
    it("returns Vietnamese variant when locale is 'vi'", () => {
      const variant = getCartItemVariant(sampleItemWithEn, "vi");
      expect(variant).toBe("Set 2 (Cơm gạo Nhật)");
    });

    it("returns variant_vi when locale is 'vi' even if item.variant is English", () => {
      const enAddedItem = {
        ...sampleItemWithEn,
        variant: "Set 2 (Japanese Rice)",
        variant_vi: "Set 2 (Cơm gạo Nhật)",
      };
      expect(getCartItemVariant(enAddedItem, "vi")).toBe("Set 2 (Cơm gạo Nhật)");
    });

    it("returns English variant when locale is 'en' and variant_en exists", () => {
      const variant = getCartItemVariant(sampleItemWithEn, "en");
      expect(variant).toBe("Set 2 (Japanese Rice)");
    });

    it("falls back to item.variant when locale is 'en' but variant_en is missing or empty", () => {
      const fallbackItem = { ...sampleItemWithEn, variant_en: undefined };
      expect(getCartItemVariant(fallbackItem, "en")).toBe("Set 2 (Cơm gạo Nhật)");

      const emptyItem = { ...sampleItemWithEn, variant_en: "" };
      expect(getCartItemVariant(emptyItem, "en")).toBe("Set 2 (Cơm gạo Nhật)");
    });

    it("handles null or undefined item gracefully without crashing", () => {
      expect(getCartItemVariant(null, "en")).toBe("");
      expect(getCartItemVariant(undefined, "vi")).toBe("");
    });
  });

  describe("3. Self-Healing Mechanism (healCartItem)", () => {
    it("populates title_vi, variant_vi, title_en, variant_en and canonical IDs for legacy cart items stored in LocalStorage", () => {
      expect(sampleLegacyItem.title_en).toBeUndefined();
      expect(sampleLegacyItem.variant_en).toBeUndefined();

      const healed = healCartItem(sampleLegacyItem, mockProductsCache);

      expect(healed.title_vi).toBe("[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương");
      expect(healed.variant_vi).toBe("Set 2 (Cơm gạo Nhật)");
      expect(healed.title_en).toBe("[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set");
      expect(healed.variant_en).toBe("Set 2 (Japanese Rice)");
      expect(healed.product_id).toBe(3516704);
      expect(healed.parentProductId).toBe(3516704);
      expect(healed.db_id).toBe(3516704);
      expect(healed.product_db_id).toBe(3516704);
      expect(healed.variant_id).toBe(3516705);
      expect(healed.variant_db_id).toBe(3516705);
      expect(healed.kiotviet_id).toBe(3516705);

      expect(getCartItemTitle(healed, "en")).toBe(
        "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set"
      );
      expect(getCartItemVariant(healed, "en")).toBe("Set 2 (Japanese Rice)");
      expect(getCartItemTitle(healed, "vi")).toBe(
        "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương"
      );
      expect(getCartItemVariant(healed, "vi")).toBe("Set 2 (Cơm gạo Nhật)");
    });

    it("heals an item added on English storefront (/en/...) by populating title_vi and variant_vi", () => {
      const enOnlyItem: CartItem = {
        id: "salmon-set-Set 2 (Japanese Rice)",
        productId: 3516705,
        productCode: "S2-VAR",
        slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
        categorySlug: "rice-sets",
        title: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
        imageUrl: "/images/salmon-set.jpg",
        variant: "Set 2 (Japanese Rice)",
        unitPrice: 135000,
        quantity: 1,
      };

      const healed = healCartItem(enOnlyItem, mockProductsCache);
      expect(healed.title_vi).toBe("[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương");
      expect(healed.variant_vi).toBe("Set 2 (Cơm gạo Nhật)");
      expect(healed.title_en).toBe("[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set");
      expect(healed.variant_en).toBe("Set 2 (Japanese Rice)");
      expect(healed.parentProductId).toBe(3516704);
      expect(healed.variantId).toBe(3516705);
    });

    it("heals by product slug and variant size if productId is not exact match", () => {
      const itemWithSlugOnly: CartItem = {
        ...sampleLegacyItem,
        productId: 999999,
        variantId: undefined,
        slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
        variant: "Set 2 (Cơm gạo Nhật)",
      };

      const healed = healCartItem(itemWithSlugOnly, mockProductsCache);
      expect(healed.title_en).toBe("[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set");
      expect(healed.variant_en).toBe("Set 2 (Japanese Rice)");
      expect(healed.title_vi).toBe("[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương");
      expect(healed.variant_vi).toBe("Set 2 (Cơm gạo Nhật)");
    });

    it("returns original item unchanged if cache is empty or product not found", () => {
      const untouched1 = healCartItem(sampleLegacyItem, []);
      expect(untouched1).toBe(sampleLegacyItem);

      const unknownItem: CartItem = {
        ...sampleLegacyItem,
        productId: 111111,
        productCode: "UNKNOWN_CODE",
        slug: "unknown-product-slug",
        variantId: 999999,
        variant: "Unknown Variant",
      };
      const untouched2 = healCartItem(unknownItem, mockProductsCache);
      expect(untouched2).toBe(unknownItem);
    });
  });

  describe("4. checkItemOutOfStock with multilingual variants and variantId", () => {
    it("does NOT mark item with English variant as out of stock when variant is active", () => {
      const cacheWithNoParentCode = [
        {
          id: 80,
          kiotviet_id: 3516704,
          code: "", // Parent has empty code, only variants have codes
          name: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
          name_en: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
          slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
          status: 1,
          variants: [
            {
              id: 1146,
              kiotviet_id: 3516705,
              code: "S2",
              size: "Set 2 (Cơm gạo Nhật)",
              size_en: "Set 2 (Japanese Rice)",
              price: 135000,
              status: 1,
            },
          ],
        },
      ];

      const enCartItem: CartItem = {
        id: "salmon-set-Set 2 (Japanese Rice)",
        productId: 80,
        productCode: "S2",
        slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
        categorySlug: "set-com",
        title: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
        imageUrl: "/images/salmon-set.jpg",
        variant: "Set 2 (Japanese Rice)",
        unitPrice: 135000,
        quantity: 1,
      };

      expect(checkItemOutOfStock(enCartItem, cacheWithNoParentCode)).toBe(false);
    });

    it("correctly detects out-of-stock when matched by English variant or variantId and variant status is 0", () => {
      const cacheWithOutOfStockVariant = [
        {
          id: 80,
          code: "PARENT-80",
          status: 1,
          variants: [
            {
              id: 1146,
              code: "S2",
              size: "Set 2 (Cơm gạo Nhật)",
              size_en: "Set 2 (Japanese Rice)",
              price: 135000,
              status: 0,
            },
          ],
        },
      ];

      const enCartItem: CartItem = {
        id: "salmon-set-Set 2 (Japanese Rice)",
        productId: 80,
        variantId: 1146,
        productCode: "S2",
        slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
        categorySlug: "set-com",
        title: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
        imageUrl: "/images/salmon-set.jpg",
        variant: "Set 2 (Japanese Rice)",
        unitPrice: 135000,
        quantity: 1,
      };

      expect(checkItemOutOfStock(enCartItem, cacheWithOutOfStockVariant)).toBe(true);
    });
  });

  describe("5. Cross-Locale Cart Item Identification, Merge & Combo Variant Separation", () => {
    it("normalizes VI and EN size/standard variant labels into identical tokens", () => {
      expect(normalizeVariantToken("Tiêu chuẩn")).toBe("__standard__");
      expect(normalizeVariantToken("Standard")).toBe("__standard__");
      expect(normalizeVariantToken("")).toBe("__standard__");
      expect(normalizeVariantToken("Nhỏ")).toBe("__size_s__");
      expect(normalizeVariantToken("Small")).toBe("__size_s__");
      expect(normalizeVariantToken("Vừa")).toBe("__size_m__");
      expect(normalizeVariantToken("Medium")).toBe("__size_m__");
      expect(normalizeVariantToken("Lớn")).toBe("__size_l__");
      expect(normalizeVariantToken("Large")).toBe("__size_l__");
    });

    it("identifies and merges item added in VI ('Nhỏ' / 'Tiêu chuẩn') and then in EN ('Small' / 'Standard') into 1 row with quantity = 2 and full bilingual metadata", () => {
      // Case A: Size variant "Nhỏ" (VI) vs "Small" (EN) with localized slugs
      const itemAddedInVi: CartItem = {
        id: "sup-hai-san-Nhỏ",
        productId: 501,
        parentProductId: 500,
        product_id: 500,
        variantId: 501,
        variant_id: 501,
        productCode: "SUP-S",
        slug: "sup-hai-san",
        categorySlug: "mon-sup",
        title: "Súp Hải Sản",
        title_vi: "Súp Hải Sản",
        title_en: "Seafood Soup",
        imageUrl: "/images/soup.jpg",
        variant: "Nhỏ",
        variant_vi: "Nhỏ",
        variant_en: "Small",
        unitPrice: 65000,
        quantity: 1,
      };

      const itemAddedInEn: CartItem = {
        id: "seafood-soup-Small",
        productId: 501,
        parentProductId: 500,
        product_id: 500,
        variantId: 501,
        variant_id: 501,
        productCode: "SUP-S",
        slug: "seafood-soup",
        categorySlug: "soups",
        title: "Seafood Soup",
        title_vi: "Súp Hải Sản",
        title_en: "Seafood Soup",
        imageUrl: "/images/soup.jpg",
        variant: "Small",
        variant_vi: "Nhỏ",
        variant_en: "Small",
        unitPrice: 65000,
        quantity: 1,
      };

      expect(isSameCartProductVariant(itemAddedInVi, itemAddedInEn)).toBe(true);
      expect(getCanonicalCartItemKey(itemAddedInVi)).toBe(getCanonicalCartItemKey(itemAddedInEn));

      const mergedSize = mergeCartItemPair(itemAddedInVi, itemAddedInEn, 1);
      expect(mergedSize.quantity).toBe(2);
      expect(mergedSize.title_vi).toBe("Súp Hải Sản");
      expect(mergedSize.title_en).toBe("Seafood Soup");
      expect(mergedSize.variant_vi).toBe("Nhỏ");
      expect(mergedSize.variant_en).toBe("Small");

      // Case B: Standard variant "Tiêu chuẩn" (VI) vs "Standard" (EN) even when one side lacks bilingual fields initially
      const standardVi: CartItem = {
        id: "cha-muc-gia-tay-Tiêu chuẩn",
        productId: 600,
        productCode: "CM-STD",
        slug: "cha-muc-gia-tay",
        categorySlug: "cha-muc",
        title: "Chả Mực Giã Tay",
        title_vi: "Chả Mực Giã Tay",
        imageUrl: "/images/chamuc.jpg",
        variant: "Tiêu chuẩn",
        variant_vi: "Tiêu chuẩn",
        unitPrice: 250000,
        quantity: 1,
      };

      const standardEn: CartItem = {
        id: "hand-pounded-squid-cake-Standard",
        productId: 600,
        productCode: "CM-STD",
        slug: "hand-pounded-squid-cake",
        categorySlug: "squid-cake",
        title: "Hand-pounded Squid Cake",
        title_en: "Hand-pounded Squid Cake",
        imageUrl: "/images/chamuc.jpg",
        variant: "Standard",
        variant_en: "Standard",
        unitPrice: 250000,
        quantity: 1,
      };

      expect(isSameCartProductVariant(standardVi, standardEn)).toBe(true);
      const mergedStandard = mergeCartItemPair(standardVi, standardEn, 1);
      expect(mergedStandard.quantity).toBe(2);
      expect(mergedStandard.title_vi).toBe("Chả Mực Giã Tay");
      expect(mergedStandard.title_en).toBe("Hand-pounded Squid Cake");
      expect(mergedStandard.variant_vi).toBe("Tiêu chuẩn");
      expect(mergedStandard.variant_en).toBe("Standard");
    });

    it("does NOT merge two different variants of the same Combo product sharing kiotviet_id (e.g. c1 'Cơm trắng' vs c1-lut 'Cơm gạo lứt')", () => {
      const comboWhiteRice: CartItem = {
        id: "combo-ca-hoi-Cơm trắng",
        productId: 999888,
        parentProductId: 700,
        product_id: 700,
        kiotviet_id: 999888,
        variantId: 7001,
        variant_id: 7001,
        productCode: "c1",
        slug: "combo-ca-hoi",
        categorySlug: "combo",
        title: "Combo Cá Hồi",
        title_vi: "Combo Cá Hồi",
        title_en: "Salmon Combo",
        imageUrl: "/images/combo.jpg",
        variant: "Cơm trắng",
        variant_vi: "Cơm trắng",
        variant_en: "White Rice",
        unitPrice: 145000,
        quantity: 1,
      };

      const comboBrownRice: CartItem = {
        id: "combo-ca-hoi-Cơm gạo lứt",
        productId: 999888,
        parentProductId: 700,
        product_id: 700,
        kiotviet_id: 999888,
        variantId: 7002,
        variant_id: 7002,
        productCode: "c1-lut",
        slug: "combo-ca-hoi",
        categorySlug: "combo",
        title: "Combo Cá Hồi",
        title_vi: "Combo Cá Hồi",
        title_en: "Salmon Combo",
        imageUrl: "/images/combo.jpg",
        variant: "Cơm gạo lứt",
        variant_vi: "Cơm gạo lứt",
        variant_en: "Brown Rice",
        unitPrice: 150000,
        quantity: 1,
      };

      expect(isSameCartProductVariant(comboWhiteRice, comboBrownRice)).toBe(false);

      // Even if variantId was accidentally set to the shared kiotviet_id on both, different code or variant_vi must prevent merging
      const comboWhiteSharedVarId: CartItem = {
        ...comboWhiteRice,
        variantId: 999888,
        variant_id: 999888,
      };
      const comboBrownSharedVarId: CartItem = {
        ...comboBrownRice,
        variantId: 999888,
        variant_id: 999888,
      };
      expect(isSameCartProductVariant(comboWhiteSharedVarId, comboBrownSharedVarId)).toBe(false);

      const deduped = mergeDuplicateCartItems([comboWhiteSharedVarId, comboBrownSharedVarId]);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].productCode).toBe("c1");
      expect(deduped[1].productCode).toBe("c1-lut");
    });

    it("mergeDuplicateCartItems automatically merges split VI/EN entries from localStorage and sums their quantities", () => {
      const splitItemsInStorage: CartItem[] = [
        {
          id: "tom-su-nuong-Nhỏ",
          productId: 801,
          parentProductId: 800,
          productCode: "TS-S",
          slug: "tom-su-nuong",
          categorySlug: "tom",
          title: "Tôm Sú Nướng",
          title_vi: "Tôm Sú Nướng",
          imageUrl: "/images/tom.jpg",
          variant: "Nhỏ",
          variant_vi: "Nhỏ",
          unitPrice: 180000,
          quantity: 1,
        },
        {
          id: "grilled-tiger-prawn-Small",
          productId: 801,
          parentProductId: 800,
          productCode: "TS-S",
          slug: "grilled-tiger-prawn",
          categorySlug: "shrimp",
          title: "Grilled Tiger Prawn",
          title_en: "Grilled Tiger Prawn",
          imageUrl: "/images/tom.jpg",
          variant: "Small",
          variant_en: "Small",
          unitPrice: 180000,
          quantity: 2,
        },
      ];

      const mergedList = mergeDuplicateCartItems(splitItemsInStorage);
      expect(mergedList).toHaveLength(1);
      expect(mergedList[0].quantity).toBe(3);
      expect(mergedList[0].title_vi).toBe("Tôm Sú Nướng");
      expect(mergedList[0].title_en).toBe("Grilled Tiger Prawn");
      expect(mergedList[0].variant_vi).toBe("Nhỏ");
      expect(mergedList[0].variant_en).toBe("Small");
    });
  });
});
