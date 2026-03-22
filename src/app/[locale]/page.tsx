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


export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const [heroBannersData, sliderBannersData, productsData, categoriesData] = await Promise.all([
    getApi<HeroBanner>('banners', { params: { position: 'hero_home', lang: locale } }).catch(() => ({ data: [] })),
    getApi<HeroBanner>('banners', { params: { position: 'slide_home', lang: locale } }).catch(() => ({ data: [] })),
    getApi<Product>('products', { params: { lang: locale } }).catch(() => ({ data: [] })),
    getApi<Category>('categories', { params: { lang: locale } }).catch(() => ({ data: [] }))
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
      slug: slugify(name),
      price: parseFloat(item.price as string),
      category: { title: categoryName, slug: slugify(categoryName) },
      ingredients: item.ingredients?.map(ing => slugify(ing.name)) || [],
      image: {
        url: item.image || "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=600&fit=crop",
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
      slug: slugify(title),
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

  const postsDemo = [
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Shrimp Korean style",
      },
      title:
        "Cách ăn Tôm ngâm tương chuẩn vị Hàn Quốc cùng rong biển và cơm nóng",
      slug: "cach-an-tom-ngam-tuong-chuan-vi-han-quoc-cung-rong-bien-va-com-nong",
      category: {
        title: "Danh mục A",
        slug: "danh-muc-a",
      },
      created_at: "2024-06-12",
    },
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Shrimp Korean style",
      },
      title:
        "Cách ăn Tôm ngâm tương chuẩn vị Hàn Quốc cùng rong biển và cơm nóng",
      slug: "cach-an-tom-ngam-tuong-chuan-vi-han-quoc-cung-rong-bien-va-com-nong",
      category: {
        title: "Danh mục A",
        slug: "danh-muc-a",
      },
      created_at: "2024-06-12",
    },
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Shrimp Korean style",
      },
      title:
        "Cách ăn Tôm ngâm tương chuẩn vị Hàn Quốc cùng rong biển và cơm nóng",
      slug: "cach-an-tom-ngam-tuong-chuan-vi-han-quoc-cung-rong-bien-va-com-nong",
      category: {
        title: "Danh mục A",
        slug: "danh-muc-a",
      },
      created_at: "2024-06-12",
    },
  ];

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
              <div className="headline-3 text-secondary">Hải sản ngâm tương, mẻ mới mỗi ngày</div>
              <div className="relative mt-4 mb-4 md:mb-8 xl:mb-12">
                <h1 className="display-1 text-primary z-10 relative">Tươi nguyên bản, 100% không chất bảo quản.</h1>
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
                <p>Tại Cô Thảo Tôm Cá, chúng tôi chỉ làm hải sản khi nguyên liệu đạt độ tươi ngon tốt nhất.</p>
                <p>Từ cá hồi, tôm, cua, ghẹ, bào ngư cho đến từng nguyên liệu nhỏ nhất trong bếp, tất cả đều được chọn lọc kỹ lưỡng và chế biến trong ngày, không sử dụng chất bảo quản.</p>
                <p>Các món hải sản ngâm tương được làm để dùng liền, giữ trọn độ ngọt tự nhiên và kết cấu tươi mới của hải sản.</p>
                <p>Điểm nhấn nằm ở nước tương độc quyền — được cân chỉnh vừa đủ đậm đà để tôn vị, nhưng đủ nhẹ để người ăn cảm nhận rõ từng thớ thịt, từng lớp béo ngọt.</p>
                <p>Chúng tôi không chạy theo số lượng, không kéo dài thời gian bảo quản.</p>
                <p>Chỉ chọn làm mẻ mới mỗi ngày, bởi với Cô Thảo Tôm Cá, độ tươi là tiêu chuẩn bắt buộc, không phải lựa chọn.</p>
              </div>
              <div className="md:mt-12 mt-8 xl:mt-16">
                <Link href="/about" className="btn btn-primary max-w-[240px]">
                  Về chúng tôi
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
              Giao trọn <span className="text-secondary">vị ngon</span> đến tận nhà!
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
                <h2 className="display-3 text-yellow uppercase max-md:text-center max-md:w-[250px] max-md:mx-auto">Danh mục sản phẩm</h2>
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
              <h2 className="headline-1 text-yellow">Từ Bếp Đến Bàn Ăn <br /> Vẹn Nguyên Hương Vị</h2>
              <div className="body-1 text-white space-y-2 md:space-y-3 xl:space-y-4">
                <p>Chúng tôi là mô hình Delivery & Takeaway chuyên biệt. Đặt hàng ngay để thưởng thức tại nhà.</p>
                <ol>
                  <li><span className="font-bold">1. Đặt món:</span> Tiếp nhận đơn hàng qua Fanpage/Hotline.</li>
                  <li><span className="font-bold">2. Chuẩn bị:</span> Bếp lên đơn và đóng gói ngay lập tức để giữ độ lạnh.</li>
                  <li><span className="font-bold">3. Giao hàng:</span> Giao siêu tốc trong nội thành. Bao bì đóng gói kỹ lưỡng, đảm bảo không đổ, không ám mùi.</li>
                </ol>
              </div>
              <div className="flex items-center md:gap-4 gap-6 xl:gap-6">
                <button className="btn btn-white flex items-center gap-2 px-3.5">
                  <Phone />
                  <span>024.9999.7122</span>
                </button>
                <button className="btn btn-white">Liên hệ tư vấn</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SectionSliderPost items={postsDemo} />
    </main>
  )
}
