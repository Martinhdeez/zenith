import './TopBar.css'
import userIcon from '../../../assets/icons/user.svg'

const navLinks = [
  { href: '#challenges', label: 'Challenges' },
]

function TopBar({ links = navLinks, showActions = true, onSignUp, onSignIn, userName, onSignOut }) {
  const showProfile = !showActions && Boolean(userName)

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo">DevArena</div>
        <nav className="topbar-nav">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        {showActions ? (
          <div className="topbar-actions">
            <button className="btn ghost" type="button" onClick={onSignIn}>
              Sign in
            </button>
            <button className="btn primary" type="button" onClick={onSignUp}>
              Sign up
            </button>
          </div>
        ) : showProfile ? (
          <div className="topbar-profile">
            <span className="topbar-avatar" aria-hidden="true">
              <img className="topbar-avatar-icon" src={userIcon} alt="" />
            </span>
            <span className="topbar-username">{userName}</span>
            <button className="topbar-logout" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

export default TopBar
