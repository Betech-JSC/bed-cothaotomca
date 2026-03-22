import Breadcrumb from "@/components/Common/Breadcrumb"
import ShareFacebook from "@/components/Icons/ShareFacebook";
import ShareInstagram from "@/components/Icons/ShareInstagram";
import ShareThreads from "@/components/Icons/ShareThreads";
import SocialShare from "@/components/SocialShare";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function BlogDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { locale, category, slug } = await params
  const t = await getTranslations({ locale })
  const breadcrumbs = [
    {
      title: t('breadcrumb.blog'),
      url: { pathname: '/blog' },
    },
    {
      title: "Danh mục A",
      url: { pathname: '/blog/category/[category]', params: { category: 'danh-muc-a' } },
    },
    {
      title: "Bản Giao Hưởng Vị Giác: Cách Thưởng Thức Tôm Ngâm Tương Chuẩn Vị Hàn Quốc Tại Nhà",
    },
  ] as const
  const contentDemo = `
    <h3>Bắt đầu từ nguyên liệu "Đang Bơi"</h3>
    <p>Một món ngâm ngon không thể giấu đi sự mệt mỏi của nguyên liệu. Tại Cô Thảo Tôm Cá, chúng tôi tin rằng linh hồn của món ăn nằm ở độ tươi nguyên bản.</p>
    <p>Không sử dụng chất bảo quản, không lưu cữu qua ngày. Từng mẻ tôm sú vớt lên còn nhảy lách tách được sơ chế tỉ mỉ bằng tay, làm sạch hoàn toàn để giữ lại kết cấu thịt giòn ngọt, sần sật. Dòng nước tương Hàn Quốc độc quyền được ủ nấu thủ công nhiều giờ, ôm trọn lấy từng thớ thịt tôm trong một khoảng thời gian được canh chỉnh hoàn hảo. Sự ân cần và kĩ càng đó tạo nên những mẻ tôm "mới mỗi ngày", mang màu nâu cánh gián óng ả và hương thơm thảo mộc dịu nhẹ.</p>
    <img src="https://api.builder.io/api/v1/image/assets/TEMP/1ab265e6a685f7d3f72a0ef3f5845158bc220ecc?width=868" alt="Cua tươi" />
    <h3>Nghệ Thuật Thưởng Thức: Khơi Dậy 3 Tầng Hương</h3>
    <p>Để cảm nhận trọn vẹn sự tinh túy của món tôm ngâm tương, bạn không cần đến những nhà hàng đắt đỏ. Chỉ cần một chút biến tấu nhỏ ngay tại căn bếp nhà mình, bạn đã có một bữa ăn chuẩn "gu".</p>
    <ul>
      <li>Tầng vị thứ nhất - Hơi ấm từ cơm trắng: Hãy chuẩn bị một bát cơm trắng dẻo, nóng hổi. Hơi nóng của cơm sẽ làm dậy lên mùi thơm dịu của nước tương tỏi ớt, khiến từng thớ thịt tôm lạnh giòn trở nên hài hòa, tan chảy trong khoang miệng.</li>
      <li>Tầng vị thứ hai - Sự bùng nổ của rong biển nướng: Lấy một lá rong biển Hàn Quốc mỏng giòn, múc một thìa cơm nóng, đặt lên đó một con tôm ngâm đẫm sốt và thêm chút ớt tươi xắt lát. Cuộn tròn lại và thưởng thức trong một lần cắn. Sự giòn rụm của rong biển đan xen với độ sần sật của thịt tôm tạo nên một bản giao hưởng hoàn hảo.</li>
      <li>Tầng vị thứ ba - Mảnh ghép béo ngậy: Đừng quên rưới thêm một đến hai thìa nước sốt ngâm tương vào cơm. Nếu bạn có sẵn một quả trứng ngâm tương lòng đào từ Cô Thảo, hãy cắt đôi, dầm nhẹ lòng đỏ béo ngậy trộn cùng cơm. Vị mặn ngọt thanh tao lúc này sẽ đạt đến độ viên mãn.</li>
    </ul>
    <img src="https://api.builder.io/api/v1/image/assets/TEMP/aef5a877d7d2dc5a5ddca7e90d463c953a8c5c20?width=1760" alt="Bữa ăn hải sản"/> 
    <h3>Chăm Chút Từng Bữa Ăn Dù Bạn Ở Đâu</h3>
    <p>Từng hộp hải sản được đóng gói kín đáo, sạch sẽ, giữ trọn độ lạnh và hương vị tươi mới nhất khi đến tay người thưởng thức. Mọi sự chuẩn bị đã hoàn tất, việc của bạn chỉ là nấu một nồi cơm nóng và tận hưởng sự ân cần trong từng hương vị.</p>
    <p>Chúng tôi hiểu rằng, nhịp sống hiện đại đôi khi khiến bạn khó có thời gian tự tay chuẩn bị những món ăn cầu kì. Với mô hình Delivery chuyên nghiệp, Cô Thảo Tôm Cá mang nguyên vẹn trải nghiệm nhà hàng cao cấp đến tận bàn ăn của bạn.</p>
    <h3>Đã đến lúc nuông chiều vị giác của bạn! Hôm nay, bếp Cô Thảo vừa ra lò những mẻ Tôm sú ngâm tương tươi ngon nhất.</h3>
  `

  return (
    <main>
      <section className="min-h-screen w-full md:py-16 py-12 xl:py-20">
        <div className="container md:space-y-12 space-y-8 xl:space-y-16">
          <div className="flex flex-col items-center md:gap-6 gap-4 xl:gap-8 w-full max-w-[880px] mx-auto">
            <div className="flex flex-col gap-3 w-full">
              <Breadcrumb breadcrumbs={breadcrumbs} classNameNav="md:mx-auto" />
              <h1 className="display-3 text-primary text-center">
                Bản Giao Hưởng Vị Giác: Cách Thưởng Thức Tôm Ngâm Tương Chuẩn
                Vị Hàn Quốc Tại Nhà
              </h1>

              <div className="flex justify-center items-center gap-3 w-full">
                <span className="label-2 text-[#941417] font-semibold ">
                  Danh mục A
                </span>
                <div className="text-[#941417]">|</div>
                <span className="body-2 text-[#941417]">
                  12 june 2024
                </span>
              </div>
            </div>
            <div className="w-full text-center body-1 text-black">
              Hơn cả một bữa ăn tiện lợi, tôm ngâm tương là một trải nghiệm ẩm
              thực tinh tế. Cùng Cô Thảo Tôm Cá khám phá cách kết hợp hoàn hảo
              giữa tôm sú loại 1, bát cơm trắng bốc khói và lá rong biển giòn
              tan để đánh thức mọi giác quan sau một ngày dài.
            </div>
          </div>

          <div className="rounded-3xl relative aspect-w-2 aspect-h-1">
            <Image
              src="https://api.builder.io/api/v1/image/assets/TEMP/93cb237e639b5baac6ff8d7aa18d6e8c669ba611?width=2368"
              alt="Tôm ngâm tương Hàn Quốc"
              className="w-full h-full object-cover"
              fill
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-8 w-full max-w-[880px] mx-auto md:space-y-4 space-y-3 xl:space-y-6">
            <div className="prose prose-blog max-w-full" dangerouslySetInnerHTML={{ __html: contentDemo }}></div>
            <div className="w-full border-t border-gray-300 pt-3">
              <SocialShare />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
