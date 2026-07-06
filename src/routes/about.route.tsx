import { useI18n } from '../shared/i18n/I18nContext'

export function AboutRoute() {
  const { t } = useI18n()

  return (
    <article className="about-route">
      <h1>{t('about.title')}</h1>
      <p>{t('about.intro')}</p>
      <dl className="about-route__facts">
        <dt>{t('about.facts.length')}</dt>
        <dd>{t('about.facts.lengthValue')}</dd>
        <dt>{t('about.facts.tunnel')}</dt>
        <dd>{t('about.facts.tunnelValue')}</dd>
        <dt>{t('about.facts.decided')}</dt>
        <dd>{t('about.facts.decidedValue')}</dd>
        <dt>{t('about.facts.law')}</dt>
        <dd>{t('about.facts.lawValue')}</dd>
        <dt>{t('about.facts.budget')}</dt>
        <dd>{t('about.facts.budgetValue')}</dd>
        <dt>{t('about.facts.expropriation')}</dt>
        <dd>{t('about.facts.expropriationValue')}</dd>
        <dt>{t('about.facts.construction')}</dt>
        <dd>{t('about.facts.constructionValue')}</dd>
        <dt>{t('about.facts.completion')}</dt>
        <dd>{t('about.facts.completionValue')}</dd>
      </dl>
      <p className="about-route__note">{t('about.note')}</p>
    </article>
  )
}
