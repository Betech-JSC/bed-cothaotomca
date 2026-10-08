import { MetadataRoute } from 'next';
import { getProducts } from '@/services/productService';
import { getBlogs } from '@/services/blogService';
import { getPolicies } from '@/services/policyService';
import { slugify } from '@/lib/format';
import { getProductLocalizedSlugs } from '@/lib/productHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const locales = ['vi', 'en'];

  // Helper: build prefixed URL based on locale
  const buildUrl = (locale: string, path: string) =>
    locale === 'vi' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`;

  // 1. Static routes (Localized paths as per routing.ts)
  const staticRouteDefs = [
    { vi: '', en: '', priority: 1.0 },
    { vi: '/ve-chung-toi', en: '/about', priority: 0.8 },
    { vi: '/lien-he', en: '/contact', priority: 0.8 },
    { vi: '/san-pham', en: '/product', priority: 0.8 },
    { vi: '/tin-tuc', en: '/blog', priority: 0.8 },
    { vi: '/chinh-sach', en: '/policy', priority: 0.8 },
    { vi: '/dang-nhap', en: '/signin', priority: 0.5 },
    { vi: '/dang-ky', en: '/signup', priority: 0.5 },
    { vi: '/tra-cuu-don-hang', en: '/order-lookup', priority: 0.6 },
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticRouteDefs.flatMap((item) => {
    const viUrl = buildUrl('vi', item.vi);
    const enUrl = buildUrl('en', item.en);

    return locales.map((locale) => ({
      url: locale === 'vi' ? viUrl : enUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: item.priority,
      alternates: {
        languages: {
          vi: viUrl,
          en: enUrl,
        },
      },
    }));
  });

  // 2. Dynamic products
  const productRoutes: MetadataRoute.Sitemap = [];
  try {
    const productsRes = await getProducts({ per_page: 500 });
    if (productsRes?.data) {
      productsRes.data.forEach((product: any) => {
        const { viCatSlug, viProductSlug, enCatSlug, enProductSlug } = getProductLocalizedSlugs(product);
        const viUrl = buildUrl('vi', `/san-pham/${viCatSlug}/${viProductSlug}`);
        const enUrl = buildUrl('en', `/product/${enCatSlug}/${enProductSlug}`);

        const lastModified = product.updated_at
          ? new Date(product.updated_at)
          : (product.created_at ? new Date(product.created_at) : new Date());

        locales.forEach((locale) => {
          productRoutes.push({
            url: locale === 'vi' ? viUrl : enUrl,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
            alternates: {
              languages: {
                vi: viUrl,
                en: enUrl,
              },
            },
          });
        });
      });
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  // 3. Dynamic blogs
  const blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const blogsRes = await getBlogs({ per_page: 500 });
    if (blogsRes?.data) {
      blogsRes.data.forEach((blog: any) => {
        const viTrans = (blog.translations || []).find((t: any) => t.locale === 'vi');
        const enTrans = (blog.translations || []).find((t: any) => t.locale === 'en');

        const viCategory = blog.category;
        const viCatTrans = (viCategory?.translations || []).find((t: any) => t.locale === 'vi');
        const enCatTrans = (viCategory?.translations || []).find((t: any) => t.locale === 'en');

        const viCatSlug = viCategory?.slug || slugify(viCatTrans?.title || viCategory?.title || 'tin-tuc');
        const enCatSlug = (enCatTrans as any)?.slug || slugify(enCatTrans?.title || '') || viCategory?.slug || 'blog';

        const viBlogSlug = (viTrans as any)?.slug || blog.slug || slugify(viTrans?.title || blog.title || '');
        const enBlogSlug = (enTrans as any)?.slug || slugify(enTrans?.title || '') || blog.slug || '';

        const viUrl = buildUrl('vi', `/tin-tuc/${viCatSlug}/${viBlogSlug}`);
        const enUrl = buildUrl('en', `/blog/${enCatSlug}/${enBlogSlug}`);

        const lastModified = blog.updated_at
          ? new Date(blog.updated_at)
          : (blog.created_at ? new Date(blog.created_at) : new Date());

        locales.forEach((locale) => {
          blogRoutes.push({
            url: locale === 'vi' ? viUrl : enUrl,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
            alternates: {
              languages: {
                vi: viUrl,
                en: enUrl,
              },
            },
          });
        });
      });
    }
  } catch (error) {
    console.error('Error fetching blogs for sitemap:', error);
  }

  // 4. Dynamic policies
  const policyRoutes: MetadataRoute.Sitemap = [];
  try {
    const policiesRes = await getPolicies();
    if (policiesRes?.data) {
      policiesRes.data.forEach((policy: any) => {
        const viTrans = (policy.translations || []).find((t: any) => t.locale === 'vi');
        const enTrans = (policy.translations || []).find((t: any) => t.locale === 'en');

        const viSlug = (viTrans as any)?.slug || policy.slug || slugify(viTrans?.title || policy.title || '');
        const enSlug = (enTrans as any)?.slug || slugify(enTrans?.title || '') || policy.slug || '';

        const viUrl = buildUrl('vi', `/chinh-sach/${viSlug}`);
        const enUrl = buildUrl('en', `/policy/${enSlug}`);

        const lastModified = policy.updated_at
          ? new Date(policy.updated_at)
          : (policy.created_at ? new Date(policy.created_at) : new Date());

        locales.forEach((locale) => {
          policyRoutes.push({
            url: locale === 'vi' ? viUrl : enUrl,
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.5,
            alternates: {
              languages: {
                vi: viUrl,
                en: enUrl,
              },
            },
          });
        });
      });
    }
  } catch (error) {
    console.error('Error fetching policies for sitemap:', error);
  }

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...policyRoutes];
}
