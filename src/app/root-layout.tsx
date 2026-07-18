import { NavLink, Outlet } from 'react-router'
import { useI18n } from '../shared/i18n/I18nContext'
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher'
import { ThemeToggle } from '../shared/components/ThemeToggle'

export function RootLayout() {
  const { t } = useI18n()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>
      <header className="app-header">
        <h1 className="app-header__title">{t('app.title')}</h1>
        <div className="app-header__side">
          <nav className="app-header__nav">
            <NavLink to="/" end>
              {t('nav.map')}
            </NavLink>
            <NavLink to="/about">{t('nav.about')}</NavLink>
            <NavLink to="/changes">{t('nav.changes')}</NavLink>
            <NavLink to="/sources">{t('nav.sources')}</NavLink>
          </nav>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
