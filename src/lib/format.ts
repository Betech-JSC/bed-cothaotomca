export function formatDate(date: Date | string | number, locale: string = 'vi') {
  const d = new Date(date);
  if (locale === 'vi') {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function formatPrice(price: number) {
  if (!price || price <= 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(price).replace(/,/g, '.') + ' VNĐ';
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
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendOrigin = getBackendBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanPath}`;
}

export function formatRichTextContent(content: string | undefined | null): string {
  if (!content) return '';
  
  const backendOrigin = getBackendBaseUrl();
  let processed = content;

  // Prefix relative image URLs (/storage/uploads/... or /uploads/...) with backendOrigin
  processed = processed.replace(/<img([^>]*?)src="(\/storage\/[^"]*|\/uploads\/[^"]*)"([^>]*?)>/gi, (match, p1, srcPath, p3) => {
    const fullSrc = `${backendOrigin}${srcPath}`;
    return `<img${p1}src="${fullSrc}"${p3}>`;
  });

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
