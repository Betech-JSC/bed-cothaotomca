import SectionSliderPost from '@/components/Common/SectionSliderPost';
import SectionHero from '@/components/Hero/SectionHero';
import SectionHotProduct from '@/components/Hero/SectionHotProduct';
import SectionReason from '@/components/Hero/SectionReason';
import Arrow from '@/components/Icons/Arrow';
import Phone from '@/components/Icons/Phone';
import { Link } from '@/i18n/i18n-navigation';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales as supportedLocales } from '@/i18n/config';
import Image from 'next/image';
import { getApi } from '@/services/apiService';
import { HeroBanner } from '@/services/heroBannerService';
import { getBanners, type Banner } from '@/services/bannerService';
import HomePromotionPopup from '@/components/Home/HomePromotionPopup';
import { Product } from '@/services/productService';
import { Category } from '@/services/categoryService';
import { slugify, formatImageUrl, filterAndLocalizeBlogs, hasVietnameseDiacritics } from '@/lib/format';
import { getProductLocalizedSlugs } from '@/lib/productHelper';
import { getBlogs, Blog } from '@/services/blogService';
import AnimateOnScroll from "@/components/Animated/animated-appear";
import { Metadata } from 'next';
import { getMetaPage, resolveMetaTitle, resolveMetaDescription, resolveMetaKeywords } from '@/services/seoService';

export const revalidate = 60; // ISR: revalidate mỗi 60 giây

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  const meta = await getMetaPage('home', locale).catch(() => null);

  const rawBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000'))
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'https://cothaotomca.vn';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');
  const viUrl = `${baseUrl}`;
  const enUrl = `${baseUrl}/en`;
  const canonicalUrl = isEn ? enUrl : viUrl;

  const defaultTitle = isEn
    ? 'Co Thao Tom Ca | Premium Seafood & Specialties'
    : 'Cô Thảo Tôm Cá | Chuyên cung cấp Đặc Sản Tôm Cá, Hải Sản Tươi Ngon';
  const defaultDescription = isEn
    ? 'Co Thao Tom Ca proudly provides high quality fresh and marinated seafood. Clear origin, food safety and reliable delivery.'
    : 'Cô Thảo Tôm Cá tự hào mang đến các sản phẩm thủy hải sản, tôm cá tươi sạch, chất lượng cao. Nguồn gốc rõ ràng, vệ sinh an toàn thực phẩm, giao hàng tận nơi.';

  const title = resolveMetaTitle(meta, locale, defaultTitle);
  const description = resolveMetaDescription(meta, locale, defaultDescription);
  const keywords = resolveMetaKeywords(meta, locale);

  let robots: any = undefined;
  if (meta?.noindex || meta?.nofollow) {
    robots = {
      index: !meta.noindex,
      follow: !meta.nofollow,
    };
  }

  const ogImage = (isEn && meta?.og_image_en) || meta?.og_image;

  return {
    title,
    description,
    keywords,
    robots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: viUrl,
        en: enUrl,
        'x-default': viUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: ogImage ? [ogImage] : undefined,
      type: 'website',
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // If the locale is not supported, render the app's not-found (404)
  if (!supportedLocales.includes(locale as any)) {
    notFound();
  }
  const t = await getTranslations({ locale });

  const [heroBannersData, sliderBannersData, popupBannersData, productsData, categoriesData, blogsData] = await Promise.all([
    getApi<HeroBanner>('banners', { params: { position: 'hero_home', lang: locale } }).catch(() => ({ data: [] })),
    getApi<HeroBanner>('banners', { params: { position: 'slide_home', lang: locale } }).catch(() => ({ data: [] })),
    getBanners({ position: 'popup_home', lang: locale }).catch(() => ({ data: [] })),
    getApi<Product>('products', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<Category>('categories', { params: { lang: locale, is_featured: true } }).catch(() => ({ data: [] })),
    getBlogs({ per_page: 10, lang: locale }).catch(() => ({ data: [] }))
  ]);

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const sliderHero = heroBannersData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const rawTitle = translation?.title || (locale === 'en' ? (item as any).title_en || (item as any).en_title : '') || item.title || (locale === 'en' ? "Co Thao Tom Ca Banner" : "Cô Thảo Tôm Cá");
    const title =
      locale === 'en' && (hasVietnameseDiacritics(rawTitle) || item.title === 'Banner Trang chủ')
        ? 'Co Thao Tom Ca - Fresh Seafood Banner'
        : rawTitle;
    const rawDesktopAlt = translation?.title || item.image?.alt || title;
    const rawMobileAlt = translation?.title || item.image_mobile?.alt || title;
    return {
      image: {
        url: formatImageUrl(item.image) || "/cover.jpg",
        alt: locale === 'en' && hasVietnameseDiacritics(rawDesktopAlt) ? title : rawDesktopAlt
      },
      image_mobile: {
        url: formatImageUrl(item.image_mobile) || formatImageUrl(item.image) || "/cover.jpg",
        alt: locale === 'en' && hasVietnameseDiacritics(rawMobileAlt) ? title : rawMobileAlt
      },
      title: title,
    };
  });

  const productsDisplay = productsData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const name = translation?.name || item.name;

    // Get category from categories array (new structure) or category object (old structure)
    const productCategory = item.categories && item.categories.length > 0
      ? item.categories[0]
      : item.category;

    const catTranslation = getTranslation(productCategory?.translations, locale) as any;
    const categoryName = catTranslation?.title || productCategory?.title || (locale === 'en' ? 'All' : 'Tất cả');
    const { viCatSlug, viProductSlug, enCatSlug, enProductSlug } = getProductLocalizedSlugs(item);
    const categorySlug = locale === 'en'
      ? (enCatSlug || slugify(categoryName || productCategory?.slug || "") || productCategory?.slug)
      : (viCatSlug || productCategory?.slug || slugify(categoryName));
    const productSlug = locale === 'en'
      ? (enProductSlug || item.slug || slugify(name))
      : (viProductSlug || item.slug || slugify(name));

    const rawDesc = translation?.description || item.description;
    const cleanedDesc =
      locale === 'en' && typeof rawDesc === 'string'
        ? rawDesc.replace(/\bat Bếp\b/gi, 'at Cô Thảo Tôm Cá')
        : rawDesc;

    return {
      id: item.id,
      title: name,
      custom_name: item.custom_name,
      slug: productSlug,
      price: parseFloat(item.price as string),
      campaign_price: (item as any)?.campaign_price,
      original_price: (item as any)?.original_price,
      active_campaign: (item as any)?.active_campaign,
      category: { title: categoryName, slug: categorySlug },
      ingredients: item.ingredients?.map(ing => slugify(ing.name)) || [],
      image: {
        url: formatImageUrl(item.image) || "/cover.jpg",
        alt: name
      },
      description: cleanedDesc,
      variants: item.variants,
      created_at: '2024-03-15T00:00:00Z',
    };
  });

  const categoriesDisplay = categoriesData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const title = translation?.title || item.title;
    const slug = locale === 'vi' ? (item.slug || slugify(title)) : (slugify(title || item.slug || "") || item.slug);
    return {
      id: item.id,
      title: title,
      slug: slug,
      image: {
        url: formatImageUrl(item.image) || 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop',
        alt: title
      },
    };
  });

  const sliders = sliderBannersData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const rawSlideTitle = translation?.title || (locale === 'en' ? (item as any).title_en || (item as any).en_title : '') || item.title || "";
    const slideAlt = locale === 'en' && hasVietnameseDiacritics(rawSlideTitle)
      ? "Co Thao Tom Ca"
      : (rawSlideTitle || (locale === 'en' ? "Co Thao Tom Ca" : ""));
    return {
      image: {
        url: formatImageUrl(item.image) || "/cover.jpg",
        alt: slideAlt
      },
      image_mobile: {
        url: formatImageUrl(item.image_mobile) || formatImageUrl(item.image) || "/cover.jpg",
        alt: slideAlt
      },
      title: slideAlt,
      description: translation?.description || item.description || "",
    };
  });

  const postsDisplay = filterAndLocalizeBlogs(blogsData.data, locale).map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const catTranslation = getTranslation(item.category?.translations, locale) as any;
    const title = (locale === 'en' ? item.title : (translation?.title || item.title)) || item.title;
    const categoryName = (locale === 'en' ? item.category?.title : (catTranslation?.title || item.category?.title)) || t('blog.category');
    let catSlug = item.category?.slug || slugify(categoryName) || (locale === 'en' ? 'news' : 'tin-tuc');
    if (locale === 'en' && catSlug === 'blog') {
      catSlug = 'news';
    }

    return {
      image: {
        url: formatImageUrl(item.thumbnail) || "/cover.jpg",
        alt: title,
      },
      title: title,
      slug: item.slug,
      category: {
        title: categoryName,
        slug: catSlug,
      },
      created_at: item.created_at,
    };
  });

  const popupBannerRaw = (popupBannersData.data || []).find(
    (b) => b.status === 1 || b.status === true || (b.status as any) === undefined
  ) || (popupBannersData.data?.[0] ?? null);

  let popupBanner: Banner | null = null;
  if (popupBannerRaw) {
    const translation = getTranslation(popupBannerRaw.translations, locale) as any;
    popupBanner = {
      ...popupBannerRaw,
      title: translation?.title || popupBannerRaw.title,
      description: translation?.description || popupBannerRaw.description,
      button_text: translation?.button_text || (popupBannerRaw as any).button_text,
    };
  }

  return (
    <main>
      <HomePromotionPopup banner={popupBanner} />
      <SectionHero items={sliderHero} />
      <section className="py-[50px] md:pt-28 md:pb-20 xl:py-[100px] relative overflow-hidden">
        <div className="absolute top-2 md:top-3 xl:top-6 left-0 max-w-[200px] md:max-w-[220px] lg:max-w-[260px] xl:max-w-[420px] w-full h-[76px] md:h-[72px] lg:h-[85px] xl:h-[130px] pointer-events-none">
          <AnimateOnScroll animate="slideleft" delay={0} className="w-full h-full">
            <Image
              src="/images/home/image-fish.png"
              alt="image fish"
              fill
              className="object-cover w-full h-full"
            />
          </AnimateOnScroll>
        </div>

        <div className="absolute -bottom-6 right-0 md:-right-16 max-w-[180px] md:max-w-[220px] lg:max-w-[300px] xl:max-w-[427px] w-full h-[150px] md:h-[190px] lg:h-[250px] xl:h-[350px] pointer-events-none">
          <AnimateOnScroll animate="slideright" delay={0} className="w-full h-full">
            <Image
              src="/images/home/image-crab.png"
              alt="image crab"
              fill
              className="object-cover w-full h-full"
            />
          </AnimateOnScroll>
        </div>
        <div className="container">
          <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">
            <div className="col-span-full md:col-span-11 lg:col-span-10 xl:col-span-8">
              <AnimateOnScroll animate="slideup" delay={0} className="headline-3 text-secondary">{t('home.section-2.subTitle')}</AnimateOnScroll>
              <div className="relative mt-4 mb-[94px] md:mb-8 xl:mb-12 md:max-w-[540px] lg:max-w-[640px] xl:max-w-full md:pr-[140px] lg:pr-[160px] xl:pr-0">
                <AnimateOnScroll animate="slideup" delay={0} className='z-10 relative'>
                  <h1 className="display-1 text-primary">{t('home.section-2.title')}</h1>
                </AnimateOnScroll>
                <div className="absolute block top-16 md:top-2 lg:top-4 right-0 md:-right-6 lg:-right-12 xl:-right-20 size-[120px] md:size-[150px] lg:size-[190px] xl:size-[250px] pointer-events-none">
                  <Image
                    src="/images/home/image-certificate.png"
                    alt="image certificate"
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <AnimateOnScroll animate="slideup" delay={300} className="max-w-[720px] lg:max-w-[680px] w-full space-y-3 body-1 text-gray-800">
                <p dangerouslySetInnerHTML={{ __html: t('home.section-2.description.text1').replaceAll('<br/>', ' ').replaceAll('<br>', ' ') }}></p>
                <p dangerouslySetInnerHTML={{ __html: t('home.section-2.description.text2').replaceAll('<br/>', ' ').replaceAll('<br>', ' ') }}></p>
                <p dangerouslySetInnerHTML={{ __html: t('home.section-2.description.text3').replaceAll('<br/>', ' ').replaceAll('<br>', ' ') }}></p>
                <strong><p dangerouslySetInnerHTML={{ __html: t('home.section-2.description.text4').replaceAll('<br/>', ' ').replaceAll('<br>', ' ') }}></p></strong>
              </AnimateOnScroll>
              <div className="md:mt-12 mt-6 xl:mt-16">
                <Link href="/about" className="btn btn-primary max-w-[240px]">
                  {t('button.about')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SectionReason items={sliders} />
      <SectionHotProduct products={productsDisplay} />
      <section className="relative max-md:pb-10">
        <div className="md:aspect-w-2 md:aspect-h-1 aspect-w-9 aspect-h-10">
          <Image
            src="/images/home/bg-give.png"
            alt="background give"
            fill
            className="object-cover w-full h-full md:block hidden"
          />
          <Image
            src="/images/home/bg-give-mobile.png"
            alt="background give mobile"
            fill
            className="object-cover w-full h-full md:hidden"
          />
        </div>
        <div className="absolute top-[100px] md:top-5 lg:top-10 xl:top-[100px] left-0 w-full">
          <div className="container">
            <AnimateOnScroll animate="slideup">
              {locale == 'vi' ? (
                <h2 className="display-2 max-md:text-[36px] md:text-[28px] lg:text-[36px] xl:text-[48px] md:leading-tight text-center text-primary">
                  <span>{t('home.section-5.title.text1')}</span>{' '}<span className="text-secondary">{t('home.section-5.title.text2')}</span><span className="hidden md:inline"> </span><br className="md:hidden" /><span>{t('home.section-5.title.text3')}</span>
                </h2>
              ) : (
                <h2 className="display-2 max-md:text-[36px] md:text-[28px] lg:text-[36px] xl:text-[48px] md:leading-tight text-center text-primary">
                  <span className="text-secondary">{t('home.section-5.title.text1')}</span>{t('home.section-5.title.text2')}<span className="text-secondary">{t('home.section-5.title.text3')}</span>{t('home.section-5.title.text4')}
                </h2>
              )}
            </AnimateOnScroll>
          </div>
        </div>
      </section>
      <section className="relative pt-8 pb-12 md:py-20 xl:py-[100px] md:bg-primary">
        <div className="absolute top-[-200px] left-0 w-full bg-linear-mobile h-full md:hidden"></div>
        <div className="absolute inset-0 z-[1] max-md:mt-4">
          <Image
            src="/images/home/bg-category.png"
            alt="background category"
            fill
            className="object-cover w-full h-full md:block hidden"
          />
          <Image
            src="/images/home/bg-category-mobile-2.png"
            alt="background category mobile"
            fill
            className="object-cover w-full h-full md:hidden"
          />
        </div>
        <div className="relative z-10">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-16 xl:gap-20">
              <div className="space-y-6 md:space-y-6 lg:space-y-12 xl:space-y-16 flex flex-col justify-center">
                <AnimateOnScroll animate="slideup">
                  <h2 className="display-3 max-md:text-[28px] md:max-lg:text-[26px] text-yellow uppercase max-md:text-center max-md:w-full max-md:mx-auto">{t('home.section-6.title')}</h2>
                </AnimateOnScroll>
                <AnimateOnScroll animate="slideup" delay={300} className="relative rounded-[24px] overflow-hidden bg-primary md:max-w-[568px] w-full">
                  {categoriesDisplay.map((itemCategory, indexCategory) => (
                    <Link href={{ pathname: '/product/[category]', params: { category: itemCategory.slug } }} key={indexCategory} className="py-4 md:py-4 lg:py-6 xl:py-[27px] px-4 title-2 md:max-lg:text-[15px] text-yellow flex items-center justify-between gap-2 lg:hover:bg-secondary duration-300 ease-in-out">
                      <span>{itemCategory.title}</span>
                      <span className="rotate-180"><Arrow /></span>
                    </Link>
                  ))}
                </AnimateOnScroll>
              </div>
              <div className="flex flex-col justify-center">
                <div className="relative overflow-hidden aspect-w-4 aspect-h-5 rounded-[12px]">
                  <Image
                    src="/images/demo/image-category.jpg"
                    alt={t('home.section-6.title')}
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-secondary md:py-16 py-12 xl:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6 xl:gap-8">
            <AnimateOnScroll animate='slideleft' delay={300} className="relative aspect-[8/5]">
              <Image
                src="/images/home/image-shipping.png"
                alt="image shipping"
                fill
                className="object-cover w-full h-full"
              />
            </AnimateOnScroll>
            <AnimateOnScroll animate='slideright' delay={300} className="space-y-6 md:space-y-4 xl:space-y-8 xl:pl-32">
              <h2 className="headline-1 text-yellow">{t('home.section-7.title.text1')} <br /> {t('home.section-7.title.text2')}</h2>
              <div className="body-1 text-white space-y-2 md:space-y-3 xl:space-y-4 lg:max-w-[440px]">
                <p>{t('home.section-7.description.text1')}</p>
                {/* <ol>
                  <li><span className="font-bold">{t('home.section-7.description.text2.title')}</span> {t('home.section-7.description.text2.description')}</li>
                  <li><span className="font-bold">{t('home.section-7.description.text3.title')}</span> {t('home.section-7.description.text3.description')}</li>
                  <li><span className="font-bold">{t('home.section-7.description.text4.title')}</span> {t('home.section-7.description.text4.description')}</li>
                </ol> */}
              </div>
              <div className="grid grid-cols-2 md:flex items-center md:gap-4 gap-2 xl:gap-6">
                <a href="tel:02499997122" className="btn btn-white flex items-center gap-2 px-3.5">
                  <Phone />
                  <span>024.9999.7122</span>
                </a>
                <a href="https://m.me/cothaotomca" target="_blank" rel="noopener noreferrer nofollow" className="btn btn-white !max-w-full">{t('button.advise-contact')}</a>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>
      <SectionSliderPost classCustom='md:pt-16 pt-12 xl:pt-[100px] pb-[90px] md:pb-[125px] lg:pb-[170px] xl:pb-[180px]' items={postsDisplay} />
    </main >
  )
}
