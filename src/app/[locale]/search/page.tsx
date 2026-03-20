import { useTranslations } from 'next-intl'

export default function SearchPage() {
  const t = useTranslations('common')
  return (
    <div className="container pt-20">
      <h1 className="text-3xl font-bold">{t('search')}</h1>
    </div>
  )
}
