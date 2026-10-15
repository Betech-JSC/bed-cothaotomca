import { MetadataRoute } from 'next';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import { getBlogs, getBlogCategories } from '@/services/blogService';
import { getPolicies } from '@/services/policyService';
import { slugify, localizePolicyItem, filterAndLocalizeBlogs, cleanBlogSlugSegment } from '@/lib/format';
import { getProductLocalizedSlugs, translateCategorySlug } from '@/lib/productHelper';

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
    { vi: '/thong-tin-ca-nhan', en: '/profile', priority: 0.5 },
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
          'x-default': viUrl,
        },
      },
    }));
  });

  // 2. Dynamic product categories & products
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

    if (viCatsRes?.data) {
      viCatsRes.data.forEach((viCat: any) => {
        const enCat = viCat?.id ? enCatsById.get(Number(viCat.id)) : null;
        const enTrans = (enCat?.translations || viCat?.translations || []).find((t: any) => t.locale === 'en');
        const viCatSlug = viCat?.alternate_slugs?.vi?.slug || viCat?.slug || slugify(viCat?.title || '');
        if (!viCatSlug) return;
        const enCatSlug =
          viCat?.alternate_slugs?.en?.slug ||
          enCat?.alternate_slugs?.en?.slug ||
          (enTrans as any)?.slug ||
          slugify(enTrans?.title || enCat?.title || '') ||
          (enCat?.slug && enCat.slug !== viCatSlug ? enCat.slug : '') ||
          translateCategorySlug(viCatSlug, 'en') ||
          viCatSlug;

        const viCatUrl = buildUrl('vi', `/san-pham/${viCatSlug}`);
        const enCatUrl = buildUrl('en', `/product/${enCatSlug}`);
        locales.forEach((locale) => {
          productRoutes.push({
            url: locale === 'vi' ? viCatUrl : enCatUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.75,
            alternates: {
              languages: {
                vi: viCatUrl,
                en: enCatUrl,
                'x-default': viCatUrl,
              },
            },
          });
        });
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
          || translateCategorySlug(rawCatSlug, 'vi')
          || 'san-pham';
        const viProductSlug = product?.alternate_slugs?.vi?.slug
          || product?.slug_vi
          || product?.slug
          || baseSlugs.viProductSlug;

        const enCatSlug = product?.alternate_slugs?.en?.category_slug
          || enProduct?.alternate_slugs?.en?.category_slug
          || enCatObj?.alternate_slugs?.en?.slug
          || (enCatTrans as any)?.slug
          || slugify(enCatTrans?.title || enCatObj?.title || '')
          || (enCatObj?.slug && enCatObj.slug !== viCatSlug ? enCatObj.slug : '')
          || (baseSlugs.enCatSlug && baseSlugs.enCatSlug !== viCatSlug ? baseSlugs.enCatSlug : '')
          || translateCategorySlug(viCatSlug, 'en')
          || slugify(enProduct?.category?.title || '')
          || baseSlugs.enCatSlug
          || 'product';
        const enProductSlug = product?.alternate_slugs?.en?.slug
          || enProduct?.alternate_slugs?.en?.slug
          || product?.slug_en
          || enProduct?.slug_en
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
                'x-default': viUrl,
              },
            },
          });
        });
      });
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  // 3. Dynamic blog categories & blogs
  const blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const [blogsRes, enBlogsRes, viBlogCatsRes, enBlogCatsRes] = await Promise.all([
      getBlogs({ per_page: 500, lang: 'vi' }),
      getBlogs({ per_page: 500, lang: 'en' }).catch(() => null),
      getBlogCategories({ lang: 'vi' }).catch(() => null),
      getBlogCategories({ lang: 'en' }).catch(() => null),
    ]);

    const enBlogCatsById = new Map<number, any>();
    if (enBlogCatsRes?.data) {
      enBlogCatsRes.data.forEach((c: any) => {
        if (c?.id) enBlogCatsById.set(Number(c.id), c);
      });
    }

    if (viBlogCatsRes?.data) {
      viBlogCatsRes.data.forEach((viCat: any) => {
        const enCat = viCat?.id ? enBlogCatsById.get(Number(viCat.id)) : null;
        const viTrans = (viCat?.translations || []).find((t: any) => t.locale === 'vi');
        const enTrans = (enCat?.translations || viCat?.translations || []).find((t: any) => t.locale === 'en');
        const viCatSlug = cleanBlogSlugSegment(viCat?.slug || slugify(viTrans?.title || viCat?.title || '')) || 'tin-tuc';
        const rawEnCatSlug = cleanBlogSlugSegment(
          (enTrans as any)?.slug ||
          slugify(enTrans?.title || enCat?.title || '') ||
          enCat?.slug ||
          'news'
        ) || 'news';
        const enCatSlug = rawEnCatSlug === 'blog' ? 'news' : rawEnCatSlug;

        const viCatUrl = buildUrl('vi', `/tin-tuc/${viCatSlug}`);
        const enCatUrl = buildUrl('en', `/blog/${enCatSlug}`);
        locales.forEach((locale) => {
          blogRoutes.push({
            url: locale === 'vi' ? viCatUrl : enCatUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.65,
            alternates: {
              languages: {
                vi: viCatUrl,
                en: enCatUrl,
                'x-default': viCatUrl,
              },
            },
          });
        });
      });
    }

    const enBlogsById = new Map<number, any>();
    if (enBlogsRes?.data) {
      enBlogsRes.data.forEach((b: any) => {
        if (b?.id) enBlogsById.set(Number(b.id), b);
      });
    }

    const localizedViBlogs = filterAndLocalizeBlogs(blogsRes?.data || [], 'vi');
    const localizedEnBlogs = filterAndLocalizeBlogs(enBlogsRes?.data || [], 'en');
    const localizedEnById = new Map<number, any>();
    localizedEnBlogs.forEach((b: any) => {
      if (b?.id) localizedEnById.set(Number(b.id), b);
    });

    localizedViBlogs.forEach((blog: any) => {
      const enBlog = localizedEnById.get(Number(blog.id)) || enBlogsById.get(Number(blog.id));
      const viCatSlug = cleanBlogSlugSegment(blog.category_slug_vi || blog.category?.slug || 'tin-tuc') || 'tin-tuc';
      const rawEnCatSlug = cleanBlogSlugSegment(
        blog.category_slug_en ||
        enBlog?.category_slug_en ||
        enBlog?.category?.slug ||
        'news'
      ) || 'news';
      const enCatSlug = rawEnCatSlug === 'blog' ? 'news' : rawEnCatSlug;

      const viBlogSlug = cleanBlogSlugSegment(blog.slug_vi || blog.slug || slugify(blog.title || ''));
      const enBlogSlug = cleanBlogSlugSegment(
        blog.slug_en ||
        enBlog?.slug_en ||
        (enBlog?.slug && enBlog.slug !== viBlogSlug ? enBlog.slug : '') ||
        slugify(enBlog?.title || '') ||
        viBlogSlug
      );

      if (!viBlogSlug) return;

      const viUrl = buildUrl('vi', `/tin-tuc/${viCatSlug}/${viBlogSlug}`);
      const enUrl = buildUrl('en', `/blog/${enCatSlug}/${enBlogSlug || viBlogSlug}`);

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
              'x-default': viUrl,
            },
          },
        });
      });
    });
  } catch (error) {
    console.error('Error fetching blogs for sitemap:', error);
  }

  // 4. Dynamic policies
  const policyRoutes: MetadataRoute.Sitemap = [];
  try {
    const [viPoliciesRes, enPoliciesRes] = await Promise.all([
      getPolicies({ lang: 'vi' }),
      getPolicies({ lang: 'en' }).catch(() => null),
    ]);

    const enPoliciesById = new Map<number, any>();
    if (enPoliciesRes?.data) {
      enPoliciesRes.data.forEach((p: any) => {
        if (p?.id) enPoliciesById.set(Number(p.id), p);
      });
    }

    if (viPoliciesRes?.data) {
      viPoliciesRes.data.forEach((policy: any) => {
        const enPolicyRaw = policy?.id ? enPoliciesById.get(Number(policy.id)) : null;
        const localizedVi = localizePolicyItem(policy, 'vi');
        const localizedEn = localizePolicyItem(enPolicyRaw || policy, 'en');

        const viSlug = localizedVi?.slug_vi || localizedVi?.slug || policy.slug || slugify(policy.title || '');
        const enSlug =
          localizedVi?.slug_en ||
          localizedEn?.slug_en ||
          (localizedEn?.slug && localizedEn.slug !== viSlug ? localizedEn.slug : '') ||
          viSlug;

        if (!viSlug) return;

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
                'x-default': viUrl,
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

