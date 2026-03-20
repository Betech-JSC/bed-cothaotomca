import SectionSliderPost from '@/components/Common/SectionSliderPost';
import SectionHero from '@/components/Hero/SectionHero';
import SectionHotProduct from '@/components/Hero/SectionHotProduct';
import SectionReason from '@/components/Hero/SectionReason';
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
  const sliders = [
    {
      image: {
        url: "/images/about/image-slider-1.jpg",
        alt: "image slider 1"
      },
      title: "Mẻ mới mỗi ngày",
      description: "Độ tươi là tiêu chuẩn bắt buộc, không phải sự lựa chọn. Chúng tôi cam kết 100% không sử dụng chất bảo quản, chỉ chọn lọc khắt khe và chế biến thủ công trong ngày để giữ trọn vẹn kết cấu sần sật và độ ngọt nguyên bản của hải sản."
    },
    {
      image: {
        url: "/images/about/image-slider-2.jpg",
        alt: "image slider 2"
      },
      title: "Tầm nhìn",
      description: `Tập trung vào sản phẩm ngâm ngập sốt với giá thành tương xứng với chất lượng. Trở thành thương hiệu "Top of mind" (dẫn đầu tâm trí) về món hải sản tươi sống ngâm sốt Delivery.`
    },
    {
      image: {
        url: "/images/about/image-slider-3.jpg",
        alt: "image slider 3"
      },
      title: "Sứ mệnh",
      description: "Tạo ra các sản phẩm ngâm ngập sốt tươi ngon với dịch vụ hoàn hảo, tạo ra giá trị thưởng thức an tâm trong từng bữa ăn của khách hàng."
    },
  ];
  const productsDemo = [
    {
      id: 1,
      title: 'Cá Hồi Ngâm Tương Hàn Quốc',
      slug: 'ca-hoi-ngam-tuong-han-quoc',
      price: 285000,
      category: { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
      ingredients: ['ca-hoi'],
      image: { url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=600&fit=crop', alt: 'Cá Hồi Ngâm Tương' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-15T00:00:00Z',
    },
    {
      id: 2,
      title: 'Tôm Sú Ngâm Tương Ganjang',
      slug: 'tom-su-ngam-tuong-ganjang',
      price: 320000,
      category: { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
      ingredients: ['tom-su'],
      image: { url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&h=600&fit=crop', alt: 'Tôm Sú' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-16T00:00:00Z',
    },
    {
      id: 3,
      title: 'Cua Ngâm Tương Đặc Biệt',
      slug: 'cua-ngam-tuong-dac-biet',
      price: 450000,
      category: { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
      ingredients: ['cua-ghe'],
      image: { url: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=800&h=600&fit=crop', alt: 'Cua Ngâm Tương' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-10T00:00:00Z',
    },
    {
      id: 4,
      title: 'Cá Hồi Sốt Thái Xanh',
      slug: 'ca-hoi-sot-thai-xanh',
      price: 260000,
      category: { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
      ingredients: ['ca-hoi'],
      image: { url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop', alt: 'Cá Hồi Sốt Thái' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-19T00:00:00Z',
    },
    {
      id: 5,
      title: 'Tôm Sú Sốt Thái Mango',
      slug: 'tom-su-sot-thai-mango',
      price: 295000,
      category: { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
      ingredients: ['tom-su'],
      image: { url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&h=600&fit=crop', alt: 'Tôm Sú Sốt Thái' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-18T00:00:00Z',
    },
    {
      id: 6,
      title: 'Bào Ngư Sốt Thái Cay',
      slug: 'bao-ngu-sot-thai-cay',
      price: 520000,
      category: { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
      ingredients: ['bao-ngu'],
      image: { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop', alt: 'Bào Ngư Sốt Thái' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-17T00:00:00Z',
    },
    {
      id: 7,
      title: 'Set Cơm Cá Hồi Nhật',
      slug: 'set-com-ca-hoi-nhat',
      price: 185000,
      category: { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
      ingredients: ['ca-hoi'],
      image: { url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop', alt: 'Set Cơm' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-14T00:00:00Z',
    },
    {
      id: 8,
      title: 'Set Cơm Tôm Sú & Rau',
      slug: 'set-com-tom-su-rau',
      price: 165000,
      category: { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
      ingredients: ['tom-su'],
      image: { url: 'https://images.unsplash.com/photo-1539755530862-00f623c00f52?w=800&h=600&fit=crop', alt: 'Set Cơm Tôm' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-13T00:00:00Z',
    },
    {
      id: 9,
      title: 'Set Cơm Hải Sản Hỗn Hợp',
      slug: 'set-com-hai-san-hon-hop',
      price: 210000,
      category: { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
      ingredients: ['cua-ghe', 'tom-su'],
      image: { url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&h=600&fit=crop', alt: 'Cơm Hải Sản' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-12T00:00:00Z',
    },
    {
      id: 10,
      title: 'Gỏi Bào Ngư Rong Biển',
      slug: 'goi-bao-ngu-rong-bien',
      price: 380000,
      category: { title: 'Món Ăn Kèm', slug: 'mon-an-kem' },
      ingredients: ['bao-ngu'],
      image: { url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop', alt: 'Gỏi Bào Ngư' },
      description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
      created_at: '2024-03-11T00:00:00Z',
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
              <div className="relative mt-4 mb-12">
                <h1 className="display-1 text-primary z-10 relative">Tươi nguyên bản, 100% không chất bảo quản.</h1>
                <div className="absolute top-6 -right-24 size-[250px]">
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
              <div className="mt-16">
                <Link href="/about" className="btn btn-primary max-w-[240px]">
                  Về chúng tôi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SectionReason items={sliders} />
      <SectionHotProduct products={productsDemo} />
      <SectionSliderPost items={postsDemo} />
    </main>
  )
}
