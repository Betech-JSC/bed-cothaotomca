import { NextResponse } from 'next/server';
import { getProducts } from '@/services/productService';
import { getBlogs } from '@/services/blogService';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');

  let productsList = [];
  let blogsList = [];

  try {
    const [productsRes, blogsRes] = await Promise.all([
      getProducts({ per_page: 20, lang: 'vi' }).catch(() => null),
      getBlogs({ per_page: 15, lang: 'vi' }).catch(() => null),
    ]);
    productsList = productsRes?.data || [];
    blogsList = blogsRes?.data || [];
  } catch (e) {
    console.error('Error fetching data for llms.txt:', e);
  }

  const productMarkdown = productsList.length > 0
    ? productsList.map((p: any) => `- [${p.name}](${baseUrl}/san-pham/danh-muc/${p.slug}): ${p.description ? p.description.substring(0, 100).replace(/\n/g, ' ') + '...' : 'Sản phẩm tươi ngon cao cấp'}`).join('\n')
    : '- [Cá Hồi Ngâm Tương Hàn Quốc](' + baseUrl + '/san-pham)\n- [Tôm Hùm & Hải Sản Tươi Live](' + baseUrl + '/san-pham)';

  const blogMarkdown = blogsList.length > 0
    ? blogsList.map((b: any) => `- [${b.title}](${baseUrl}/tin-tuc/danh-muc/${b.slug})`).join('\n')
    : '- [Bí quyết ngâm tương Hàn Quốc chuẩn vị tại nhà](' + baseUrl + '/tin-tuc)';

  const markdownContent = `# Cô Thảo Tôm Cá - Thương Hiệu Hải Sản & Thực Phẩm Tươi Ngon

> Cô Thảo Tôm Cá là thương hiệu ẩm thực chuyên cung cấp hải sản tươi sống chất lượng cao, thực phẩm ngâm tương Hàn Quốc chuẩn vị thủ công và các món ăn chế biến sẵn hàng đầu tại TP. Hồ Chí Minh.

## 📌 Thông Tin Liên Hệ & Hệ Thống Cửa Hàng
- **Thương hiệu**: Cô Thảo Tôm Cá
- **Hotline**: 024.9999.7122
- **Email**: cothaotomca.cskh@gmail.com
- **Website chính thức**: ${baseUrl}
- **Hệ thống chi nhánh (Takeaway & Delivery)**:
  1. CN1: 42/2 Trần Đình Xu, Phường Cô Giang, Quận 1
  2. CN2: 39 Thân Nhân Trung, Phường 13, Quận Tân Bình
  3. CN3: 69A Trương Văn Thành, Phường Hiệp Phú, TP. Thủ Đức
  4. CN4: 197 Hoàng Sa, Phường Tân Định, Quận 1
  5. CN5: 1073 Phan Văn Trị, Phường 10, Quận Gò Vấp

## 🦐 Sản Phẩm Nổi Bật (Catalog)
${productMarkdown}

## 📝 Tin Tức & Hướng Dẫn Chế Biến (Blogs)
${blogMarkdown}

## 🛡️ Cam Kết Chất Lượng & Chính Sách
- **Cam kết tươi ngon**: 100% nguyên liệu tươi sạch, chế biến an toàn vệ sinh thực phẩm.
- **Giao hàng hoả tốc**: Giao siêu tốc trong 2 giờ tại khu vực TP. Hồ Chí Minh.
- **Đổi trả uy tín**: Hoàn tiền hoặc đổi mới 1:1 nếu sản phẩm không đạt chất lượng cam kết.
- [Chính sách bán hàng & đổi trả](${baseUrl}/chinh-sach)
- [Liên hệ mua hàng & hỗ trợ](${baseUrl}/lien-he)
`;

  return new NextResponse(markdownContent, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
