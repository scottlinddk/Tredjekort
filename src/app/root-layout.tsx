import { NavLink, Outlet } from 'react-router'
import { useI18n } from '../shared/i18n/I18nContext'
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher'

export function RootLayout() {
  const { t } = useI18n()

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__title">{t('app.title')}</span>
        <div className="app-header__side">
          <nav className="app-header__nav">
            <NavLink to="/" end>
              {t('nav.map')}
            </NavLink>
            <NavLink to="/about">{t('nav.about')}</NavLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
