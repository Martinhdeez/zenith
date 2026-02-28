import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import zenithLogo from '../../../assets/logo/LOGO-DEFINITIVO.png'
import './SideBar.css'

const navLinks = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/assistant', label: 'AI Assistant', icon: 'ai' },
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

  if (type === 'login') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4c.6 0 1 .4 1 1v7c0 .6-.4 1-1 1s-1-.4-1-1V5c0-.6.4-1 1-1Zm0 16c-4.4 0-8-3.6-8-8 0-1.1.2-2.1.7-3.1.2-.5.8-.7 1.3-.5.5.3.7.8.5 1.3-.4.8-.5 1.5-.5 2.3 0 3.3 2.7 6 6 6s6-2.7 6-6c0-.8-.1-1.5-.5-2.3-.2-.5 0-1.1.5-1.3s1.1 0 1.3.5c.5 1 .7 2 .7 3.1 0 4.4-3.6 8-8 8Z" />
      </svg>
    )
  }

  if (type === 'register') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4Zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.543-.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 2.572-1.065ZM12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
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
          <path d="M4 7h16M4 12h16M4 17h16" />
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

          {!isAuthenticated && (
            <div className="sidebar-guest-notice">
              <p>Sign in to unlock AI Assistant and your personal cloud.</p>
            </div>
          )}

          {isAuthenticated ? (
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
          ) : (
            <button
              className="sidebar-menu-link"
              type="button"
              onClick={() => { onLogin(); closeMobile(); }}
            >
              <span className="sidebar-menu-icon">
                <SideBarIcon type="login" />
              </span>
              <span>Log in</span>
            </button>
          )}

          <ul className="sidebar-menu">
            {isAuthenticated ? (
              links.map((link) => (
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
              ))
            ) : (
              <li>
                <button
                  className="sidebar-menu-link"
                  type="button"
                  onClick={() => { onRegister(); closeMobile(); }}
                >
                  <span className="sidebar-menu-icon">
                    <SideBarIcon type="register" />
                  </span>
                  <span>Register</span>
                </button>
              </li>
            )}
          </ul>

          {isAuthenticated && (
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
          )}
        </div>
      </aside>

      {isMobileOpen ? <button className="sidebar-overlay" type="button" aria-label="Close sidebar" onClick={closeMobile} /> : null}
    </>
  )
}

export default SideBar
