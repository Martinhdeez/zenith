import { useEffect, useState } from 'react'
import './SideBar.css'

const navLinks = [
  { href: '#overview', label: 'Home', icon: 'home', isActive: false },
  { href: '#paths', label: 'AI Assistant', icon: 'ai', isActive: false },
]

function SideBarIcon({ type }) {
  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.2L12 4l8 7.2V20h-5.4v-5.6H9.4V20H4v-8.8Z" />
      </svg>
    )
  }

  if (type === 'ai') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a8.5 8.5 0 0 0-8.5 8.5c0 2.2.9 4.2 2.3 5.8L5.5 21l3.9-1.6a8.5 8.5 0 1 0 2.6-16.4Zm-3 9a1.2 1.2 0 1 1 0-2.4A1.2 1.2 0 0 1 9 12Zm3 0a1.2 1.2 0 1 1 0-2.4A1.2 1.2 0 0 1 12 12Zm3 0a1.2 1.2 0 1 1 0-2.4A1.2 1.2 0 0 1 15 12Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.1 2h1.8l.6 2.4a7.7 7.7 0 0 1 2 .8l2.1-1.3 1.3 1.3-1.3 2.1c.3.6.6 1.3.8 2l2.4.6v1.8l-2.4.6a8 8 0 0 1-.8 2l1.3 2.1-1.3 1.3-2.1-1.3c-.6.3-1.3.6-2 .8l-.6 2.4h-1.8l-.6-2.4a7.7 7.7 0 0 1-2-.8L6.2 20l-1.3-1.3 1.3-2.1a7.7 7.7 0 0 1-.8-2L3 14v-1.8l2.4-.6a8 8 0 0 1 .8-2L4.9 7.5l1.3-1.3 2.1 1.3c.6-.3 1.3-.6 2-.8l.8-2.7ZM12 15.8a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6Z" />
    </svg>
  )
}

function SideBar({ links = navLinks, isAuthenticated = true, onLogin, onRegister, onSignOut }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (!isMobileOpen) {
      return
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobileOpen])

  const closeMobile = () => setIsMobileOpen(false)

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        aria-controls="logo-sidebar"
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen((prev) => !prev)}
      >
        <span className="sr-only">Open sidebar</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14M5 12h14M5 17h10" />
        </svg>
      </button>

      <aside id="logo-sidebar" className={`sidebar${isMobileOpen ? ' sidebar--open' : ''}`} aria-label="Sidebar">
        <div className="sidebar-scroll">
          <a href="#overview" className="sidebar-brand" onClick={closeMobile}>
            <span className="sidebar-brand-mark" aria-hidden="true">
              <span className="sidebar-brand-dot"></span>
            </span>
            <span className="sidebar-logo">Zenith</span>
          </a>

          {isAuthenticated ? (
            <>
              <button className="sidebar-new" type="button" onClick={closeMobile}>
                <span className="sidebar-new-plus" aria-hidden="true">
                  +
                </span>
                <span>New</span>
              </button>

              <ul className="sidebar-menu">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={`sidebar-menu-link${link.isActive ? ' sidebar-menu-link--active' : ''}`}
                      onClick={closeMobile}
                    >
                      <span className="sidebar-menu-icon">
                        <SideBarIcon type={link.icon} />
                      </span>
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="sidebar-bottom">
                <ul className="sidebar-menu">
                  <li>
                    <a href="#settings" className="sidebar-menu-link" onClick={closeMobile}>
                      <span className="sidebar-menu-icon">
                        <SideBarIcon type="settings" />
                      </span>
                      <span>Settings</span>
                    </a>
                  </li>
                </ul>

                {onSignOut ? (
                  <button className="sidebar-signout" type="button" onClick={onSignOut}>
                    Sign out
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <ul className="sidebar-menu sidebar-menu--auth">
              <li>
                <button className="sidebar-menu-link" type="button" onClick={onLogin}>
                  <span>Log in</span>
                </button>
              </li>
              <li>
                <button className="sidebar-menu-link" type="button" onClick={onRegister}>
                  <span>Register</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </aside>

      {isMobileOpen ? <button className="sidebar-overlay" type="button" aria-label="Close sidebar" onClick={closeMobile} /> : null}
    </>
  )
}

export default SideBar
