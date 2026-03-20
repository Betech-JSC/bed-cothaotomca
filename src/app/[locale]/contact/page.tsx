import Banner from '@/components/Banner';
import ShareFacebook from '@/components/Icons/ShareFacebook';
import ShareInstagram from '@/components/Icons/ShareInstagram';
import ShareThreads from '@/components/Icons/ShareThreads';
import ShareTikTok from '@/components/Icons/ShareTikTok';
import ShareYoutube from '@/components/Icons/ShareYoutube';
import Image from 'next/image';
import { useTranslations } from 'next-intl'

export default function ContactPage() {
  const t = useTranslations()
  const banner = {
    image: {
      url: "/images/demo/banner-contact.jpg",
      alt: "banner contact",
    },
  };
  const socials = [
    { icon: <ShareFacebook />, href: "#" },
    { icon: <ShareInstagram />, href: "#" },
    { icon: <ShareThreads />, href: "#" },
    { icon: <ShareTikTok />, href: "#" },
    { icon: <ShareYoutube />, href: "#" },
  ];

  return (
    <main>
      <Banner banner={banner} />

      <section className="xl:pt-[60px] xl:pb-[112px] md:py-16 py-12">
        <div className="container md:space-y-16 space-y-12 xl:space-y-20">
          <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">

            <div className="col-span-full lg:col-span-6 xl:col-span-7 md:space-y-6 space-y-4 xl:space-y-8">
              <div className="space-y-3">
                <h1 className="display-3 text-primary">Liên Hệ</h1>
                <p className="body-1 text-gray-900 max-w-[700px]">
                  Lắng nghe bằng sự ân cần, phục vụ bằng sự tận tâm. Dù bạn cần tư vấn về khẩu vị món ngâm tương, hay muốn đặt một phần hải sản loại 1 tươi ngon , Bếp Cô Thảo luôn ở đây để chuẩn bị cho bạn những mẻ mới nhất trong ngày.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-y-6 gap-y-4 xl:gap-y-8 md:gap-x-3 xl:gap-x-6">
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Địa chỉ</h3>
                  <div className="body-1 text-gray-900 lg:hover:text-secondary duration-300 ease-in-out">
                    <a href="https://maps.app.goo.gl/sf95bmqfjr9ZFGap8" target="_blank" rel="noopener noreferrer nofollow">
                      42/2 Trần Đình Xu, Cô Giang, Quận 1, Ho Chi Minh City, Vietnam
                    </a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Hotline</h3>
                  <div className="body-1 text-gray-900 lg:hover:text-secondary duration-300 ease-in-out">
                    <a href="tel:0987654321">0987 654 321</a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Email</h3>
                  <div className="body-1 text-gray-900 lg:hover:text-secondary duration-300 ease-in-out">
                    <a href="mailto:cothaotomca@gmail.com">cothaotomca@gmail.com</a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Social</h3>
                  <div className="flex items-center gap-3 md:gap-2 xl:gap-3">
                    {socials.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.href}
                        className="size-10 rounded-[8px] flex items-center justify-center bg-white text-[#4C76C0] lg:hover:text-secondary lg:hover:bg-primary duration-300 ease-in-out shadow-sm"
                      >
                        {item.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-full lg:col-span-6 xl:col-span-5">
              <div className="relative md:p-6 p-4 xl:p-12 rounded-[24px] overflow-hidden">
                <div className="absolute inset-0">
                  <Image
                    src="/images/contact/bg-form-contact.jpg"
                    alt="background form contact"
                    fill
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="relative space-y-6">
                  <h2 className="title-1 text-yellow">Bếp Cô Thảo có thể giúp gì cho bạn?</h2>

                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="body-1 text-white block">Họ và tên</label>
                        <input
                          type="text"
                          placeholder="Nhập họ và tên..."
                          className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-1 text-white block">Số điện thoại</label>
                        <input
                          type="tel"
                          placeholder="Nhập số điện thoại..."
                          className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="body-1 text-white block">Lời nhắn gửi</label>
                      <textarea
                        rows={4}
                        placeholder="Chia sẻ chi tiết hơn mong muốn của bạn với Bếp..."
                        className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-secondary !w-full"
                    >
                      Gửi Lời Nhắn
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[320px] md:h-[500px] xl:h-[734px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.6696883303193!2d106.68748928454276!3d10.75992006202524!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f93a0b9360d%3A0x682df2cb05b44a2d!2zQ8O0IFRo4bqjbyBUw7RtIEPDoSAtIEPDoSBI4buTaSBOZ8OibSBUxrDGoW5nIC0gUXXhuq1uIDE!5e0!3m2!1svi!2s!4v1773930837631!5m2!1svi!2s"
              width="100%"
              height="100%"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>
    </main>
  )
}
