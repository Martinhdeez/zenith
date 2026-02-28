import { useEffect, useRef, useState } from 'react'
import SearchInput from './SearchInput.jsx'
import userIcon from '../../../assets/icons/user.svg'
import './DashboardToolbar.css'

function DashboardToolbar({
  search,
  onSearchChange,
  searchMode = 'name',
  onModeChange,
  onViewProfile,
  onSignOut,
  profileLabel = 'Profile',
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const closeTimeoutRef = useRef(null)
  const hasProfileMenu = Boolean(onViewProfile || onSignOut)

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return
    }

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileMenuOpen])

  const openProfileMenu = () => {
    if (!hasProfileMenu) {
      return
    }
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setIsProfileMenuOpen(true)
  }

  const closeProfileMenu = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsProfileMenuOpen(false)
      closeTimeoutRef.current = null
    }, 130)
  }

  const handleProfileButtonClick = () => {
    if (!hasProfileMenu) {
      return
    }
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setIsProfileMenuOpen((prev) => !prev)
  }

  const handleViewProfile = () => {
    closeProfileMenu()
    onViewProfile?.()
  }

  const handleSignOut = () => {
    closeProfileMenu()
    onSignOut?.()
  }

  return (
    <div className="dashboard-toolbar" role="region" aria-label="Dashboard toolbar">
      <SearchInput
        id="dashboard-search"
        label="Search"
        value={search}
        onChange={onSearchChange}
        placeholder="Search..."
      />

      <div className="dashboard-toolbar__modes">
        <button 
          className={`dashboard-toolbar__mode-btn ${searchMode === 'semantic' ? 'is-active' : ''}`} 
          type="button" 
          onClick={() => onModeChange?.(searchMode === 'semantic' ? 'name' : 'semantic')}
          title="AI Semantic Search"
        >
          AI
        </button>
        <button 
          className={`dashboard-toolbar__mode-btn is-deep ${searchMode === 'deep' ? 'is-active' : ''}`} 
          type="button" 
          onClick={() => onModeChange?.(searchMode === 'deep' ? 'name' : 'deep')}
          title="Deep AI Search (GTP-4o)"
        >
          Deep
        </button>
      </div>

      <div
        className={`dashboard-toolbar__profile-wrap${isProfileMenuOpen ? ' is-open' : ''}`}
        ref={profileMenuRef}
        onMouseEnter={openProfileMenu}
        onMouseLeave={closeProfileMenu}
      >
        <button
          className="dashboard-toolbar__profile"
          type="button"
          onClick={handleProfileButtonClick}
          aria-label={profileLabel}
          aria-expanded={isProfileMenuOpen}
          aria-haspopup={hasProfileMenu ? 'menu' : undefined}
        >
          <img src={userIcon} alt="" />
        </button>

        {hasProfileMenu ? (
          <div className="dashboard-toolbar__profile-menu" role="menu" aria-label="Profile options">
            {onViewProfile ? (
              <button type="button" role="menuitem" onClick={handleViewProfile}>
                View profile
              </button>
            ) : null}
            {onSignOut ? (
              <button type="button" role="menuitem" className="is-danger" onClick={handleSignOut}>
                Sign out
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default DashboardToolbar
