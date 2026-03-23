import Banner from '@/components/Banner';
import ShareFacebook from '@/components/Icons/ShareFacebook';
import ShareInstagram from '@/components/Icons/ShareInstagram';
import ShareThreads from '@/components/Icons/ShareThreads';
import ShareTikTok from '@/components/Icons/ShareTikTok';
import ShareYoutube from '@/components/Icons/ShareYoutube';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server'
import { getGeneralSettings } from '@/services/generalSettingService';

export default async function ContactPage() {
  const t = await getTranslations()
  const banner = {
    image: {
      url: "/images/demo/banner-contact.jpg",
      alt: "banner contact",
    },
  };

  const settings = await getGeneralSettings().catch(() => null);

  const hotline = settings?.hotline;
  const email = settings?.email;
  const address = settings?.address;
  const linkAddress = settings?.link_address;

  const socials = [
    { icon: <ShareFacebook />, href: settings?.link_facebook },
    { icon: <ShareInstagram />, href: settings?.link_instagram },
    { icon: <ShareThreads />, href: settings?.link_threads },
    { icon: <ShareTikTok />, href: settings?.link_tiktok },
    { icon: <ShareYoutube />, href: settings?.link_youtube },
  ];

  return (
    <main>
      <Banner banner={banner} />

      <section className="xl:pt-[60px] xl:pb-[112px] md:py-16 py-12">
        <div className="container md:space-y-16 space-y-12 xl:space-y-20">
          <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8">

            <div className="col-span-full lg:col-span-6 xl:col-span-7 md:space-y-6 space-y-4 xl:space-y-8">
              <div className="space-y-3">
                <h1 className="display-3 text-primary">{t('contact.title')}</h1>
                <p className="body-1 text-gray-900 max-w-[700px]">
                  {t('contact.description')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-y-6 gap-y-4 xl:gap-y-8 md:gap-x-3 xl:gap-x-6">
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">{t('contact.address')}</h3>
                  <div className="body-1 text-gray-900 lg:hover:text-secondary duration-300 ease-in-out">
                    <a href={linkAddress} target="_blank" rel="noopener noreferrer nofollow">
                      {address}
                    </a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Hotline</h3>
                  <div className="body-1 text-gray-900 lg:hover:text-secondary duration-300 ease-in-out">
                    <a href={`tel:${hotline.replace(/\s/g, '')}`}>{hotline}</a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Email</h3>
                  <div className="body-1 text-gray-900 lg:hover:text-secondary duration-300 ease-in-out">
                    <a href={`mailto:${email}`}>{email}</a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="title-3 text-gray-900">Social</h3>
                  <div className="flex items-center gap-3 md:gap-2 xl:gap-3">
                    {socials.map((item, idx) => (
                      item.href && (
                        <a
                          key={idx}
                          href={item.href}
                          className="size-10 rounded-[8px] flex items-center justify-center bg-white text-[#4C76C0] lg:hover:text-secondary lg:hover:bg-primary duration-300 ease-in-out shadow-sm"
                        >
                          {item.icon}
                        </a>
                      )
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
                  <h2 className="title-1 text-yellow">{t('contact.form.title')}</h2>

                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="body-1 text-white block">{t('contact.form.name.title')}</label>
                        <input
                          type="text"
                          placeholder={t('contact.form.name.placeholder')}
                          className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-1 text-white block">{t('contact.form.phone.title')}</label>
                        <input
                          type="tel"
                          placeholder={t('contact.form.phone.placeholder')}
                          className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="body-1 text-white block">{t('contact.form.message.title')}</label>
                      <textarea
                        rows={4}
                        placeholder={t('contact.form.message.placeholder')}
                        className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-secondary !w-full"
                    >
                      {t('button.submit-form')}
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
