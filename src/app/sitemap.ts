import { MetadataRoute } from 'next';
import { getProducts } from '@/services/productService';
import { getBlogs } from '@/services/blogService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com';
  const locales = ['vi', 'en'];

  // Static routes
  const staticRoutes = ['', '/about', '/contact', '/product', '/blog'].flatMap((route) => {
    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: route === '' ? 1 : 0.8,
      alternates: {
        languages: {
          vi: `${baseUrl}/vi${route}`,
          en: `${baseUrl}/en${route}`,
        },
      },
    }));
  });

  // Dynamic products
  let productsData: any[] = [];
  try {
    const productsRes = await getProducts({ per_page: 500 });
    if (productsRes && productsRes.data) {
      productsData = productsRes.data;
    }
  } catch (error) {
    console.error("Error fetching products for sitemap:", error);
  }

  const productRoutes = productsData.flatMap((product) => {
    const categorySlug = product.category?.slug || 'danh-muc';
    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}/product/${categorySlug}/${product.slug}`,
      lastModified: product.created_at ? new Date(product.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: {
        languages: {
          vi: `${baseUrl}/vi/product/${categorySlug}/${product.slug}`,
          en: `${baseUrl}/en/product/${categorySlug}/${product.slug}`,
        },
      },
    }));
  });

  // Dynamic blogs
  let blogsData: any[] = [];
  try {
    const blogsRes = await getBlogs({ per_page: 500 });
    if (blogsRes && blogsRes.data) {
      blogsData = blogsRes.data;
    }
  } catch (error) {
    console.error("Error fetching blogs for sitemap:", error);
  }

  const blogRoutes = blogsData.flatMap((blog) => {
    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}/blog/${blog.slug}`,
      lastModified: blog.created_at ? new Date(blog.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      alternates: {
        languages: {
          vi: `${baseUrl}/vi/blog/${blog.slug}`,
          en: `${baseUrl}/en/blog/${blog.slug}`,
        },
      },
    }));
  });

  // Dynamic policies
  let policiesData: any[] = [];
  try {
    const { getPolicies } = await import('@/services/policyService');
    const policiesRes = await getPolicies();
    if (policiesRes && policiesRes.data) {
      policiesData = policiesRes.data;
    }
  } catch (error) {
    console.error("Error fetching policies for sitemap:", error);
  }

  const policyRoutes = policiesData.flatMap((policy) => {
    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}/policy/${policy.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
      alternates: {
        languages: {
          vi: `${baseUrl}/vi/policy/${policy.slug}`,
          en: `${baseUrl}/en/policy/${policy.slug}`,
        },
      },
    }));
  });

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...policyRoutes];
}
