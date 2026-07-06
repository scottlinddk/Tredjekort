import { NavLink, Outlet } from 'react-router'

export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__title">3. Limfjordsforbindelse</span>
        <nav className="app-header__nav">
          <NavLink to="/" end>
            Map
          </NavLink>
          <NavLink to="/about">Project overview</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
