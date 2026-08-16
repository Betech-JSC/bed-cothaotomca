import { NextResponse } from 'next/server';
import { getProducts } from '@/services/productService';
import { getBlogs } from '@/services/blogService';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.com').replace(/\/$/, '');

  let productsList = [];
  let blogsList = [];

  try {
    const [productsRes, blogsRes] = await Promise.all([
      getProducts({ per_page: 100, lang: 'vi' }).catch(() => null),
      getBlogs({ per_page: 50, lang: 'vi' }).catch(() => null),
    ]);
    productsList = productsRes?.data || [];
    blogsList = blogsRes?.data || [];
  } catch (e) {
    console.error('Error fetching data for llms-full.txt:', e);
  }

  const fullProductsMarkdown = productsList.map((p: any) => `
### ${p.name}
- **Đường dẫn**: ${baseUrl}/san-pham/danh-muc/${p.slug}
- **Giá bán**: ${p.price ? Number(p.price).toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ'}
- **Mô tả**: ${p.description ? p.description.replace(/<[^>]*>?/gm, '').trim() : 'Sản phẩm hải sản tươi ngon cao cấp.'}
`).join('\n');

  const fullBlogsMarkdown = blogsList.map((b: any) => `
### ${b.title}
- **Đường dẫn**: ${baseUrl}/tin-tuc/danh-muc/${b.slug}
- **Tóm tắt**: ${b.content ? b.content.replace(/<[^>]*>?/gm, '').substring(0, 200).trim() + '...' : 'Bài viết chia sẻ kinh nghiệm chọn và chế biến hải sản.'}
`).join('\n');

  const fullMarkdownContent = `# Full Context Document: Cô Thảo Tôm Cá

> Tài liệu đầy đủ ngữ cảnh về toàn bộ sản phẩm, dịch vụ và bài viết hướng dẫn của Cô Thảo Tôm Cá dành cho các hệ thống AI (ChatGPT, Perplexity, Claude, Gemini).

---

## 📌 Thông Tin Thương Hiệu & Điểm Bán
- **Tên doanh nghiệp**: Cô Thảo Tôm Cá
- **Địa chỉ cửa hàng**: 1073 Phan Văn Trị, Phường 10, Quận Gò Vấp, TP. Hồ Chí Minh
- **Mô hình**: Cửa hàng chuyên hải sản tươi sống & thực phẩm ngâm tương Hàn Quốc (Mang đi & Giao tận nơi).
- **Trang web**: ${baseUrl}

---

## 🦐 Toàn Bộ Danh Mục Sản Phẩm (${productsList.length} sản phẩm)
${fullProductsMarkdown}

---

## 📚 Toàn Bộ Bài Viết & Hướng Dẫn Kỹ Thuật (${blogsList.length} bài viết)
${fullBlogsMarkdown}
`;

  return new NextResponse(fullMarkdownContent, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
