import Breadcrumb from "@/components/Common/Breadcrumb";
import { Link } from "@/i18n/routing";

const policies = [
  { title: "Chính sách giao hàng", slug: "chinh-sach-giao-hang" },
  { title: "Chính sách đổi trả", slug: "chinh-sach-doi-tra" },
  { title: "Bảo mật thông tin", slug: "bao-mat-thong-tin" },
];

export default async function PolicyPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params;
  const currentPolicy = policies.find((p) => p.slug === slug) || policies[0];

  const breadcrumbs = [
    { title: currentPolicy.title }
  ];

  const demoContent = `
    <p>Tại Cô Thảo Tôm Cá, chúng tôi hiểu rằng trải nghiệm thưởng thức trọn vẹn bắt đầu từ khâu vận chuyển. Để đảm bảo tiêu chuẩn "Mẻ mới mỗi ngày", quy trình giao hàng được thiết lập với các tiêu chí khắt khe nhất:</p>
    <ul>
      <li><strong>Thời gian xử lý & Giao hàng:</strong> Đơn hàng sẽ được bếp chuẩn bị và đóng gói ngay sau khi xác nhận với bạn qua Fanpage/Hotline. Thời gian giao hàng dự kiến từ 45 - 90 phút (đối với khu vực nội thành TP.HCM) để đảm bảo độ lạnh và sự tươi ngon.</li>
      <li><strong>Quy cách đóng gói:</strong> Mọi sản phẩm đều được đóng gói kín đáo trong bao bì chuyên dụng, bọc chống sốc và kèm theo đá gel giữ nhiệt (nếu cần thiết) để hải sản luôn ở trạng thái nhiệt độ lý tưởng nhất khi đến tay bạn.</li>
      <li><strong>Phí giao hàng:</strong> Phí giao hàng sẽ được tính dựa trên biểu phí của đối tác vận chuyển thứ ba (Ahamove, Grab, Gojek...). Bếp sẽ thông báo chính xác phí ship cho bạn trước khi tiến hành giao hàng.</li>
    </ul>
    <h3>Điều 1</h3>
    <p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</p>
    <p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p>
    <h3>Điều 2</h3>
    <p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.</p>
    <p>Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</p>
    <p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p>
  `;

  return (
    <main className="md:py-16 py-12 xl:pt-20 xl:pb-[112px]">
      <div className="container space-y-3">
        <Breadcrumb breadcrumbs={breadcrumbs} />

        <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8 items-start">
          <aside className="col-span-full lg:col-span-3 h-full">
            <div className="sticky top-24">
              <div className="bg-white rounded-[16px] overflow-hidden shadow-sm">
                <nav className="flex flex-col p-2 space-y-2">
                  {policies.map((policy) => {
                    const isActive = policy.slug === slug;
                    return (
                      <Link
                        key={policy.slug}
                        href={{ pathname: '/policy/[slug]', params: { slug: policy.slug } }}
                        className={`p-3 transition-all duration-300 rounded-[12px] ${isActive
                          ? "bg-primary text-yellow shadow-lg"
                          : "text-gray-900 lg:hover:text-[#142A68] lg:hover:bg-gray-50"
                          } title-3`}
                      >
                        {policy.title}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>
          </aside>

          <article className="col-span-full lg:col-span-9">
            <div className="bg-white rounded-[24px] md:p-4 p-3 xl:p-6">
              <div className="space-y-3">
                <h1 className="display-3 text-primary">{currentPolicy.title}</h1>
                <div
                  className="prose prose-policy max-w-full"
                  dangerouslySetInnerHTML={{ __html: demoContent }}
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
