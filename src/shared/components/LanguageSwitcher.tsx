import { useI18n } from '../i18n/I18nContext'
import type { Language } from '../i18n/translations'

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'da', label: 'DA' },
  { code: 'en', label: 'EN' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  return (
    <div className="language-switcher" role="group" aria-label="Sprog / Language">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`language-switcher__option${language === code ? ' language-switcher__option--active' : ''}`}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
