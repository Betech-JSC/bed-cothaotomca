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

export function formatRichTextContent(content: string | undefined | null): string {
  if (!content) return '';
  
  const figures: string[] = [];
  // Tạm thời ẩn các khối figure đã tồn tại
  let processed = content.replace(/<figure[^>]*?>[\s\S]*?<\/figure>/gi, (match) => {
    figures.push(match);
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
      return `<figure style="display: flex; flex-direction: column; align-items: center; margin: 1.5rem auto; width: 100%; text-align: center;"><img${p1}data-caption="${caption}"${p3}><figcaption>${decodedCaption}</figcaption></figure>`;
    }
  );
  
  // Khôi phục lại các khối figure ban đầu
  processed = processed.replace(/__FIGURE_PLACEHOLDER_(\d+)__/g, (match, index) => {
    return figures[parseInt(index, 10)];
  });
  
  return processed;
}
