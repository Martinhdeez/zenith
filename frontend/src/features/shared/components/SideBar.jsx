// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import zenithLogo from '../../../assets/logo/LOGO-DEFINITIVO.png'
import './SideBar.css'

const navLinks = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/assistant', label: 'Chat', icon: 'ai' },
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

  if (type === 'profile') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
      </svg>
    )
  }

  if (type === 'signout') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.543-.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 2.572-1.065ZM12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
    </svg>
  )
}

function SideBar({ links = navLinks, isAuthenticated = true, onLogin, onRegister, onNewClick, onSignOut, isGraphMode = false }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  // Sync isCollapsed with a CSS variable for global layout adjustment
  useEffect(() => {
    const width = isCollapsed ? '80px' : '20rem'
    document.documentElement.style.setProperty('--sidebar-width', width)
    localStorage.setItem('sidebar-collapsed', isCollapsed)
  }, [isCollapsed])

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

      <aside 
        id="logo-sidebar" 
        className={`sidebar${isMobileOpen ? ' sidebar--open' : ''}${isCollapsed ? ' sidebar--collapsed' : ''}${isGraphMode ? ' sidebar--graph-mode' : ''}`} 
        aria-label="Sidebar"
      >
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
              {!isCollapsed && <span className="sidebar-logo-rest">enith</span>}
            </span>
          </Link>


          {isAuthenticated ? (
            onNewClick && (
                <button
                  id="step-upload"
                  className="sidebar-new"
                  type="button"
                  onClick={onNewClick}
                  title={isCollapsed ? "New item" : ""}
                >
                  <span className="sidebar-new-plus" aria-hidden="true">
                    +
                  </span>
                  {!isCollapsed && <span>New</span>}
                </button>
            )
          ) : (
            <button
              className="sidebar-menu-link"
              type="button"
              onClick={() => { onLogin(); closeMobile(); }}
              title={isCollapsed ? 'Log in' : ''}
            >
              <span className="sidebar-menu-icon">
                <SideBarIcon type="login" />
              </span>
              {!isCollapsed && <span>Log in</span>}
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
                    {!isCollapsed && <span>{link.label}</span>}
                  </NavLink>
                </li>
              ))
            ) : (
              <li>
                <button
                  className="sidebar-menu-link"
                  type="button"
                  onClick={() => { onRegister(); closeMobile(); }}
                  title={isCollapsed ? 'Register' : ''}
                >
                  <span className="sidebar-menu-icon">
                    <SideBarIcon type="register" />
                  </span>
                  {!isCollapsed && <span>Register</span>}
                </button>
              </li>
            )}
          </ul>

          {!isAuthenticated && !isCollapsed && (
            <div className="sidebar-guest-notice">
              <p>Sign in to unlock AI Assistant and your personal cloud.</p>
            </div>
          )}

          <div className="sidebar-bottom">
            {isAuthenticated && (
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `sidebar-menu-link${isActive ? ' sidebar-menu-link--active' : ''}`
                }
                onClick={closeMobile}
                title={isCollapsed ? "Profile" : ""}
              >
                <span className="sidebar-menu-icon">
                  <SideBarIcon type="profile" />
                </span>
                {!isCollapsed && <span>Profile</span>}
              </NavLink>
            )}
            {isAuthenticated && onSignOut && (
              <button
                className="sidebar-menu-link sidebar-menu-link--danger"
                type="button"
                onClick={() => { onSignOut(); closeMobile(); }}
                title={isCollapsed ? "Sign out" : ""}
              >
                <span className="sidebar-menu-icon">
                  <SideBarIcon type="signout" />
                </span>
                {!isCollapsed && <span>Sign out</span>}
              </button>
            )}
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}>
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {isMobileOpen ? <button className="sidebar-overlay" type="button" aria-label="Close sidebar" onClick={closeMobile} /> : null}
    </>
  )
}

export default SideBar
