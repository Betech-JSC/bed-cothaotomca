import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/routing", () => ({
  Link: "a",
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}));

import {
  formatDate,
  filterAndLocalizeBlogs,
  sanitizeHtmlVietnameseAttributes,
  localizePolicyItem,
  matchPolicyBySlug,
} from "@/lib/format";
import {
  POPUP_DISMISSED_SESSION_KEY,
  localizePopupBanner,
} from "@/components/Home/HomePromotionPopup";
import {
  formatPrivateVoucherError,
  getVoucherBadgeLabel,
} from "@/components/Voucher/CouponModal";
import { mergeCampaignObjects } from "@/types/campaign";
import { getMemberTier } from "@/contexts/AuthContext";

describe("fix-en-localization-and-ui-bugs (Dynamic Backend Localization)", () => {
  it("[STT 1 & 2] exports session dismissal key and localizes popup banner from BE translations/fields", () => {
    expect(POPUP_DISMISSED_SESSION_KEY).toBe("home_promo_popup_dismissed_v1");

    const rawBanner = {
      id: 1,
      image: "/banner.jpg",
      title: "Ưu đãi đặc biệt từ Bếp Cô Thảo",
      title_en: "Exclusive Offer from Co Thao's Kitchen",
      description: "Giảm ngay 50K cho đơn hàng đầu tiên",
      description_en: "Get 50K off your first order",
    };

    const enBanner = localizePopupBanner(rawBanner as any, "en", "Special Offer");
    expect(enBanner.title).toBe("Exclusive Offer from Co Thao's Kitchen");
    expect(enBanner.description).toBe("Get 50K off your first order");
    expect(enBanner.alt).toBe("Exclusive Offer from Co Thao's Kitchen");

    const viBanner = localizePopupBanner(rawBanner as any, "vi", "Khuyến mãi");
    expect(viBanner.title).toBe("Ưu đãi đặc biệt từ Bếp Cô Thảo");
  });

  it("[STT 5] formats dates as 'DD Month YYYY' on EN locale in Asia/Ho_Chi_Minh timezone including pre-formatted Vietnamese date strings", () => {
    expect(formatDate("2026-08-09T17:07:19.000000Z", "en")).toBe("10 August 2026");
    expect(formatDate("2026-08-09T17:07:19.000000Z", "vi")).toBe("10/08/2026");
    expect(formatDate("2026-08-09T00:00:00Z", "en")).toBe("09 August 2026");
    expect(formatDate("09 Tháng 08, 2026", "en")).toBe("09 August 2026");
    expect(formatDate("09/08/2026", "en")).toBe("09 August 2026");
    expect(formatDate("2026-08-09T00:00:00Z", "vi")).toBe("09/08/2026");
  });

  it("[STT 5] localizes blog posts using dynamic BE translations, filters untranslated Vietnamese posts on EN, and sanitizes HTML image attributes", () => {
    const rawBlogs: Array<Record<string, any>> = [
      {
        id: 1,
        slug: "co-thao-tom-ca",
        title: "Cô Thảo Tôm Cá - Hành trình mang hải sản tươi sạch",
        content: '<p>Nội dung tiếng Việt</p>',
        translations: [
          {
            locale: "en",
            slug: "co-thao-tom-ca-journey",
            title: "Co Thao Tom Ca - Fresh Seafood Journey",
            content: '<p>English content <img src="/a.jpg" title="Cá hồi tươi" alt="Tôm ngâm tương" /></p>',
          },
        ],
        category: {
          title: "Hải sản tươi sống",
          slug: "hai-san-tuoi-song",
          translations: [{ locale: "en", title: "Fresh Seafood", slug: "fresh-seafood" }],
        },
      },
      {
        id: 2,
        slug: "bai-viet-chua-dich-khac",
        title: "Bài viết tiếng Việt chưa có bản dịch tiếng Anh",
        content: "<p>Nội dung thuần tiếng Việt</p>",
      },
    ];

    const enBlogs = filterAndLocalizeBlogs(rawBlogs, "en");
    expect(enBlogs).toHaveLength(1);
    expect(enBlogs[0].title).toBe("Co Thao Tom Ca - Fresh Seafood Journey");
    expect(enBlogs[0].slug).toBe("co-thao-tom-ca-journey");
    expect(enBlogs[0].alternate_slugs).toEqual({
      vi: "co-thao-tom-ca",
      en: "co-thao-tom-ca-journey",
    });

    const sanitizedHtml = sanitizeHtmlVietnameseAttributes(
      '<img src="/test.jpg" title="Ảnh hải sản tươi sống" alt="Cá hồi ngâm tương" />'
    );
    expect(sanitizedHtml).not.toContain("Ảnh hải sản");
    expect(sanitizedHtml).not.toContain("Cá hồi ngâm tương");
  });

  it("[STT 7] preserves dynamic BE English fields (name_en, description_en, special_note_en, product_name_en, variant_name_en, short_name_en) in mergeCampaignObjects and CouponModal", () => {
    const baseCampaignFromCheckoutConfig = {
      id: 12,
      name: "[QUÀ TẶNG HẢI SẢN] Đơn hàng từ 200K",
      description: "Tặng 01 phần quà hải sản cho đơn từ 200K",
      special_note: "Áp dụng cho mọi đơn hàng",
      promotion_type: "order_gift_discount",
      min_order_value: 200000,
      items: [
        {
          id: 101,
          product_id: 55,
          product_name: "Trứng Cá Chuồn",
          variant_name: "Phần tiêu chuẩn",
          original_price: 25000,
          campaign_price: 0,
          is_free: true,
        },
      ],
    };

    const enrichedCampaignFromActiveEndpoint = {
      id: 12,
      name: "[FREE SEAFOOD GIFT] Orders from 200K",
      name_en: "[FREE SEAFOOD GIFT] Orders from 200K",
      description: "Get 1 free seafood gift for orders from 200K",
      description_en: "Get 1 free seafood gift for orders from 200K",
      special_note: "Valid for all eligible orders",
      special_note_en: "Valid for all eligible orders",
      items: [
        {
          id: 101,
          product_id: 55,
          product_name: "Flying Fish Roe",
          product_name_en: "Flying Fish Roe",
          product_name_vi: "Trứng Cá Chuồn",
          variant_name: "Standard Portion",
          variant_name_en: "Standard Portion",
          variant_name_vi: "Phần tiêu chuẩn",
          original_price: 25000,
          campaign_price: 0,
          is_free: true,
        },
      ],
    };

    const merged = mergeCampaignObjects(
      baseCampaignFromCheckoutConfig,
      enrichedCampaignFromActiveEndpoint
    );

    expect(merged.name).toBe("[FREE SEAFOOD GIFT] Orders from 200K");
    expect(merged.name_en).toBe("[FREE SEAFOOD GIFT] Orders from 200K");
    expect(merged.description).toBe("Get 1 free seafood gift for orders from 200K");
    expect(merged.description_en).toBe("Get 1 free seafood gift for orders from 200K");
    expect(merged.special_note).toBe("Valid for all eligible orders");
    expect(merged.special_note_en).toBe("Valid for all eligible orders");
    expect(merged.items[0].product_name).toBe("Flying Fish Roe");
    expect(merged.items[0].product_name_en).toBe("Flying Fish Roe");
    expect(merged.items[0].variant_name_en).toBe("Standard Portion");

    const sampleVoucher: any = {
      code: "FREESHIP20K",
      short_name: "GIẢM 20K SHIP",
      short_name_en: "20K OFF SHIP",
      discount_type: "fixed",
      value: 20000,
    };
    expect(getVoucherBadgeLabel(sampleVoucher, true, undefined, "en")).toBe("20K OFF SHIP");
    expect(getVoucherBadgeLabel(sampleVoucher, true, undefined, "vi")).toBe("GIẢM 20K SHIP");

    expect(
      formatPrivateVoucherError("Đơn hàng tối thiểu 500.000đ để áp dụng mã này", "en")
    ).toContain("Minimum order of 500.000đ required");

    const goldEn = getMemberTier(500, "en");
    const diamondEn = getMemberTier(1500, "en");
    expect(goldEn.label).toBe("GOLD Member Privilege (-5%)");
    expect(diamondEn.label).toBe("DIAMOND Member Privilege (-8%)");
  });

  it("[STT 9] resolves /en/policy/return-refund-policy using dynamic BE translations", () => {
    const rawPolicies: Array<Record<string, any>> = [
      {
        id: 1,
        slug: "chinh-sach-bao-mat-thong-tin",
        title: "Chính Sách Bảo Mật Thông Tin",
        content: "<p>Bảo mật</p>",
        translations: [
          {
            locale: "en",
            slug: "privacy-policy",
            title: "Privacy Policy",
            content: "<p>Privacy content</p>",
          },
        ],
      },
      {
        id: 2,
        slug: "chinh-sach-doi-tra",
        title: "Chính Sách Đổi Trả",
        seo_title: "Chính sách khiếu nại và đổi trả | Cô Thảo Tôm Cá",
        seo_description: "Chính sách đổi trả hàng tại Cô Thảo Tôm Cá",
        content: "<p>Nội dung đổi trả tiếng Việt</p>",
        translations: [
          {
            locale: "en",
            slug: "return-refund-policy",
            title: "Return & Refund Policy",
            content: "<p>1-for-1 replacement within 2 hours</p>",
          },
        ],
      },
    ];

    const localized = rawPolicies.map((p) => localizePolicyItem(p, "en"));
    const matched = matchPolicyBySlug(localized, "return-refund-policy");
    expect(matched).toBeDefined();
    expect(matched?.title).toBe("Return & Refund Policy");
    expect(matched?.seo_title).toBe("Return & Refund Policy");
    expect(matched?.seo_description).toBe("");
    expect(matched?.slug).toBe("return-refund-policy");
    expect(matched?.alternate_slugs).toEqual({
      vi: "chinh-sach-doi-tra",
      en: "return-refund-policy",
    });
    expect(matched?.content).toContain("1-for-1 replacement");
  });

  it("[STT 9] PolicyPage generateMetadata outputs English title even when BE unsets translations and leaves Vietnamese seo_title", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: 2,
              slug: "return-refund-policy",
              slug_vi: "chinh-sach-doi-tra",
              slug_en: "return-refund-policy",
              title: "Return & Refund Policy",
              vi_title: "Chính Sách Đổi Trả",
              en_title: "Return & Refund Policy",
              seo_title: "Chính sách khiếu nại và đổi trả | Cô Thảo Tôm Cá",
              seo_description: "Chính sách khiếu nại và đổi trả tại Cô Thảo Tôm Cá",
              content: "<p>1-for-1 replacement within 2 hours</p>",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as any;

    try {
      const { generateMetadata } = await import("@/app/[locale]/policy/[slug]/page");
      const meta = await generateMetadata({
        params: Promise.resolve({ locale: "en", slug: "return-refund-policy" }),
      });
      expect(meta.title).toBe("Return & Refund Policy");
      expect((meta.openGraph as any)?.title).toBe("Return & Refund Policy");
      expect(meta.description).toBe("Return & Refund Policy | Co Thao Tom Ca");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("[STT 10] ProductDetailsPage generateMetadata replaces 'at Bếp' with 'at Cô Thảo Tôm Cá' on EN locale", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            id: 88,
            slug: "ikura-salmon-roe",
            slug_vi: "trung-ca-hoi-ikura",
            slug_en: "ikura-salmon-roe",
            name: "Ikura Salmon Roe",
            custom_name: "Ikura Salmon Roe",
            description:
              "Japanese Ikura salmon roe at Bếp boasts plump, glossy orange pearls bursting with umami.",
            seo_description:
              "Japanese Ikura salmon roe at Bếp boasts plump, glossy orange pearls bursting with umami.",
            category: { id: 1, title: "Other Seafood", slug: "other-seafood" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as any;

    try {
      const { generateMetadata } = await import("@/app/[locale]/product/[category]/[slug]/page");
      const meta = await generateMetadata(
        { params: Promise.resolve({ locale: "en", category: "other-seafood", slug: "ikura-salmon-roe" }) },
        Promise.resolve({} as any) as any
      );
      expect(meta.description).toContain("at Cô Thảo Tôm Cá boasts");
      expect(meta.description).not.toContain("at Bếp");
      expect((meta.openGraph as any)?.description).toContain("at Cô Thảo Tôm Cá boasts");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("[STT 13] ensures all homepage and demo category/banner images are strictly under 300 KB", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const maxBytes = 300 * 1024;

    const homeDir = path.resolve(process.cwd(), "public/images/home");
    for (const file of fs.readdirSync(homeDir)) {
      const stat = fs.statSync(path.join(homeDir, file));
      expect(stat.size, `${file} exceeds 300 KB`).toBeLessThan(maxBytes);
    }

    const demoDir = path.resolve(process.cwd(), "public/images/demo");
    for (const file of fs.readdirSync(demoDir)) {
      const stat = fs.statSync(path.join(demoDir, file));
      expect(stat.size, `${file} exceeds 300 KB`).toBeLessThan(maxBytes);
    }
  });
});
