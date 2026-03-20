import Breadcrumb from "@/components/Common/Breadcrumb";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import BoxMessage from "@/components/Icons/BoxMessage";
import SocialShare from "@/components/SocialShare";
import ProductInfoAccordion from "@/components/Product/ProductInfoAccordion";
import SliderProductRelated from "@/components/Product/SliderProductRelated";

export default async function ProductDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { slug } = await params

  const productDemo = {
    title: "Cá Hồi Ngâm Tương Hàn Quốc",
    description: "Từng thớ cá hồi phi lê béo ngậy, óng ả đắm mình trong dòng nước tương thảo mộc ủ thủ công. Một trải nghiệm thanh tao, tan chảy ngay nơi đầu lưỡi, mang trọn sự tươi mát của biển cả và sự ân cần của bếp Cô Thảo.",
    image: {
      url: "/images/demo/image-product-detail-1.jpg",
      alt: "image",
    },
    images: [
      {
        url: "/images/demo/image-product-detail-1.jpg",
        alt: "image detail 1",
      },
      {
        url: "/images/demo/image-product-detail-2.jpg",
        alt: "image detail 2",
      },
      {
        url: "/images/demo/image-product-detail-3.jpg",
        alt: "image detail 3",
      },
    ],
    sizes: [
      {
        title: "S",
        price: 590000
      },
      {
        title: "M",
        price: 790000
      },
      {
        title: "L",
        price: 990000
      },
    ],
    category: {
      title: "Danh mục A",
      slug: "danh-muc-a"
    },
    infos: [
      {
        title: "Mô tả sản phẩm",
        content: `
        <h3>Thông Tin Chi Tiết</h3>
        <p>Thành phần chính: Cá hồi tươi phi lê (Loại 1), Nước tương Hàn Quốc ủ thủ công, Mè rang, Tỏi, Ớt tươi.</p>
        <p>Đóng gói: Hũ / Khay thiết kế chỉn chu, an toàn cho vận chuyển Delivery.</p>
        <p>Bảo quản: Bảo quản lạnh.</p>
        <p>Hạn sử dụng: Dùng tốt nhất trong 2 ngày kể từ khi nhận hàng để đảm bảo độ tươi ngon nhất.</p>
        <p>Cam kết: 100% mẻ mới mỗi ngày, không sử dụng chất bảo quản.</p>
        <h3>Bí Quyết Thưởng Thức Trọn Vị</h3>
        <p>Để có một trải nghiệm ẩm thực trọn vẹn nhất ngay tại nhà:</p>
        <ol>
          <li>
            Chuẩn bị: Cơm trắng nấu dẻo, dọn ra bát khi còn nóng hổi.
          </li>
          <li>
            Kết hợp: Đặt một lát cá hồi ngâm đẫm sốt lên trên bát cơm. Hơi nóng từ cơm sẽ làm lớp mỡ cá khẽ tươm ra, béo ngậy.
          </li>
          <li>
            Thưởng thức: Rưới thêm một thìa nước ngâm tương, cuộn cùng một lá rong biển nướng giòn và cảm nhận hương vị tan chảy.
          </li>
        </ol>
        `
      },
      {
        title: "Hướng dẫn sử dụng",
        content: `
        <p>Thưởng thức: Rưới thêm một thìa nước ngâm tương, cuộn cùng một lá rong biển nướng giòn và cảm nhận hương vị tan chảy.</p>
        `
      },
      {
        title: "Hướng dẫn bảo quản",
        content: `
        <p>Thưởng thức: Rưới thêm một thìa nước ngâm tương, cuộn cùng một lá rong biển nướng giòn và cảm nhận hương vị tan chảy.</p>
        `
      }
    ]
  };

  const relatedProducts = [
    {
      id: 1,
      title: "Tôm Sú Ngâm Tương",
      slug: "tom-su-ngam-tuong",
      price: 285000,
      category: { title: "Ngâm tương", slug: "ngam-tuong" },
      image: { url: "/images/demo/image-product-detail-1.jpg" },
      description: "Thớ thịt tôm sú giòn ngọt hòa quyện cùng nước tương đậm đà thảo mộc.",
      created_at: "2024-03-19T00:00:00Z"
    },
    {
      id: 2,
      title: "Cua Cà Mau Ngâm Tương",
      slug: "cua-ca-mau-ngam-tuong",
      price: 450000,
      category: { title: "Ngâm tương", slug: "ngam-tuong" },
      image: { url: "/images/demo/image-product-detail-2.jpg" },
      description: "Được chọn lọc từ những con cua Cà Mau chắc gạch nhất.",
      created_at: "2024-03-19T00:00:00Z"
    },
    {
      id: 3,
      title: "Bào Ngư Ngâm Tương",
      slug: "bao-ngu-ngam-tuong",
      price: 590000,
      category: { title: "Ngâm tương", slug: "ngam-tuong" },
      image: { url: "/images/demo/image-product-detail-3.jpg" },
      description: "Món ăn cao cấp bổ dưỡng với nước xốt gia truyền.",
      created_at: "2024-03-19T00:00:00Z"
    },
    {
      id: 4,
      title: "Cá Hồi Xốt Thái",
      slug: "ca-hoi-xot-thai",
      price: 320000,
      category: { title: "Sốt Thái", slug: "sot-thai" },
      image: { url: "/images/demo/image-product-detail-1.jpg" },
      description: "Vị cay nồng đặc trưng, thơm mùi thảo mộc vùng nhiệt đới.",
      created_at: "2024-03-19T00:00:00Z"
    },
    {
      id: 5,
      title: "Chân Gà Rút Xương",
      slug: "chan-ga-rut-xuong",
      price: 150000,
      category: { title: "Món khai vị", slug: "khai-vi" },
      image: { url: "/images/demo/image-product-detail-2.jpg" },
      description: "Giòn sần sật, đậm vị chua cay.",
      created_at: "2024-03-19T00:00:00Z"
    }
  ];

  const breadcrumbs = [
    {
      title: "Sản phẩm",
      href: "/product",
    },
    {
      title: productDemo.category.title,
      href: `/product/${productDemo.category.slug}`,
    },
    {
      title: productDemo.title,
    },
  ];

  return (
    <main>
      <section className="md:py-[56px] py-12 xl:py-[60px]">
        <div className="container">
          <div className="grid grid-cols-12 gap-4 md:gap-6 xl:gap-8">
            <div className="col-span-full lg:col-span-6 xl:col-span-7 space-y-6 lg:pr-3 xl:pr-4">
              {productDemo.images.map((image, index) => (
                <div key={index} className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
            <div className="col-span-full lg:col-span-6 xl:col-span-5">
              <div className="relative top-0 md:space-y-8 space-y-6 xl:space-y-12">
                <div className="space-y-6">
                  <div className="space-y-3 flex flex-col items-start">
                    <Breadcrumb breadcrumbs={breadcrumbs} />
                    <h1 className="headline-1 text-primary">{productDemo.title}</h1>
                  </div>

                  <div className="body-1 text-gray-900">{productDemo.description}</div>

                  <div className="flex items-center md:gap-4 gap-3 xl:gap-6">
                    <div className="label-1 font-semibold text-gray-900">Size</div>
                    <div className="flex items-center md:gap-4 gap-3 xl:gap-6">
                      {productDemo.sizes.map((size, index) => (
                        <div key={index} className="flex items-center justify-center button-1 size-12 bg-white rounded-full lg:hover:bg-primary lg:hover:text-yellow duration-300 ease-in-out cursor-pointer">
                          <span>{size.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="title-1 text-secondary">{formatPrice(productDemo.sizes[0].price)}</div>

                  <div className="grid grid-cols-2 gap-3">
                    <button className="btn btn-primary flex items-center justify-center gap-2">
                      <BoxMessage />
                      <span>Mua ngay</span>
                    </button>
                    <button className="btn btn-secondary">
                      <span>Liên hệ tư vấn</span>
                    </button>
                  </div>

                  <SocialShare />
                </div>
                <ProductInfoAccordion infos={productDemo.infos} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <SliderProductRelated products={relatedProducts} />
    </main>
  )
}
