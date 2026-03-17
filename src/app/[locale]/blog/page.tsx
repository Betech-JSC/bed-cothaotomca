import Banner from "@/components/Banner";
import CardBlog from "@/components/Card/CardBlog";
import CardBlogRow from "@/components/Card/CardBlogRow";
import { useTranslations } from "next-intl";

export default function BlogIndexPage() {
  const t = useTranslations("common");
  const banner = {
    image: {
      url: "/images/demo/banner-blog.jpg",
      alt: "banner blog",
    },
  };

  const categories = [
    { id: 1, name: "Danh mục A" },
    { id: 2, name: "Danh mục B" },
    { id: 3, name: "Danh mục C" },
    { id: 4, name: "Danh mục D" },
  ];

  const blogData = [
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Shrimp Korean style",
      },
      title:
        "Cách ăn Tôm ngâm tương chuẩn vị Hàn Quốc cùng rong biển và cơm nóng",
      category: {
        title: "Danh mục A",
        slug: "danh-muc-a",
      },
      created_at: "2024-06-12",
    },
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Healthy salad",
      },
      title: "5 món salad healthy giúp bạn giữ dáng và đẹp da mỗi ngày",
      category: {
        title: "Ẩm thực",
        slug: "am-thuc",
      },
      created_at: "2024-05-20",
    },
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Vietnamese food",
      },
      title: "Top món ăn Việt Nam được khách du lịch yêu thích nhất",
      category: {
        title: "Du lịch",
        slug: "du-lich",
      },
      created_at: "2024-04-15",
    },
    {
      image: {
        url: "/images/demo/image-blog.jpg",
        alt: "Dessert cake",
      },
      title: "Cách làm bánh ngọt đơn giản tại nhà cho người mới bắt đầu",
      category: {
        title: "Món ngon",
        slug: "mon-ngon",
      },
      created_at: "2024-03-10",
    },
  ];

  return (
    <main>
      <Banner banner={banner} />
      <section className="py-12 md:py-14 xl:py-16">
        <div className="container space-y-12 md:space-y-16 xl:space-y-20">
          <div className="space-y-4 md:space-y-6 xl:space-y-8">
            <h1 className="display-2 text-priamry text-center">
              Góc Bếp Cô Thảo
            </h1>

            <div className="w-full overflow-x-auto">
              {categories.length > 0 ? (
                <div className="flex items-center justify-center gap-4 flex-nowrap w-max mx-auto">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className="btn btn-white label-1 !min-w-auto px-3.5 py-2.5"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-6 md:gap-6 lg:flex-row xl:gap-8">
              <div className="w-full lg:max-w-[500px] xl:max-w-[725px]">
                <CardBlog isHot item={blogData[0]} />
              </div>
              <div className="flex-1 space-y-4 md:space-y-4 xl:space-y-8">
                {blogData.map((item, index) => (
                  <CardBlogRow key={index} item={item} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-4 gap-x-3 xl:gap-x-6 md:gap-y-8 gap-y-5 xl:gap-y-10">
            {blogData.map((item, index) => (
              <CardBlog key={index} item={item} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
