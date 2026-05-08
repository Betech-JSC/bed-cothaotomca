import { MetadataRoute } from 'next';
import { getProducts } from '@/services/productService';
import { getBlogs } from '@/services/blogService';
import { getPolicies } from '@/services/policyService';
import { slugify, getTranslation } from '@/lib/format';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com').replace(/\/$/, '');
  const locales = ['vi', 'en'];

  // Helper: build prefixed URL based on locale
  const buildUrl = (locale: string, path: string) =>
    locale === 'vi' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`;

  // 1. Static routes (Localized paths as per routing.ts)
  const staticRoutes: MetadataRoute.Sitemap = [
    { vi: '', en: '' },
    { vi: '/ve-chung-toi', en: '/about' },
    { vi: '/lien-he', en: '/contact' },
    { vi: '/san-pham', en: '/product' },
    { vi: '/tin-tuc', en: '/blog' },
    { vi: '/chinh-sach', en: '/policy' },
  ].flatMap((pathObj) =>
    locales.map((locale) => ({
      url: buildUrl(locale, pathObj[locale as 'vi' | 'en']),
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: pathObj.vi === '' ? 1 : 0.8,
    }))
  );

  // 2. Dynamic products
  const productRoutes: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    try {
      const productsRes = await getProducts({ per_page: 500, lang: locale });
      if (productsRes?.data) {
        const productBase = locale === 'vi' ? '/san-pham' : '/product';
        const localeProductRoutes = productsRes.data.map((product: any) => {
          const translation = getTranslation(product.translations, locale) as any;
          const name = translation?.name || product.name || "";
          
          const productCategory = product.categories && product.categories.length > 0 
            ? product.categories[0] 
            : product.category;
          const catTranslation = getTranslation(productCategory?.translations, locale) as any;
          const categoryName = catTranslation?.title || productCategory?.title || "san-pham";

          const productSlug = locale === 'vi' 
            ? (product.slug ? product.slug.replace(/-\d+$/, '') : slugify(name)) 
            : slugify(name);
          const categorySlug = locale === 'vi' 
            ? (productCategory?.slug || slugify(categoryName)) 
            : slugify(categoryName);

          return {
            url: buildUrl(locale, `${productBase}/${categorySlug}/${productSlug}`),
            lastModified: product.updated_at ? new Date(product.updated_at) : (product.created_at ? new Date(product.created_at) : new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          };
        });
        productRoutes.push(...localeProductRoutes);
      }
    } catch (error) {
      console.error(`Error fetching products for sitemap (${locale}):`, error);
    }
  }

  // 3. Dynamic blogs
  const blogRoutes: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    try {
      const blogsRes = await getBlogs({ per_page: 500, lang: locale });
      if (blogsRes?.data) {
        const blogBase = locale === 'vi' ? '/tin-tuc' : '/blog';
        const localeBlogRoutes = blogsRes.data.map((blog: any) => {
          const translation = getTranslation(blog.translations, locale) as any;
          const title = translation?.title || blog.title || "";
          const catTranslation = getTranslation(blog.category?.translations, locale) as any;
          const categoryName = catTranslation?.title || blog.category?.title || "tin-tuc";

          const blogSlug = locale === 'vi' ? (blog.slug || slugify(title)) : slugify(title);
          const categorySlug = locale === 'vi' ? (blog.category?.slug || slugify(categoryName)) : slugify(categoryName);

          return {
            url: buildUrl(locale, `${blogBase}/${categorySlug}/${blogSlug}`),
            lastModified: blog.updated_at ? new Date(blog.updated_at) : (blog.created_at ? new Date(blog.created_at) : new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          };
        });
        blogRoutes.push(...localeBlogRoutes);
      }
    } catch (error) {
      console.error(`Error fetching blogs for sitemap (${locale}):`, error);
    }
  }

  // 4. Dynamic policies
  const policyRoutes: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    try {
      const policiesRes = await getPolicies({ lang: locale });
      if (policiesRes?.data) {
        const policyBase = locale === 'vi' ? '/chinh-sach' : '/policy';
        const localePolicyRoutes = policiesRes.data.map((policy: any) => {
          const translation = getTranslation(policy.translations, locale) as any;
          const title = translation?.title || policy.title || "";
          const slug = locale === 'vi' ? (policy.slug || slugify(title)) : slugify(title);

          return {
            url: buildUrl(locale, `${policyBase}/${slug}`),
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
          };
        });
        policyRoutes.push(...localePolicyRoutes);
      }
    } catch (error) {
      console.error(`Error fetching policies for sitemap (${locale}):`, error);
    }
  }

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...policyRoutes];
}
