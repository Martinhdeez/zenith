import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import zenithLogo from '../../../assets/logo/LOGO-DEFINITIVO.png'
import './SideBar.css'

const navLinks = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/assistant', label: 'AI Assistant', icon: 'ai' },
]

export function SideBarIcon({ type }) {
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
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 0 0 2.572-1.065ZM12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
    </svg>
  )
}

function SideBar({ links = navLinks, isAuthenticated = true, onLogin, onRegister, onNewClick }) {
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
          <Link
            to="/"
            className="sidebar-brand"
            onClick={closeMobile}
          >
            <span className="sidebar-logo-word">
              <span className="sidebar-brand-mark" aria-hidden="true">
                <img src={zenithLogo} alt="" />
              </span>
              <span className="sidebar-logo-rest">enith</span>
            </span>
          </Link>

          {isAuthenticated && (
            <button
              className="sidebar-new"
              type="button"
              onClick={onNewClick}
            >
              <span className="sidebar-new-plus" aria-hidden="true">
                +
              </span>
              <span>New</span>
            </button>
          )}

          <ul className="sidebar-menu">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink
                  to={link.href}
                  className={({ isActive }) => 
                    `sidebar-menu-link${isActive ? ' sidebar-menu-link--active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  <span className="sidebar-menu-icon">
                    <SideBarIcon type={link.icon} />
                  </span>
                  <span>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {isAuthenticated ? (
            <div className="sidebar-bottom">
              <ul className="sidebar-menu">
                <li>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) => 
                      `sidebar-menu-link${isActive ? ' sidebar-menu-link--active' : ''}`
                    }
                    onClick={closeMobile}
                  >
                    <span className="sidebar-menu-icon">
                      <SideBarIcon type="settings" />
                    </span>
                    <span>Settings</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          ) : (
            <div className="sidebar-bottom">
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
            </div>
          )}
        </div>
      </aside>

      {isMobileOpen ? <button className="sidebar-overlay" type="button" aria-label="Close sidebar" onClick={closeMobile} /> : null}
    </>
  )
}

export default SideBar
