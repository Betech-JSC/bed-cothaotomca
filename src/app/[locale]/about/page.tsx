import SectionChooseUs from '@/components/About/SectionChooseUs';
import Banner from '@/components/Banner';
import SectionSliderPost from '@/components/Common/SectionSliderPost';
import Cart from '@/components/Icons/Cart';
import { Link } from '@/i18n/i18n-navigation';
import { url } from 'inspector';
import { useTranslations } from 'next-intl'
import Image from 'next/image';

export default function AboutPage() {
  const t = useTranslations('common')
  const banner = {
    image: {
      url: "/images/demo/banner-about.jpg",
      alt: "banner about",
    },
  };
  const values = [
    {
      image: {
        url: "/images/about/image-value-1.png",
        alt: "image value 1",
      },
      title: "Chất Lượng Tinh Tuyển",
      description: "Chỉ sử dụng nguyên liệu hạng nhất để chế biến. Tuyệt đối 100% không sử dụng chất bảo quản.",
    },
    {
      image: {
        url: "/images/about/image-value-2.png",
        alt: "image value 2",
      },
      title: "Chuyên Nghiệp & An Toàn",
      description: "Các khâu chế biến đảm bảo an toàn thực phẩm, kĩ thuật ngâm được học bài bản, không gian bếp và dụng cụ luôn sạch sẽ, gọn gàng.",
    },
    {
      image: {
        url: "/images/about/image-value-3.png",
        alt: "image value 3",
      },
      title: "Chỉn Chu Trong Trải Nghiệm",
      description: `Chăm chút vào từng chi tiết nhỏ nhất, từ việc bấm càng cua sẵn, chuẩn bị bao tay, cho đến bao bì tinh tế, mang lại trải nghiệm thưởng thức có "gu".`,
    },
    {
      image: {
        url: "/images/about/image-value-4.png",
        alt: "image value 4",
      },
      title: "Ân Cần & Tận Tâm",
      description: "Tạo ra những bữa ăn ngon hoàn hảo không chỉ đến từ món chính, Cô Thảo tôm cá còn quan tâm đến một bữa ăn trọn vẹn và an tâm nhất cho khách hàng.",
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
              <h1 className="display-2 text-primary text-center">Khởi nguồn từ sự trân trọng nguyên liệu nguyên bản</h1>
            </div>
            <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">
              <div className="col-span-full lg:col-span-5 xl:col-span-4 flex items-center">
                <div className="xl:max-w-[350px] w-full md:space-y-4 space-y-3 xl:space-y-6">
                  <h3 className="title-2 text-primary">Trở thành thương hiệu tiên phong và dẫn đầu thị trường về hải sản tươi sống ngâm ngập sốt</h3>
                  <div className="body-1 text-gray-800 md:space-y-4 space-y-2">
                    <p>Chúng tôi hiểu rằng, để có được một mẻ tôm, cua hay cá hồi ngâm tương chuẩn vị Hàn Quốc hay Thái Lan, gia vị thôi là chưa đủ. Linh hồn của món ăn phải bắt nguồn từ những nguyên liệu "đang bơi" – tươi mới và thuần khiết nhất.</p>
                    <p>Tại bếp Cô Thảo, chúng tôi không chạy theo số lượng công nghiệp hay kéo dài thời gian bảo quản. Thay vào đó, chúng tôi chọn cách làm thủ công, chỉ làm những mẻ mới mỗi ngày để giữ trọn vẹn kết cấu sần sật, giòn ngọt tự nhiên của hải sản loại 1.</p>
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
            <h2 className="display-2 text-center text-primary">Ân Cần Trọn Vị Mỗi Ngày</h2>
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
            <h2 className="display-2 text-center text-primary">Bữa ăn ngon đã <span className="text-secondary">sẵn sàng</span></h2>
            <div className="body-0 text-primary">Cho dù bạn là nhân viên văn phòng đang tìm kiếm một bữa tối đậm đà, hay một gia đình cần món ngon đổi vị, Bếp Cô Thảo luôn mở cửa đón chào.</div>
            <Link href="/product" className="btn btn-primary gap-2 w-max mx-auto px-[18px]">
              <Cart />
              <span>Khám Phá Thực Đơn Hôm Nay</span>
            </Link>
          </div>
        </div>
      </section>
      <SectionSliderPost items={postsDemo} />
    </main>
  )
}
