import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { getApi } from '@/services/apiService';
import { HeroBanner } from '@/services/heroBannerService';
import SectionChooseUs from '@/components/About/SectionChooseUs';
import Banner from '@/components/Banner';
import SectionSliderPost from '@/components/Common/SectionSliderPost';
import Cart from '@/components/Icons/Cart';
import { Link } from '@/i18n/i18n-navigation';
import { getBlogs } from '@/services/blogService';
import { slugify } from '@/lib/format';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const [bannerData, slideData, blogsData] = await Promise.all([
    getApi<HeroBanner>('banners', { params: { position: 'banner_intro', lang: locale } }).catch(() => ({ data: [] })),
    getApi<HeroBanner>('banners', { params: { position: 'slide_intro', lang: locale } }).catch(() => ({ data: [] })),
    getBlogs({ is_featured: true, per_page: 10, lang: locale }).catch(() => ({ data: [] }))
  ]);

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const introBanner = bannerData.data[0];
  const banner = {
    image: {
      url: introBanner?.image || "/images/demo/banner-about.jpg",
      alt: introBanner?.title || "banner about",
    },
  };


  const values = [
    {
      image: {
        url: "/images/about/image-value-1.png",
        alt: "image value 1",
      },
      title: t('about.section-3.value1.title'),
      description: t('about.section-3.value1.description'),
    },
    {
      image: {
        url: "/images/about/image-value-2.png",
        alt: "image value 2",
      },
      title: t('about.section-3.value2.title'),
      description: t('about.section-3.value2.description'),
    },
    {
      image: {
        url: "/images/about/image-value-3.png",
        alt: "image value 3",
      },
      title: t('about.section-3.value3.title'),
      description: t('about.section-3.value3.description'),
    },
    {
      image: {
        url: "/images/about/image-value-4.png",
        alt: "image value 4",
      },
      title: t('about.section-3.value4.title'),
      description: t('about.section-3.value4.description'),
    },
  ];

  const sliders = slideData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    return {
      image: {
        url: item.image || "/cover.jpg",
        alt: translation?.title || item.title || ""
      },
      title: translation?.title || item.title || "",
      description: translation?.description || item.description || "",
    };
  });

  const postsDisplay = blogsData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const catTranslation = getTranslation(item.category?.translations, locale) as any;
    const title = translation?.title || item.title;
    const categoryName = catTranslation?.title || item.category?.title || t('blog.category');

    return {
      image: {
        url: item.thumbnail || "/cover.jpg",
        alt: title,
      },
      title: title,
      slug: item.slug,
      category: {
        title: categoryName,
        slug: item.category?.slug || slugify(categoryName),
      },
      created_at: item.created_at,
    };
  });

  return (
    <main>
      <Banner banner={banner} classHeight="h-[480px] lg:h-[706px]" />
      <section className="pt-10 pb-12 md:pb-16 xl:pb-20">
        <div className="container space-y-12 md:space-y-16 xl:space-y-[120px]">
          <div className="space-y-12 md:space-y-16 xl:space-y-20">
            <div className="relative max-w-full md:max-w-[692px] w-full mx-auto pt-16 md:pt-[121px]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 max-w-[320px] md:max-w-[594px] w-full h-[100px] md:h-[192px]">
                <Image
                  src="/images/about/image-fish.png"
                  alt="image fish"
                  fill
                  className="object-cover w-full h-full"
                />
              </div>
              <h1 className="display-2 text-primary text-center">{t('about.section-2.title')}</h1>
            </div>
            <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">
              <div className="col-span-full lg:col-span-5 xl:col-span-4 flex items-center">
                <div className="xl:max-w-[350px] w-full md:space-y-4 space-y-3 xl:space-y-6">
                  <h3 className="title-2 text-primary">{t('about.section-2.subTitle')}</h3>
                  <div className="body-1 text-gray-800 md:space-y-4 space-y-2">
                    <p>{t('about.section-2.description.text1')}</p>
                    <p>{t('about.section-2.description.text2')}</p>
                  </div>
                </div>
              </div>
              <div className="col-span-full lg:col-span-7 xl:col-span-8 lg:pr-0 lg:pl-8 xl:pl-16">
                <div className="relative rounded-[24px] aspect-w-6 aspect-h-5 overflow-hidden">
                  <Image
                    src="/images/about/image-about.jpg"
                    alt="image about"
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="md:space-y-8 space-y-6 xl:space-y-12">
            <h2 className="display-2 text-center text-primary">{t('about.section-3.title')}</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 md:gap-6 gap-4 lg:gap-8">
              {values.map((itemValue, indexValue) => (
                <div key={indexValue} className="md:space-y-4 space-y-3 xl:space-y-6">
                  <div className="relative w-auto h-[160px] mx-auto">
                    <Image
                      src={itemValue.image.url}
                      alt={itemValue.image.alt}
                      fill
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <h3 className="title-2 text-primary">{itemValue.title}</h3>
                    <p className="body-1 text-gray-900">{itemValue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <SectionChooseUs items={sliders} />
      <section className="relative bg-yellow pb-12">
        <div className="aspect-w-5 aspect-h-2">
          <Image
            src="/images/about/bg-explore.png"
            alt="background explore"
            fill
            className="object-contain w-full h-full"
          />
        </div>
        <div className="container">
          <div className="md:space-y-4 space-y-3 xl:space-y-6 max-w-[602px] w-full mx-auto flex flex-col items-center justify-center text-center">
            <h2 className="display-2 text-center text-primary">{t('about.section-5.title.text1')} <span className="text-secondary">{t('about.section-5.title.text2')}</span></h2>
            <div className="body-0 text-primary">{t('about.section-5.description')}</div>
            <Link href="/product" className="btn btn-primary gap-2 w-max mx-auto px-[18px]">
              <Cart />
              <span>{t('button.explore-menu')}</span>
            </Link>
          </div>
        </div>
      </section>
      <SectionSliderPost items={postsDisplay} />
    </main>
  )
}
