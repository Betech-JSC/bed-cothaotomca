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
  return new Intl.NumberFormat('vi-VN').format(price).replace(/,/g, '.') + ' VNĐ';
}
