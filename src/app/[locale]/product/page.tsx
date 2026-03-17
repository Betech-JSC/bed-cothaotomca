import { useTranslations } from 'next-intl'

export default function ProductIndexPage() {
  const t = useTranslations('common')
  return (
    <div className="container pt-20">
      <h1 className="text-3xl font-bold">{t('product')}</h1>
    </div>
  )
}
