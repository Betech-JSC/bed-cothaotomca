import SectionSliderPost from '@/components/Common/SectionSliderPost';
import SectionHero from '@/components/Hero/SectionHero';
import SectionHotProduct from '@/components/Hero/SectionHotProduct';
import SectionReason from '@/components/Hero/SectionReason';
import Arrow from '@/components/Icons/Arrow';
import Phone from '@/components/Icons/Phone';
import { Link } from '@/i18n/i18n-navigation';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { getApi } from '@/services/apiService';
import { HeroBanner } from '@/services/heroBannerService';
import { Product } from '@/services/productService';
import { Category } from '@/services/categoryService';
import { slugify } from '@/lib/format';
import { getBlogs, Blog } from '@/services/blogService';


export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const [heroBannersData, sliderBannersData, productsData, categoriesData, blogsData] = await Promise.all([
    getApi<HeroBanner>('banners', { params: { position: 'hero_home', lang: locale } }).catch(() => ({ data: [] })),
    getApi<HeroBanner>('banners', { params: { position: 'slide_home', lang: locale } }).catch(() => ({ data: [] })),
    getApi<Product>('products', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<Category>('categories', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getBlogs({ is_featured: true, per_page: 10, lang: locale }).catch(() => ({ data: [] }))
  ]);

  const getTranslation = <T extends { locale: string }>(translations: T[] | undefined, currentLocale: string): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return translations.find(t => t.locale === currentLocale) ||
      translations.find(t => t.locale.startsWith(currentLocale));
  };

  const sliderHero = heroBannersData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const title = translation?.title || item.title || "Cô Thảo Tôm Cá";
    return {
      image: {
        url: item.image || "/cover.jpg",
        alt: translation?.title || item.image?.alt || title
      },
      title: title,
    };
  });

  const productsDisplay = productsData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const name = translation?.name || item.name;
    const categoryName = "Tất cả";
    return {
      id: item.id,
      title: name,
      slug: item.slug || slugify(name),
      price: parseFloat(item.price as string),
      category: { title: categoryName, slug: item.category?.slug || slugify(categoryName) },
      ingredients: item.ingredients?.map(ing => slugify(ing.name)) || [],
      image: {
        url: item.image || "/cover.jpg",
        alt: name
      },

      description: translation?.description || item.description,
      created_at: '2024-03-15T00:00:00Z',
    };
  });

  const categoriesDisplay = categoriesData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const title = translation?.title || item.title;
    return {
      id: item.id,
      title: title,
      slug: item.slug || slugify(title),
      image: {
        url: item.image || 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop',
        alt: title
      },
    };
  });

  const sliders = sliderBannersData.data.map((item) => {
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
      <SectionHero items={sliderHero} />
      <section className="md:py-20 py-12 xl:py-[100px] relative overflow-hidden">
        <div className="absolute top-6 left-0 max-w-[320px] xl:max-w-[420px] w-full h-[100px] xl:h-[130px]">
          <Image
            src="/images/home/image-fish.png"
            alt="image fish"
            fill
            className="object-cover w-full h-full"
          />
        </div>

        <div className="absolute -bottom-6 -right-16 max-w-[320px] xl:max-w-[427px] w-full h-[250px] xl:h-[350px]">
          <Image
            src="/images/home/image-crab.png"
            alt="image crab"
            fill
            className="object-cover w-full h-full"
          />
        </div>
        <div className="container">
          <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">
            <div className="col-span-10 xl:col-span-7">
              <div className="headline-3 text-secondary">{t('home.section-2.subTitle')}</div>
              <div className="relative mt-4 mb-4 md:mb-8 xl:mb-12">
                <h1 className="display-1 text-primary z-10 relative">{t('home.section-2.title')}</h1>
                <div className="absolute top-6 -right-20 xl:-right-24 size-[220px] xl:size-[250px]">
                  <Image
                    src="/images/home/image-certificate.png"
                    alt="image certificate"
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="max-w-[660px] w-full space-y-3 body-1 text-gray-800">
                <p>{t('home.section-2.description.text1')}</p>
                <p>{t('home.section-2.description.text2')}</p>
                <p>{t('home.section-2.description.text3')}</p>
                <p>{t('home.section-2.description.text4')}</p>
                <p>{t('home.section-2.description.text5')}</p>
                <p>{t('home.section-2.description.text6')}</p>
              </div>
              <div className="md:mt-12 mt-8 xl:mt-16">
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
      <section className="relative">
        <div className="aspect-w-2 aspect-h-1">
          <Image
            src="/images/home/bg-give.png"
            alt="background give"
            fill
            className="object-cover w-full h-full"
          />
        </div>
        <div className="absolute md:top-12 top-5 xl:top-[100px] left-0 w-full">
          <div className="container">
            <h2 className="display-1 max-md:text-[24px] text-center text-primary">
              {t('home.section-5.title.text1')}<span className="text-secondary">{t('home.section-5.title.text2')}</span>{t('home.section-5.title.text3')}
            </h2>
          </div>
        </div>
      </section>
      <section className="relative py-12 md:py-20 xl:py-[100px] bg-primary">
        <div className="absolute inset-0">
          <Image
            src="/images/home/bg-category.png"
            alt="background category"
            fill
            className="object-cover w-full h-full"
          />
        </div>
        <div className="relative">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 xl:gap-20">
              <div className="space-y-8 md:space-y-12 xl:space-y-16 flex flex-col justify-center">
                <h2 className="display-3 text-yellow uppercase max-md:text-center max-md:w-[250px] max-md:mx-auto">{t('home.section-6.title')}</h2>
                <div className="relative rounded-[24px] overflow-hidden bg-primary max-w-[568px] w-full">
                  {categoriesDisplay.map((itemCategory, indexCategory) => (
                    <Link href={{ pathname: '/product/[category]', params: { category: itemCategory.slug } }} key={indexCategory} className="py-[27px] px-4 title-2 text-yellow flex items-center justify-between gap-2 lg:hover:bg-secondary duration-300 ease-in-out">
                      <span>{itemCategory.title}</span>
                      <span className="rotate-180"><Arrow /></span>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="relative overflow-hidden aspect-w-4 aspect-h-5 rounded-[12px]">
                  <Image
                    src="/images/demo/image-category.jpg"
                    alt="image category"
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
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 xl:gap-8">
            <div className="relative aspect-[8/5]">
              <Image
                src="/images/home/image-shipping.png"
                alt="image shipping"
                fill
                className="object-cover w-full h-full"
              />
            </div>
            <div className="space-y-6 md:space-y-4 xl:space-y-8 xl:pl-32">
              <h2 className="headline-1 text-yellow">{t('home.section-7.title.text1')} <br /> {t('home.section-7.title.text2')}</h2>
              <div className="body-1 text-white space-y-2 md:space-y-3 xl:space-y-4">
                <p>{t('home.section-7.description.text1')}</p>
                <ol>
                  <li><span className="font-bold">{t('home.section-7.description.text2.title')}</span> {t('home.section-7.description.text2.description')}</li>
                  <li><span className="font-bold">{t('home.section-7.description.text3.title')}</span> {t('home.section-7.description.text3.description')}</li>
                  <li><span className="font-bold">{t('home.section-7.description.text4.title')}</span> {t('home.section-7.description.text4.description')}</li>
                </ol>
              </div>
              <div className="flex items-center md:gap-4 gap-6 xl:gap-6">
                <a href="tel:02499997122" className="btn btn-white flex items-center gap-2 px-3.5">
                  <Phone />
                  <span>024.9999.7122</span>
                </a>
                <a href="https://m.me/cothaotomca" target="_blank" rel="noopener noreferrer nofollow" className="btn btn-white">{t('button.advise-contact')}</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SectionSliderPost items={postsDisplay} />
    </main>
  )
}
