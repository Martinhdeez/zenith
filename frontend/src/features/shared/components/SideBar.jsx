import './SideBar.css'

const navLinks = [
  { href: '#overview', label: 'Home', isActive: true },
  { href: '#paths', label: 'AI Assistant', isActive: false },
]

function SideBar({ links = navLinks, isAuthenticated = true, onLogin, onRegister, onSignOut }) {
  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <div className="logo">Zenith</div>
        </div>

        {isAuthenticated ? (
          <>
            <button className="sidebar-new" type="button">
              <span className="sidebar-new-plus" aria-hidden="true">
                +
              </span>
              <span>New</span>
            </button>

            <nav className="sidebar-nav">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${link.isActive ? 'sidebar-link--active' : ''}`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="sidebar-footer">
              <a className="sidebar-link sidebar-link--settings" href="#settings">
                Settings
              </a>
              {onSignOut ? (
                <button className="sidebar-logout" type="button" onClick={onSignOut}>
                  Sign out
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="sidebar-auth">
            <button className="sidebar-auth-btn" type="button" onClick={onLogin}>
              Log in
            </button>
            <button className="sidebar-auth-btn sidebar-auth-btn--primary" type="button" onClick={onRegister}>
              Register
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default SideBar
