import { MetadataRoute } from 'next';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
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
    const [viProductsRes, enProductsRes, viCatsRes, enCatsRes] = await Promise.all([
      getProducts({ per_page: 500, lang: 'vi' }),
      getProducts({ per_page: 500, lang: 'en' }).catch(() => null),
      getCategories('vi').catch(() => null),
      getCategories('en').catch(() => null),
    ]);

    const enProductsById = new Map<number, any>();
    if (enProductsRes?.data) {
      enProductsRes.data.forEach((p: any) => {
        if (p?.id) enProductsById.set(Number(p.id), p);
      });
    }

    const viCatsById = new Map<number, any>();
    const viCatsBySlug = new Map<string, any>();
    if (viCatsRes?.data) {
      viCatsRes.data.forEach((c: any) => {
        if (c?.id) viCatsById.set(Number(c.id), c);
        if (c?.slug) viCatsBySlug.set(String(c.slug), c);
      });
    }

    const enCatsById = new Map<number, any>();
    if (enCatsRes?.data) {
      enCatsRes.data.forEach((c: any) => {
        if (c?.id) enCatsById.set(Number(c.id), c);
      });
    }

    if (viProductsRes?.data) {
      viProductsRes.data.forEach((product: any) => {
        const enProduct = enProductsById.get(Number(product.id));
        const baseSlugs = getProductLocalizedSlugs(product);
        const cat = product?.categories && product.categories.length > 0
          ? product.categories[0]
          : (product?.category || (enProduct?.categories && enProduct.categories.length > 0 ? enProduct.categories[0] : enProduct?.category));
        const rawCatSlug = cat?.slug || product?.category_slug || baseSlugs.viCatSlug || '';
        const matchedViCatBySlug = rawCatSlug ? viCatsBySlug.get(rawCatSlug) : null;
        const catId = Number(cat?.id || product?.category_id || enProduct?.category_id || matchedViCatBySlug?.id || 0);
        const viCatObj = catId ? viCatsById.get(catId) : matchedViCatBySlug;
        const enCatObj = catId ? enCatsById.get(catId) : null;
        const enCatTrans = (enCatObj?.translations || cat?.translations || []).find((t: any) => t.locale === 'en');

        const viCatSlug = product?.alternate_slugs?.vi?.category_slug
          || viCatObj?.slug
          || baseSlugs.viCatSlug
          || 'san-pham';
        const viProductSlug = product?.alternate_slugs?.vi?.slug
          || product?.slug
          || baseSlugs.viProductSlug;

        const enCatSlug = product?.alternate_slugs?.en?.category_slug
          || enProduct?.alternate_slugs?.en?.category_slug
          || enCatObj?.alternate_slugs?.en?.slug
          || (enCatTrans as any)?.slug
          || slugify(enCatTrans?.title || enCatObj?.title || '')
          || (enCatObj?.slug && enCatObj.slug !== viCatSlug ? enCatObj.slug : '')
          || (baseSlugs.enCatSlug && baseSlugs.enCatSlug !== viCatSlug ? baseSlugs.enCatSlug : '')
          || slugify(enProduct?.category?.title || '')
          || baseSlugs.enCatSlug
          || 'product';
        const enProductSlug = product?.alternate_slugs?.en?.slug
          || enProduct?.alternate_slugs?.en?.slug
          || (enProduct?.slug && enProduct.slug !== viProductSlug ? enProduct.slug : '')
          || slugify(enProduct?.custom_name || enProduct?.name || '')
          || baseSlugs.enProductSlug
          || viProductSlug;

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
    const [blogsRes, enBlogsRes] = await Promise.all([
      getBlogs({ per_page: 500, lang: 'vi' }),
      getBlogs({ per_page: 500, lang: 'en' }).catch(() => null),
    ]);

    const enBlogsById = new Map<number, any>();
    if (enBlogsRes?.data) {
      enBlogsRes.data.forEach((b: any) => {
        if (b?.id) enBlogsById.set(Number(b.id), b);
      });
    }

    if (blogsRes?.data) {
      blogsRes.data.forEach((blog: any) => {
        const enBlog = enBlogsById.get(Number(blog.id));
        const viTrans = (blog.translations || []).find((t: any) => t.locale === 'vi');
        const enTrans = (blog.translations || []).find((t: any) => t.locale === 'en')
          || (enBlog?.translations || []).find((t: any) => t.locale === 'en');

        const viCategory = blog.category;
        const enCategory = enBlog?.category || blog.category;
        const viCatTrans = (viCategory?.translations || []).find((t: any) => t.locale === 'vi');
        const enCatTrans = (viCategory?.translations || []).find((t: any) => t.locale === 'en')
          || (enCategory?.translations || []).find((t: any) => t.locale === 'en');

        const viCatSlug = viCategory?.slug || slugify(viCatTrans?.title || viCategory?.title || 'tin-tuc') || 'tin-tuc';
        const rawEnCatSlug = (enCatTrans as any)?.slug
          || slugify(enCatTrans?.title || enCategory?.title || '')
          || enCategory?.slug
          || 'news';
        const enCatSlug = rawEnCatSlug === 'blog' ? 'news' : rawEnCatSlug;

        const viBlogSlug = (viTrans as any)?.slug || blog.slug || slugify(viTrans?.title || blog.title || '');
        const enBlogSlug = (enTrans as any)?.slug
          || (enBlog?.slug && enBlog.slug !== viBlogSlug ? enBlog.slug : '')
          || slugify(enTrans?.title || enBlog?.title || '')
          || viBlogSlug;

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
