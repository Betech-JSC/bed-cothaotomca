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
        .replace(/\s*style=["'][^"']*["']/gi, '');
      return `<iframe${cleaned} width="100%" height="400" style="max-width: 800px !important; width: 100% !important; height: 400px !important; min-height: 400px !important; max-height: 400px !important; border-radius: 24px !important; display: block !important; margin: 1.5rem auto !important; border: none !important;">`;
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

  // Khôi phục lại các khối figure ban đầu
  processed = processed.replace(/__FIGURE_PLACEHOLDER_(\d+)__/g, (match, index) => {
    return figures[parseInt(index, 10)];
  });
  
  return processed;
}
