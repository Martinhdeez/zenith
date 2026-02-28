import { useCallback, useEffect, useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import ProfileOverviewCard from '../components/ProfileOverviewCard.jsx'
import './ProfilePage.css'

function ProfilePage({ currentUser, onSignOut, onViewHome, onNavigate }) {
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState(currentUser || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('No active session found.')
      setProfile(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        onSignOut?.()
        return
      }

      if (!response.ok) {
        throw new Error('Unable to load profile information.')
      }

      const userData = await response.json()
      setProfile(userData)
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load profile information.')
    } finally {
      setLoading(false)
    }
  }, [onSignOut])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const handleNavigate = (href) => {
    if (href === '#home') {
      onViewHome?.()
      return
    }
    onNavigate?.(href)
  }

  return (
    <div className="profile-page">
      <SideBar isAuthenticated onNavigate={handleNavigate} />

      <main className="profile-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          onAiClick={() => {}}
          onViewProfile={() => {}}
          onSignOut={onSignOut}
          profileLabel={`${profile?.username || currentUser?.username || 'User'} profile`}
        />

        <section className="profile-shell">
          <header className="profile-shell__header">
            <h1>Profile</h1>
            <p>Manage your account details and review your session information.</p>
          </header>

          <ProfileOverviewCard user={profile} loading={loading} error={error} onRefresh={() => void fetchProfile()} />
        </section>
      </main>
    </div>
  )
}

export default ProfilePage
