import { getTranslations } from 'next-intl/server'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <main>
      <div className="flex flex-col items-center justify-center min-h-[50vh] pt-20 space-y-4">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="text-xl">{t('description')}</p>
        <p className="text-sm text-gray-500">{t('language')}</p>
        <p className="text-green-600 mt-3">Đang test chuyển ngôn ngữ</p>
      </div>
    </main>
  )
}
