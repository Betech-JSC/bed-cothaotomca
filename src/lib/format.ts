export function formatDate(date: Date | string | number, locale: string = 'vi') {
  if (date === null || date === undefined || date === '') return '';

  let dayNum: number | null = null;
  let monthNum: number | null = null;
  let yearNum: number | null = null;

  if (typeof date === 'string') {
    const trimmed = date.trim();
    const vnMatch = trimmed.match(/^(\d{1,2})\s*(?:tháng|Tháng)\s*(\d{1,2})[,\s]+(\d{4})$/i);
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const naiveIsoMatch = trimmed.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]\d{1,2}:\d{1,2}(?::\d{1,2}(?:\.\d+)?)?)?$/
    );
    if (vnMatch) {
      dayNum = parseInt(vnMatch[1], 10);
      monthNum = parseInt(vnMatch[2], 10);
      yearNum = parseInt(vnMatch[3], 10);
    } else if (slashMatch) {
      dayNum = parseInt(slashMatch[1], 10);
      monthNum = parseInt(slashMatch[2], 10);
      yearNum = parseInt(slashMatch[3], 10);
    } else if (naiveIsoMatch) {
      yearNum = parseInt(naiveIsoMatch[1], 10);
      monthNum = parseInt(naiveIsoMatch[2], 10);
      dayNum = parseInt(naiveIsoMatch[3], 10);
    }
  }

  if (dayNum === null || monthNum === null || yearNum === null) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
    dayNum = parseInt(getPart('day'), 10);
    monthNum = parseInt(getPart('month'), 10);
    yearNum = parseInt(getPart('year'), 10);
  }

  const day = dayNum.toString().padStart(2, '0');
  const year = yearNum;

  if (locale === 'vi') {
    const month = monthNum.toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[monthNum - 1] || months[0];
  return `${day} ${month} ${year}`;
}

export function formatPrice(price: number) {
  if (!price || price <= 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(price).replace(/,/g, '.') + ' VNĐ';
}

export function formatOrderPrice(price: number | null | undefined): string {
  const num = Number(price) || 0;
  if (num <= 0) return '0 VNĐ';
  return new Intl.NumberFormat('vi-VN').format(num).replace(/,/g, '.') + ' VNĐ';
}

export function slugify(str: string | undefined | null) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getTranslation<T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined {
  if (!translations || translations.length === 0) return undefined;
  return translations.find(t => t.locale === currentLocale) ||
    translations.find(t => t.locale.startsWith(currentLocale));
}

/**
 * Check if a variant is the default variant
 */
export function isDefaultVariant(variant?: string): boolean {
  if (!variant) return true;
  const v = variant.toLowerCase().trim();
  return v === 'mặc định' || v === 'standard' || v === 'default' || v.includes('mặc định');
}

/**
 * Clean variant name strings by stripping out redundant prefixes
 */
export function cleanVariantName(variant?: string): string {
  if (!variant) return '';
  let v = variant.trim();
  v = v.replace(/^Size:\s*/i, '');
  v = v.replace(/^Size\s+Size\s+/i, 'Size ');
  v = v.replace(/^Kích thước\s+Size\s+/i, 'Size ');
  v = v.replace(/^Phân loại\s+Size\s+/i, 'Size ');
  return v;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

export function getBackendBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cms.cothaotomca.vn/api/v1';
  try {
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      const url = new URL(apiUrl);
      return url.origin;
    }
  } catch (e) {}
  
  return 'https://cms.cothaotomca.vn';
}

export function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  const backendOrigin = getBackendBaseUrl();

  // Chuyển đổi nếu ảnh trỏ tới domain frontend cothaotomca.vn chứa /storage/ hoặc /uploads/
  if (/^https?:\/\/(www\.)?cothaotomca\.vn\/(storage|uploads)\//i.test(url)) {
    const cleanPath = url.replace(/^https?:\/\/(www\.)?cothaotomca\.vn/i, '');
    return `${backendOrigin}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
  }

  // Chuyển đổi localhost / 127.0.0.1
  if (
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('https://localhost') ||
    url.startsWith('https://127.0.0.1')
  ) {
    const cleanPath = url.replace(/^https?:\/\/[^/]+/, '');
    return `${backendOrigin}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // Giữ nguyên các static asset của frontend trong thư mục /public
  if (
    url.startsWith('/images/') ||
    url.startsWith('/cover') ||
    url.startsWith('/icons/') ||
    url.startsWith('/favicon')
  ) {
    return url;
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanPath}`;
}

export function formatRichTextContent(content: string | undefined | null): string {
  if (!content) return '';
  
  const backendOrigin = getBackendBaseUrl();
  let processed = content;

  // Chuẩn hóa non-breaking spaces (&nbsp;, &#160;, &#xa0;, \u00A0) thành khoảng trắng thường
  // và loại bỏ căn đều (justify) để tránh giãn khoảng cách từ bất thường trên mobile
  processed = processed
    .replace(/&nbsp;|&#160;|&#xa0;|\u00A0/gi, ' ')
    .replace(/\s*align=["']justify["']/gi, '')
    .replace(/\s*style=(["'])([^"']*?)\1/gi, (match, quote, styleContent) => {
      const cleaned = styleContent.replace(/text-align\s*:\s*justify\s*;?/gi, '').trim();
      return cleaned ? ` style=${quote}${cleaned}${quote}` : '';
    })
    .replace(/\s*class=(["'])([^"']*?)\1/gi, (match, quote, classContent) => {
      const cleaned = classContent.replace(/\b(?:text-justify|ql-align-justify)\b/gi, '').replace(/\s+/g, ' ').trim();
      return cleaned ? ` class=${quote}${cleaned}${quote}` : '';
    });

  // Prefix relative image URLs (/storage/uploads/... or /uploads/...) with backendOrigin
  processed = processed.replace(/<img([^>]*?)src="(\/storage\/[^"]*|\/uploads\/[^"]*)"([^>]*?)>/gi, (match, p1, srcPath, p3) => {
    const fullSrc = `${backendOrigin}${srcPath}`;
    return `<img${p1}src="${fullSrc}"${p3}>`;
  });

  // Chuyển đổi URL frontend cothaotomca.vn về backendOrigin
  processed = processed.replace(
    /<img([^>]*?)src="https?:\/\/(?:www\.)?cothaotomca\.vn(\/(?:storage|uploads)\/[^"]*)"([^>]*?)>/gi,
    (match, p1, srcPath, p3) => {
      const fullSrc = `${backendOrigin}${srcPath}`;
      return `<img${p1}src="${fullSrc}"${p3}>`;
    }
  );

  // Format iframe/Google Maps embeds to default 800x400 responsive dimensions FIRST
  const formatIframeTag = (str: string) => {
    return str.replace(/<iframe([^>]*?)>/gi, (match, attrs) => {
      // Strip existing width, height, and style attributes from raw CMS HTML
      let cleaned = attrs
        .replace(/\s*(width|height)=["'][^"']*["']/gi, '')
      return `<iframe${cleaned} width="100%" height="450" style="width: 100% !important; max-width: 100% !important; border: none !important; display: block !important; margin: 1.5rem auto !important;">`;
    });
  };

  processed = formatIframeTag(processed);

  const figures: string[] = [];
  // Tạm thời ẩn các khối figure đã tồn tại
  processed = processed.replace(/<figure[^>]*?>[\s\S]*?<\/figure>/gi, (match) => {
    figures.push(formatIframeTag(match));
    return `__FIGURE_PLACEHOLDER_${figures.length - 1}__`;
  });
  
  // Format các thẻ img có data-caption nằm riêng lẻ bên ngoài figure
  processed = processed.replace(
    /<img([^>]*?)data-caption="([^"]*?)"([^>]*?)>/gi,
    (match, p1, caption, p3) => {
      const decodedCaption = decodeHtmlEntities(caption);
      if (!decodedCaption.trim()) {
        return match;
      }
      return `<figure class="image"><img${p1}data-caption="${caption}"${p3}><figcaption>${decodedCaption}</figcaption></figure>`;
    }
  );

  const processImgAltHover = (htmlStr: string) => {
    return htmlStr.replace(/<img([^>]*?)alt="([^"]+)"([^>]*?)>/gi, (match, p1, altText, p3) => {
      const decodedAlt = decodeHtmlEntities(altText).trim();
      if (!decodedAlt) return match;

      // Sync title attribute with alt if title is missing
      let updatedImg = match;
      if (!/title=["']/i.test(match)) {
        updatedImg = `<img${p1}alt="${altText}" title="${altText}"${p3}>`;
      }

      const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:5px; opacity:0.85;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
      return `<span class="prose-img-hover-wrapper" data-alt="${altText}">${updatedImg}<span class="img-alt-badge">${iconSvg}${decodedAlt}</span></span>`;
    });
  };

  // Khôi phục lại các khối figure ban đầu
  processed = processed.replace(/__FIGURE_PLACEHOLDER_(\d+)__/g, (match, index) => {
    return figures[parseInt(index, 10)];
  });

  // Xử lý các thẻ img (cả trong lẫn ngoài figure) duy nhất 1 lần
  processed = processImgAltHover(processed);

  return processed;
}

/**
 * Format date time locked to Asia/Ho_Chi_Minh (GMT+7)
 * Output: HH:mm DD/MM/YYYY (or HH:mm:ss DD/MM/YYYY if includeSeconds=true)
 */
export function formatVietnamDateTime(
  date: Date | string | number | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");
  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");

  const timeStr = includeSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
  return `${timeStr} ${day}/${month}/${year}`;
}

/**
 * Helper to check if an order uses COD payment (cash on delivery)
 */
export function isCodPayment(order: any): boolean {
  if (!order) return false;
  if (order.is_cod === true) return true;
  const method = (order.payment?.method || order.payment_method || "").toUpperCase();
  return method === "COD" || method === "CASH";
}

const VIETNAMESE_CHAR_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

export function hasVietnameseDiacritics(text?: string | null): boolean {
  if (!text) return false;
  return VIETNAMESE_CHAR_REGEX.test(text);
}

export function sanitizeHtmlVietnameseAttributes(html?: string | null): string {
  if (!html) return "";
  return html.replace(/\b(title|alt|data-caption)="([^"]*)"/gi, (match, attr, val) => {
    if (hasVietnameseDiacritics(val)) {
      return `${attr}=""`;
    }
    return match;
  });
}

const POLICY_BILINGUAL_SLUGS: Record<string, string> = {
  "chinh-sach-giao-hang": "delivery-policy",
  "chinh-sach-van-chuyen": "shipping-policy",
  "chinh-sach-doi-tra": "return-refund-policy",
  "chinh-sach-doi-tra-hang": "return-refund-policy",
  "chinh-sach-bao-mat": "privacy-policy",
  "chinh-sach-bao-mat-thong-tin": "privacy-policy",
  "chinh-sach-thanh-toan": "payment-policy",
  "chinh-sach-kiem-hang": "inspection-policy",
  "dieu-khoan-dich-vu": "terms-of-service",
  "dieu-khoan-su-dung": "terms-of-use",
};

const POLICY_EN_TO_VI_SLUGS: Record<string, string> = Object.entries(POLICY_BILINGUAL_SLUGS).reduce(
  (acc, [vi, en]) => {
    if (!acc[en]) acc[en] = vi;
    return acc;
  },
  {} as Record<string, string>
);

export function cleanBlogSlugSegment(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^(?:vi|en)\/blog\/category\/[^/]+\//i, "")
    .replace(/^(?:vi|en)\/blog\/blog\//i, "")
    .replace(/^(?:vi|en)\/(?:blog|tin-tuc)\//i, "")
    .replace(/^blog\/category\/[^/]+\//i, "")
    .replace(/^blog\/blog\//i, "")
    .replace(/^(?:blog|tin-tuc)\//i, "")
    .replace(/^\/+|\/+$/g, "");
}

export function localizeBlogItem<T extends Record<string, any>>(blog: T, locale: string = "vi"): T {
  if (!blog) return blog;
  const cloned: any = { ...blog };
  const translations: any[] = Array.isArray(cloned.translations) ? cloned.translations : [];
  const viTrans = translations.find((t) => t?.locale === "vi" || t?.locale?.startsWith("vi"));
  const enTrans = translations.find((t) => t?.locale === "en" || t?.locale?.startsWith("en"));

  const altVi = typeof cloned.alternate_slugs?.vi === "string"
    ? cloned.alternate_slugs.vi
    : cloned.alternate_slugs?.vi?.slug;
  const altEn = typeof cloned.alternate_slugs?.en === "string"
    ? cloned.alternate_slugs.en
    : cloned.alternate_slugs?.en?.slug;

  const rawSlugVi =
    cloned.slug_vi ||
    cloned.original_slug ||
    viTrans?.slug ||
    altVi ||
    (locale !== "en" ? cloned.slug : "") ||
    cloned.slug ||
    "";
  const slugVi = cleanBlogSlugSegment(rawSlugVi) || rawSlugVi;

  const rawSlugEn =
    cloned.slug_en ||
    enTrans?.slug ||
    altEn ||
    (locale === "en" && cloned.slug && !hasVietnameseDiacritics(cloned.slug) ? cloned.slug : "") ||
    slugify(enTrans?.title || cloned.title_en || cloned.en_title || "") ||
    slugVi;
  const slugEn = cleanBlogSlugSegment(rawSlugEn) || slugVi;

  cloned.slug_vi = slugVi;
  cloned.slug_en = slugEn;
  cloned.alternate_slugs = {
    vi: slugVi,
    en: slugEn,
  };

  if (cloned.category && typeof cloned.category === "object") {
    const catClone = { ...cloned.category };
    const catTrans: any[] = Array.isArray(catClone.translations) ? catClone.translations : [];
    const catVi = catTrans.find((t) => t?.locale === "vi" || t?.locale?.startsWith("vi"));
    const catEn = catTrans.find((t) => t?.locale === "en" || t?.locale?.startsWith("en"));

    const rawCatSlugVi =
      catClone.slug_vi ||
      catClone.original_slug ||
      catVi?.slug ||
      slugify(catVi?.title || catClone.vi_title || (locale !== "en" ? catClone.title : "") || "") ||
      "tin-tuc";
    const catSlugVi = cleanBlogSlugSegment(rawCatSlugVi) || "tin-tuc";

    const rawCatSlugEn =
      catClone.slug_en ||
      catEn?.slug ||
      slugify(catEn?.title || catClone.en_title || catClone.title_en || (locale === "en" ? catClone.title : "") || "") ||
      "news";
    const cleanedCatSlugEn = cleanBlogSlugSegment(rawCatSlugEn) || "news";

    catClone.slug_vi = catSlugVi;
    catClone.slug_en = cleanedCatSlugEn === "blog" ? "news" : cleanedCatSlugEn;
    if (locale === "en") {
      catClone.title = catEn?.title || catClone.en_title || catClone.title_en || catClone.title;
      catClone.slug = catClone.slug_en;
    } else {
      catClone.title = catVi?.title || catClone.vi_title || catClone.title;
      catClone.slug = catClone.slug_vi;
    }
    cloned.category = catClone;
  }

  if (locale === "en") {
    cloned.slug = slugEn || cloned.slug;
    cloned.title = enTrans?.title || cloned.title_en || cloned.en_title || cloned.title;
    cloned.excerpt = enTrans?.excerpt || enTrans?.description || cloned.excerpt_en || cloned.en_excerpt || cloned.excerpt;
    cloned.description = enTrans?.description || enTrans?.excerpt || cloned.description_en || cloned.en_description || cloned.description;
    cloned.content = enTrans?.content || cloned.content_en || cloned.en_content || cloned.content;
    const rawEnBlogSeoTitle =
      enTrans?.seo_title ||
      cloned.seo_title_en ||
      (typeof cloned.seo_title === "string" && !hasVietnameseDiacritics(cloned.seo_title) ? cloned.seo_title : "");
    const rawEnBlogSeoDesc =
      enTrans?.seo_description ||
      cloned.seo_description_en ||
      (typeof cloned.seo_description === "string" && !hasVietnameseDiacritics(cloned.seo_description) ? cloned.seo_description : "");
    cloned.seo_title = rawEnBlogSeoTitle || cloned.title;
    cloned.seo_description = rawEnBlogSeoDesc || (typeof cloned.description === "string" && !hasVietnameseDiacritics(cloned.description) ? cloned.description : "");
    if (typeof cloned.content === "string") {
      cloned.content = sanitizeHtmlVietnameseAttributes(cloned.content);
    }
  } else {
    cloned.slug = slugVi || cloned.slug;
    cloned.title = viTrans?.title || cloned.title_vi || cloned.vi_title || cloned.title;
  }

  return cloned as T;
}

export function filterAndLocalizeBlogs<T extends Record<string, any>>(
  blogs: T[] | undefined | null,
  locale: string = "vi"
): T[] {
  if (!Array.isArray(blogs)) return [];
  const localized = blogs.map((b) => localizeBlogItem(b, locale));
  if (locale !== "en") return localized;
  return localized.filter((b) => !hasVietnameseDiacritics(b.title));
}

export function localizePolicyItem<T extends Record<string, any>>(policy: T, locale: string = "vi"): T {
  if (!policy) return policy;
  const cloned: any = { ...policy };
  const translations: any[] = Array.isArray(cloned.translations) ? cloned.translations : [];
  const viTrans = translations.find((t) => t?.locale === "vi" || t?.locale?.startsWith("vi"));
  const enTrans = translations.find((t) => t?.locale === "en" || t?.locale?.startsWith("en"));

  const altVi = typeof cloned.alternate_slugs?.vi === "string"
    ? cloned.alternate_slugs.vi
    : cloned.alternate_slugs?.vi?.slug;
  const altEn = typeof cloned.alternate_slugs?.en === "string"
    ? cloned.alternate_slugs.en
    : cloned.alternate_slugs?.en?.slug;

  const rawViTitle = viTrans?.title || cloned.vi_title || cloned.title_vi || (locale !== "en" ? cloned.title : "") || "";
  const rawEnTitle = enTrans?.title || cloned.en_title || cloned.title_en || (locale === "en" && !hasVietnameseDiacritics(cloned.title) ? cloned.title : "") || "";

  const candidateSlugVi =
    cloned.slug_vi ||
    cloned.original_slug ||
    viTrans?.slug ||
    altVi ||
    (locale !== "en" ? cloned.slug : "") ||
    slugify(rawViTitle) ||
    POLICY_EN_TO_VI_SLUGS[cloned.slug || ""] ||
    cloned.slug ||
    "";
  const slugVi = POLICY_EN_TO_VI_SLUGS[candidateSlugVi] || candidateSlugVi;

  const candidateSlugEn =
    (cloned.slug_en && cloned.slug_en !== slugVi ? cloned.slug_en : "") ||
    enTrans?.slug ||
    (altEn && altEn !== slugVi ? altEn : "") ||
    (locale === "en" && cloned.slug && cloned.slug !== slugVi && !hasVietnameseDiacritics(cloned.slug) ? cloned.slug : "") ||
    slugify(rawEnTitle) ||
    POLICY_BILINGUAL_SLUGS[slugVi] ||
    cloned.slug_en ||
    altEn ||
    slugVi;
  const slugEn = POLICY_BILINGUAL_SLUGS[candidateSlugEn] || candidateSlugEn;

  cloned.slug_vi = slugVi;
  cloned.slug_en = slugEn;
  cloned.alternate_slugs = {
    vi: slugVi,
    en: slugEn,
  };

  if (locale === "en") {
    cloned.slug = slugEn || cloned.slug;
    cloned.title = rawEnTitle || cloned.title;
    cloned.content = enTrans?.content || cloned.content_en || cloned.en_content || cloned.content;
    const rawEnSeoTitle =
      enTrans?.seo_title ||
      cloned.seo_title_en ||
      cloned.en_seo_title ||
      (typeof cloned.seo_title === "string" && !hasVietnameseDiacritics(cloned.seo_title) ? cloned.seo_title : "");
    const rawEnSeoDesc =
      enTrans?.seo_description ||
      cloned.seo_description_en ||
      cloned.en_seo_description ||
      (typeof cloned.seo_description === "string" && !hasVietnameseDiacritics(cloned.seo_description) ? cloned.seo_description : "");
    cloned.seo_title = rawEnSeoTitle || cloned.title;
    cloned.seo_description = rawEnSeoDesc;
    if (typeof cloned.meta_title === "string" && hasVietnameseDiacritics(cloned.meta_title)) {
      cloned.meta_title = cloned.title;
    }
    if (typeof cloned.meta_description === "string" && hasVietnameseDiacritics(cloned.meta_description)) {
      cloned.meta_description = "";
    }
    if (typeof cloned.content === "string") {
      cloned.content = sanitizeHtmlVietnameseAttributes(cloned.content);
    }
  } else {
    cloned.slug = slugVi || cloned.slug;
    if (rawViTitle) {
      cloned.title = rawViTitle;
    }
  }

  return cloned as T;
}

export function matchPolicyBySlug<T extends Record<string, any>>(
  policies: T[],
  targetSlug: string
): T | undefined {
  if (!Array.isArray(policies) || !targetSlug) return undefined;
  return policies.find((p) => {
    const transSlugs = Array.isArray(p.translations)
      ? p.translations.map((t: any) => t?.slug).filter(Boolean)
      : [];
    return (
      p.slug === targetSlug ||
      p.slug_en === targetSlug ||
      p.slug_vi === targetSlug ||
      p.original_slug === targetSlug ||
      p.alternate_slugs?.en === targetSlug ||
      p.alternate_slugs?.vi === targetSlug ||
      transSlugs.includes(targetSlug)
    );
  });
}



