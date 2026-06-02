import SectionSliderPost from "@/components/Common/SectionSliderPost";
import SectionHero from "@/components/Hero/SectionHero";
import SectionHotProduct from "@/components/Hero/SectionHotProduct";
import SectionReason from "@/components/Hero/SectionReason";
import Arrow from "@/components/Icons/Arrow";
import Phone from "@/components/Icons/Phone";
import { Link } from "@/i18n/i18n-navigation";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales as supportedLocales } from "@/i18n/config";
import Image from "next/image";
import { getApi } from "@/services/apiService";
import { HeroBanner } from "@/services/heroBannerService";
import { getProductCatalog, mapProductToCardItem } from "@/services/productService";
import { getCategories, getCategoryImageUrl } from "@/services/categoryService";
import { slugify } from "@/lib/format";
import { getBlogs, Blog } from "@/services/blogService";
import AnimateOnScroll from "@/components/Animated/animated-appear";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // If the locale is not supported, render the app's not-found (404)
  if (!supportedLocales.includes(locale as any)) {
    notFound();
  }
  const t = await getTranslations({ locale });

  const [
    heroBannersData,
    sliderBannersData,
    productsData,
    categoriesData,
    blogsData,
  ] = await Promise.all([
    getApi<HeroBanner>("banners", {
      params: { position: "hero_home", lang: locale },
    }).catch(() => ({ data: [] })),
    getApi<HeroBanner>("banners", {
      params: { position: "slide_home", lang: locale },
    }).catch(() => ({ data: [] })),
    getProductCatalog(locale)
      .then((items) => ({ data: items.slice(0, 20) }))
      .catch(() => ({ data: [] })),
    getCategories({ lang: locale, is_featured: true }).catch(() => ({
      data: [],
    })),
    getBlogs({ is_featured: true, per_page: 10, lang: locale }).catch(() => ({
      data: [],
    })),
  ]);

  const getTranslation = <T extends { locale: string }>(
    translations: T[] | undefined,
    currentLocale: string,
  ): T | undefined => {
    if (!translations || translations.length === 0) return undefined;
    return (
      translations.find((t) => t.locale === currentLocale) ||
      translations.find((t) => t.locale.startsWith(currentLocale))
    );
  };

  const sliderHero = heroBannersData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const title = translation?.title || item.title || "Cô Thảo Tôm Cá";
    return {
      image: {
        url: item.image || "/cover.jpg",
        alt: translation?.title || item.image?.alt || title,
      },
      image_mobile: {
        url: item.image_mobile || item.image || "/cover.jpg",
        alt: translation?.title || item.image_mobile?.alt || title,
      },
      title: title,
    };
  });

  const productsDisplay = productsData.data.map((item) => {
    const card = mapProductToCardItem(item, locale);
    return {
      ...card,
      category: { title: card.category.title, slug: card.category.slug },
      ingredients: item.ingredients?.map((ing) => slugify(ing.name)) || [],
    };
  });

  const categoriesDisplay = categoriesData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as {
      title?: string;
    };
    const title = translation?.title || item.title;
    return {
      id: item.id,
      title: title,
      slug: item.slug || slugify(title),
      image: {
        url: getCategoryImageUrl(item),
        alt: title,
      },
    };
  });

  const sliders = sliderBannersData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    return {
      image: {
        url: item.image || "/cover.jpg",
        alt: translation?.title || item.title || "",
      },
      image_mobile: {
        url: item.image_mobile || item.image || "/cover.jpg",
        alt:
          translation?.title ||
          item.image_mobile?.alt ||
          translation?.title ||
          item.title ||
          "",
      },
      title: translation?.title || item.title || "",
      description: translation?.description || item.description || "",
    };
  });

  const postsDisplay = blogsData.data.map((item) => {
    const translation = getTranslation(item.translations, locale) as any;
    const catTranslation = getTranslation(
      item.category?.translations,
      locale,
    ) as any;
    const title = translation?.title || item.title;
    const categoryName =
      catTranslation?.title || item.category?.title || t("blog.category");

    return {
      image: {
        url: item.thumbnail || "/cover.jpg",
        alt: title,
      },
      title: title,
      slug: item.slug,
      category: {
        title: categoryName,
        slug: slugify(categoryName),
      },
      created_at: item.created_at,
    };
  });

  return (
    <main>
      <SectionHero items={sliderHero} />
      <section className="relative overflow-hidden py-[50px] md:py-20 xl:py-[100px]">
        <div className="absolute top-6 left-0 h-[120px] w-full max-w-[280px] md:h-[100px] md:max-w-[320px] xl:h-[130px] xl:max-w-[420px]">
          <AnimateOnScroll
            animate="slideleft"
            delay={0}
            className="h-full w-full"
          >
            <Image
              src="/images/home/image-fish.png"
              alt="image fish"
              fill
              className="h-full w-full object-cover"
            />
          </AnimateOnScroll>
        </div>

        <div className="absolute -right-16 -bottom-6 h-[150px] w-full max-w-[180px] md:h-[260px] md:max-w-[320px] xl:h-[350px] xl:max-w-[427px]">
          <AnimateOnScroll
            animate="slideright"
            delay={0}
            className="h-full w-full"
          >
            <Image
              src="/images/home/image-crab.png"
              alt="image crab"
              fill
              className="h-full w-full object-cover"
            />
          </AnimateOnScroll>
        </div>
        <div className="container">
          <div className="grid grid-cols-12 gap-4 md:gap-6 xl:gap-8">
            <div className="col-span-full md:col-span-11 lg:col-span-10 xl:col-span-8">
              <AnimateOnScroll
                animate="slideup"
                delay={0}
                className="headline-3 text-secondary"
              >
                {t("home.section-2.subTitle")}
              </AnimateOnScroll>
              <div className="relative mt-4 mb-[94px] md:mb-8 md:max-w-[595px] lg:max-w-full xl:mb-12">
                <AnimateOnScroll
                  animate="slideup"
                  delay={0}
                  className="relative z-10"
                >
                  <h1 className="display-1 text-primary">
                    {t("home.section-2.title")}
                  </h1>
                </AnimateOnScroll>
                <div className="absolute top-16 -right-6 block size-[120px] md:top-6 md:-right-20 md:size-[220px] xl:-right-20 xl:size-[250px]">
                  <Image
                    src="/images/home/image-certificate.png"
                    alt="image certificate"
                    fill
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <AnimateOnScroll
                animate="slideup"
                delay={300}
                className="body-1 w-full max-w-[720px] space-y-3 text-gray-800 lg:max-w-[680px]"
              >
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("home.section-2.description.text1")
                      .replaceAll("<br/>", '<br class="hidden md:inline" />')
                      .replaceAll("<br>", '<br class="hidden md:inline" />'),
                  }}
                ></p>
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("home.section-2.description.text2"),
                  }}
                ></p>
                <p
                  dangerouslySetInnerHTML={{
                    __html: t("home.section-2.description.text3"),
                  }}
                ></p>
                <strong>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: t("home.section-2.description.text4"),
                    }}
                  ></p>
                </strong>
              </AnimateOnScroll>
              <div className="mt-6 md:mt-12 xl:mt-16">
                <Link href="/about" className="btn btn-primary max-w-[240px]">
                  {t("button.about")}
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
            className="hidden h-full w-full object-cover md:block"
          />
          <Image
            src="/images/home/bg-give-mobile.png"
            alt="background give mobile"
            fill
            className="h-full w-full object-cover md:hidden"
          />
        </div>
        <div className="absolute top-[100px] left-0 w-full md:top-12 xl:top-[100px]">
          <div className="container">
            <AnimateOnScroll animate="slideup">
              {locale == "vi" ? (
                <h2 className="display-2 text-primary text-center max-md:text-[36px]">
                  {t("home.section-5.title.text1")}
                  <span className="text-secondary">
                    {t("home.section-5.title.text2")}
                  </span>
                  {t("home.section-5.title.text3")}
                </h2>
              ) : (
                <h2 className="display-2 text-primary text-center max-md:text-[36px]">
                  <span className="text-secondary">
                    {t("home.section-5.title.text1")}
                  </span>
                  {t("home.section-5.title.text2")}
                  <span className="text-secondary">
                    {t("home.section-5.title.text3")}
                  </span>
                  {t("home.section-5.title.text4")}
                </h2>
              )}
            </AnimateOnScroll>
          </div>
        </div>
      </section>
      <section className="md:bg-primary relative pt-8 pb-12 md:py-20 xl:py-[100px]">
        <div className="bg-linear-mobile absolute top-[-200px] left-0 h-full w-full md:hidden"></div>
        <div className="absolute inset-0 z-[1] max-md:mt-4">
          <Image
            src="/images/home/bg-category.png"
            alt="background category"
            fill
            className="hidden h-full w-full object-cover md:block"
          />
          <Image
            src="/images/home/bg-category-mobile-2.png"
            alt="background category mobile"
            fill
            className="h-full w-full object-cover md:hidden"
          />
        </div>
        <div className="relative z-10">
          <div className="container">
            <div className="grid gap-6 md:grid-cols-2 md:gap-16 xl:gap-20">
              <div className="flex flex-col justify-center space-y-6 md:space-y-12 xl:space-y-16">
                <AnimateOnScroll animate="slideup">
                  <h2 className="display-3 text-yellow uppercase max-md:mx-auto max-md:w-full max-md:text-center max-md:text-[28px]">
                    {t("home.section-6.title")}
                  </h2>
                </AnimateOnScroll>
                <AnimateOnScroll
                  animate="slideup"
                  delay={300}
                  className="bg-primary relative w-full max-w-[568px] overflow-hidden rounded-[24px]"
                >
                  {categoriesDisplay.map((itemCategory, indexCategory) => (
                    <Link
                      href={{
                        pathname: "/product/[category]",
                        params: { category: itemCategory.slug },
                      }}
                      key={indexCategory}
                      className="title-2 text-yellow lg:hover:bg-secondary flex items-center justify-between gap-2 px-4 py-[27px] duration-300 ease-in-out"
                    >
                      <span>{itemCategory.title}</span>
                      <span className="rotate-180">
                        <Arrow />
                      </span>
                    </Link>
                  ))}
                </AnimateOnScroll>
              </div>
              <div>
                <div className="aspect-w-4 aspect-h-5 relative overflow-hidden rounded-[12px]">
                  <Image
                    src="/images/demo/image-category.jpg"
                    alt="image category"
                    fill
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-secondary py-12 md:py-16 xl:py-20">
        <div className="container">
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2 xl:gap-8">
            <AnimateOnScroll
              animate="slideleft"
              delay={300}
              className="relative aspect-[8/5]"
            >
              <Image
                src="/images/home/image-shipping.png"
                alt="image shipping"
                fill
                className="h-full w-full object-cover"
              />
            </AnimateOnScroll>
            <AnimateOnScroll
              animate="slideright"
              delay={300}
              className="space-y-6 md:space-y-4 xl:space-y-8 xl:pl-32"
            >
              <h2 className="headline-1 text-yellow">
                {t("home.section-7.title.text1")} <br />{" "}
                {t("home.section-7.title.text2")}
              </h2>
              <div className="body-1 space-y-2 text-white md:space-y-3 lg:max-w-[440px] xl:space-y-4">
                <p>{t("home.section-7.description.text1")}</p>
                {/* <ol>
                  <li><span className="font-bold">{t('home.section-7.description.text2.title')}</span> {t('home.section-7.description.text2.description')}</li>
                  <li><span className="font-bold">{t('home.section-7.description.text3.title')}</span> {t('home.section-7.description.text3.description')}</li>
                  <li><span className="font-bold">{t('home.section-7.description.text4.title')}</span> {t('home.section-7.description.text4.description')}</li>
                </ol> */}
              </div>
              <div className="grid grid-cols-2 items-center gap-6 md:flex md:gap-4 xl:gap-6">
                <a
                  href="tel:02499997122"
                  className="btn btn-white flex items-center gap-2 px-3.5"
                >
                  <Phone />
                  <span>024.9999.7122</span>
                </a>
                <a
                  href="https://m.me/cothaotomca"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn btn-white !max-w-full"
                >
                  {t("button.advise-contact")}
                </a>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>
      <SectionSliderPost items={postsDisplay} />
    </main>
  );
}
