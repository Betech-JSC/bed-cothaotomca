import SectionSliderPost from '@/components/Common/SectionSliderPost';
import SectionHero from '@/components/Hero/SectionHero';
import { Link } from '@/i18n/i18n-navigation';
import { getTranslations } from 'next-intl/server'
import Image from 'next/image';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const sliderHero = [
    {
      image: {
        url: "/images/demo/image-hero.jpg",
        alt: "image hero 1"
      },
      title: "Hải sản tươi sống ngâm sốt",
    },
    {
      image: {
        url: "/images/demo/image-hero.jpg",
        alt: "image hero 2"
      },
      title: "Hải sản tươi sống ngâm sốt",
    },
    {
      image: {
        url: "/images/demo/image-hero.jpg",
        alt: "image hero 3"
      },
      title: "Hải sản tươi sống ngâm sốt",
    },
  ];

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
      {/* <div className="flex flex-col items-center justify-center min-h-[50vh] pt-20 space-y-4">
        <h1 className="text-4xl font-bold">{t('home.title')}</h1>
        <p className="text-xl">{t('home.description')}</p>
        <p className="text-sm text-gray-500">{t('home.language')}</p>
        <p className="text-green-600 mt-3">Đang test chuyển ngôn ngữ</p>
      </div> */}
      <SectionHero items={sliderHero} />
      <section className="py-[100px] relative overflow-hidden">
        <div className="absolute top-6 left-0 max-w-[420px] w-full h-[130px]">
          <Image
            src="/images/home/image-fish.png"
            alt="image fish"
            fill
            className="object-cover w-full h-full"
          />
        </div>

        <div className="absolute -bottom-6 -right-16 max-w-[427px] w-full h-[350px]">
          <Image
            src="/images/home/image-crab.png"
            alt="image crab"
            fill
            className="object-cover w-full h-full"
          />
        </div>
        <div className="container">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-7">
              <div className="headline-3 text-secondary">Hải sản ngâm tương, mẻ mới mỗi ngày</div>
              <h1 className="display-1 text-primary mt-4 mb-12">Tươi nguyên bản, 100% không chất bảo quản.</h1>
              <div className="max-w-[660px] w-full space-y-3 body-1 text-gray-800">
                <p>Tại Cô Thảo Tôm Cá, chúng tôi chỉ làm hải sản khi nguyên liệu đạt độ tươi ngon tốt nhất.</p>
                <p>Từ cá hồi, tôm, cua, ghẹ, bào ngư cho đến từng nguyên liệu nhỏ nhất trong bếp, tất cả đều được chọn lọc kỹ lưỡng và chế biến trong ngày, không sử dụng chất bảo quản.</p>
                <p>Các món hải sản ngâm tương được làm để dùng liền, giữ trọn độ ngọt tự nhiên và kết cấu tươi mới của hải sản.</p>
                <p>Điểm nhấn nằm ở nước tương độc quyền — được cân chỉnh vừa đủ đậm đà để tôn vị, nhưng đủ nhẹ để người ăn cảm nhận rõ từng thớ thịt, từng lớp béo ngọt.</p>
                <p>Chúng tôi không chạy theo số lượng, không kéo dài thời gian bảo quản.</p>
                <p>Chỉ chọn làm mẻ mới mỗi ngày, bởi với Cô Thảo Tôm Cá, độ tươi là tiêu chuẩn bắt buộc, không phải lựa chọn.</p>
              </div>
              <div className="mt-16">
                <Link href="/about" className="btn btn-primary max-w-[240px]">
                  Về chúng tôi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SectionSliderPost items={postsDemo} />
    </main>
  )
}
