import { describe, it, expect } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import viLocale from "@/i18n/locales/vi.json";
import enLocale from "@/i18n/locales/en.json";

function flatten(obj: Record<string, any>, prefix = ""): Record<string, any> {
  let res: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(res, flatten(obj[k], fullKey));
    } else {
      res[fullKey] = obj[k];
    }
  }
  return res;
}

describe("Promotion and Translation Keys Audit Test Suite", () => {
  const flatVi = flatten(viLocale);
  const flatEn = flatten(enLocale);

  describe("1. Root Cause Fix: buy_more_combo_prompt and buy_more_gift_prompt", () => {
    it("should format buy_more_combo_prompt correctly in Vietnamese without returning raw key", () => {
      const template = viLocale.checkout.buy_more_combo_prompt;
      expect(template).toBeDefined();

      const formatter = new IntlMessageFormat(template, "vi");
      const formatted = formatter.format({
        count: 2,
        quantity: 2,
        name: "Combo Lẩu Cá Hồi",
        strong: (chunks: any) => `[STRONG]${chunks}[/STRONG]`,
      });

      expect(formatted).toContain("Mua thêm");
      expect(formatted).toContain("[STRONG]2 món[/STRONG]");
      expect(formatted).toContain("[STRONG]Combo Lẩu Cá Hồi[/STRONG]");
      expect(formatted).not.toContain("checkout.buy_more_combo_prompt");
    });

    it("should format buy_more_combo_prompt correctly in English without returning raw key", () => {
      const template = enLocale.checkout.buy_more_combo_prompt;
      expect(template).toBeDefined();

      const formatter = new IntlMessageFormat(template, "en");
      const formatted = formatter.format({
        count: 1,
        quantity: 1,
        name: "Salmon Combo",
        strong: (chunks: any) => `[STRONG]${chunks}[/STRONG]`,
      });

      expect(formatted).toContain("Buy");
      expect(formatted).toContain("[STRONG]1 more items[/STRONG]");
      expect(formatted).toContain("[STRONG]Salmon Combo[/STRONG]");
      expect(formatted).not.toContain("checkout.buy_more_combo_prompt");
    });

    it("should also provide buy_more_combo_prompt and buy_more_gift_prompt in cart namespace for safety", () => {
      expect((viLocale.cart as any).buy_more_combo_prompt).toBe(viLocale.checkout.buy_more_combo_prompt);
      expect((viLocale.cart as any).buy_more_gift_prompt).toBe(viLocale.checkout.buy_more_gift_prompt);
      expect((enLocale.cart as any).buy_more_combo_prompt).toBe(enLocale.checkout.buy_more_combo_prompt);
      expect((enLocale.cart as any).buy_more_gift_prompt).toBe(enLocale.checkout.buy_more_gift_prompt);
    });

    it("should format buy_more_gift_prompt with amount and name in both languages", () => {
      const viFormatter = new IntlMessageFormat(viLocale.checkout.buy_more_gift_prompt, "vi");
      const viFormatted = viFormatter.format({
        amount: "50.000 đ",
        name: "Trà Đào",
        strong: (chunks: any) => `<b>${chunks}</b>`,
      });
      expect(viFormatted).toContain("50.000 đ");
      expect(viFormatted).toContain("Trà Đào");

      const enFormatter = new IntlMessageFormat(enLocale.checkout.buy_more_gift_prompt, "en");
      const enFormatted = enFormatter.format({
        amount: "50,000 VND",
        name: "Peach Tea",
        strong: (chunks: any) => `<b>${chunks}</b>`,
      });
      expect(enFormatted).toContain("50,000 VND");
      expect(enFormatted).toContain("Peach Tea");
    });
  });

  describe("2. Clean button labels without duplicate symbols", () => {
    it("should not contain leading '+' in reclaim_gift and reclaim_combo", () => {
      expect(viLocale.checkout.reclaim_gift).toBe("Nhận lại quà");
      expect(viLocale.checkout.reclaim_combo).toBe("Nhận lại ưu đãi");
      expect(enLocale.checkout.reclaim_gift).toBe("Reclaim gift");
      expect(enLocale.checkout.reclaim_combo).toBe("Reclaim offer");
    });
  });

  describe("3. Payment QR Rich Text ICU tags verification", () => {
    it("should parse and format all QR mobile steps without INVALID_TAG errors in English", () => {
      const steps = [
        {
          key: "mobile_step_1",
          values: { btn: "Download", strong: (c: any) => `<b>${c}</b>` },
        },
        {
          key: "mobile_step_2",
          values: { strong: (c: any) => `<b>${c}</b>` },
        },
        {
          key: "mobile_step_3",
          values: { strong: (c: any) => `<b>${c}</b>` },
        },
        {
          key: "note_content",
          values: {
            content: "DH12345",
            strong: (c: any) => `<b>${c}</b>`,
            code: (c: any) => `<code>${c}</code>`,
          },
        },
      ];

      steps.forEach(({ key, values }) => {
        const enMsg = (enLocale.checkout.qr as any)[key];
        expect(() => {
          const formatter = new IntlMessageFormat(enMsg, "en");
          formatter.format(values);
        }).not.toThrow();

        const viMsg = (viLocale.checkout.qr as any)[key];
        expect(() => {
          const formatter = new IntlMessageFormat(viMsg, "vi");
          formatter.format(values);
        }).not.toThrow();
      });
    });
  });

  describe("4. Audited Missing Keys and Placeholders", () => {
    it("should define orderLookup.status.error in vi and en", () => {
      expect(viLocale.orderLookup.status.error).toBe("Lỗi đơn hàng");
      expect(enLocale.orderLookup.status.error).toBe("Order error");
    });

    it("should define blog.no_posts in vi and en", () => {
      expect(viLocale.blog.no_posts).toBe("Không có bài viết nào");
      expect(enLocale.blog.no_posts).toBe("No posts found");
    });

    it("should define progress_bar.cannot_combine_voucher in vi and en", () => {
      expect(viLocale.progress_bar.cannot_combine_voucher).toBe(
        "Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá (Không áp dụng đồng thời)."
      );
      expect(enLocale.progress_bar.cannot_combine_voucher).toBe(
        "Cannot apply shipping support because a voucher is already in use (Cannot be combined)."
      );
    });
  });

  describe("5. Complete 1:1 Locale Symmetry & ICU validity across all 515 keys", () => {
    it("should have identical keys in vi.json and en.json", () => {
      const viKeys = Object.keys(flatVi).sort();
      const enKeys = Object.keys(flatEn).sort();

      expect(viKeys).toEqual(enKeys);
    });

    it("should have matching ICU placeholders in all keys", () => {
      const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;

      for (const key of Object.keys(flatVi)) {
        const viPlaceholders = [...String(flatVi[key]).matchAll(placeholderRegex)]
          .map((m) => m[1])
          .sort();
        const enPlaceholders = [...String(flatEn[key]).matchAll(placeholderRegex)]
          .map((m) => m[1])
          .sort();

        expect(viPlaceholders, `Placeholder mismatch at key: ${key}`).toEqual(enPlaceholders);
      }
    });

    it("should compile all keys as valid ICU MessageFormat", () => {
      for (const [key, val] of Object.entries(flatVi)) {
        expect(() => new IntlMessageFormat(String(val), "vi"), `VI ICU compilation failed at: ${key}`).not.toThrow();
      }

      for (const [key, val] of Object.entries(flatEn)) {
        expect(() => new IntlMessageFormat(String(val), "en"), `EN ICU compilation failed at: ${key}`).not.toThrow();
      }
    });
  });
});
