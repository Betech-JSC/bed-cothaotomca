import { useTranslations } from 'next-intl'

export default function AboutPage() {
  const t = useTranslations('common')

  return (
    <div className="container pt-20">
      <h1 className="text-3xl font-bold">{t('about')}</h1>
    </div>
  )
}
