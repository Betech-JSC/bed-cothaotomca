import { describe, it, expect } from "vitest";
import {
  getCartItemTitle,
  getCartItemVariant,
  healCartItem,
} from "@/lib/cartLocalization";
import type { CartItem } from "@/contexts/CartContext";

describe("CartLocalization Helpers & Self-Healing", () => {
  const sampleItemWithEn: CartItem = {
    id: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong-Set 2 (Cơm gạo Nhật)",
    productId: 3516704,
    productCode: "S2",
    slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
    categorySlug: "set-com",
    title: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
    title_en: "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set",
    imageUrl: "/images/salmon-set.jpg",
    variant: "Set 2 (Cơm gạo Nhật)",
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
      variants: [
        {
          id: 3516705,
          kiotviet_id: 3516705,
          code: "S2-VAR",
          size: "Set 2 (Cơm gạo Nhật)",
          size_en: "Set 2 (Japanese Rice)",
          price: 135000,
        },
      ],
    },
  ];

  describe("1. getCartItemTitle", () => {
    it("returns Vietnamese title when locale is 'vi'", () => {
      const title = getCartItemTitle(sampleItemWithEn, "vi");
      expect(title).toBe("[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương");
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
    it("populates title_en and variant_en for legacy cart items stored in LocalStorage", () => {
      // Legacy item has no title_en or variant_en
      expect(sampleLegacyItem.title_en).toBeUndefined();
      expect(sampleLegacyItem.variant_en).toBeUndefined();

      const healed = healCartItem(sampleLegacyItem, mockProductsCache);

      expect(healed.title_en).toBe("[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set");
      expect(healed.variant_en).toBe("Set 2 (Japanese Rice)");
      expect(healed.product_id).toBe(3516704);
      expect(healed.variant_id).toBe(3516705);

      // Verify that after healing, getCartItemTitle and getCartItemVariant display in English
      expect(getCartItemTitle(healed, "en")).toBe(
        "[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set"
      );
      expect(getCartItemVariant(healed, "en")).toBe("Set 2 (Japanese Rice)");
      // And in Vietnamese
      expect(getCartItemTitle(healed, "vi")).toBe(
        "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương"
      );
      expect(getCartItemVariant(healed, "vi")).toBe("Set 2 (Cơm gạo Nhật)");
    });

    it("heals by product slug and variant size if productId is not exact match", () => {
      const itemWithSlugOnly: CartItem = {
        ...sampleLegacyItem,
        productId: 999999, // Unmatched ID
        variantId: undefined,
        slug: "tang-sup-set-com-ca-hoi-trung-long-dao-ngam-tuong",
        variant: "Set 2 (Cơm gạo Nhật)",
      };

      const healed = healCartItem(itemWithSlugOnly, mockProductsCache);
      expect(healed.title_en).toBe("[FREE SOUP] Salmon & Marinated Soft-Boiled Egg Rice Set");
      expect(healed.variant_en).toBe("Set 2 (Japanese Rice)");
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
});
