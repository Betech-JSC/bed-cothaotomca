import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations()

  return (
    <main>
      <div className="flex flex-col items-center justify-center min-h-[50vh] pt-20 space-y-4">
      <h1 className="text-4xl font-bold">{t('home.title')}</h1>
      <p className="text-xl">{t('home.description')}</p>
      <p className="text-sm text-gray-500">{t('common.language')}</p>
      <p className="text-green-600 mt-3">Đang test chuyển ngôn ngữ</p>
    </div>
    </main>
  )
}
