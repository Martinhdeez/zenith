import { useCallback, useEffect, useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import ProfileOverviewCard from '../components/ProfileOverviewCard.jsx'
import './ProfilePage.css'

function extractErrorMessage(rawValue, fallbackMessage) {
  if (!rawValue) {
    return fallbackMessage
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (typeof parsed?.detail === 'string') {
      return parsed.detail
    }
  } catch {
    // Ignore parse errors and fallback to plain text.
  }

  return typeof rawValue === 'string' ? rawValue : fallbackMessage
}

function ProfilePage({ currentUser, onSignOut }) {
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState(currentUser || null)
  const [formValues, setFormValues] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState('')

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
      setFormValues({
        username: userData.username || '',
        email: userData.email || '',
      })
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load profile information.')
    } finally {
      setLoading(false)
    }
  }, [onSignOut])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])


  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (saveError) {
      setSaveError(null)
    }
    if (saveSuccess) {
      setSaveSuccess('')
    }
  }

  const handleSave = async () => {
    if (!profile?.id || isSaving) {
      return
    }

    const username = formValues.username.trim()
    const email = formValues.email.trim()

    if (!username || !email) {
      setSaveError('Username and email are required.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setSaveError('No active session found.')
      return
    }

    try {
      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess('')

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${API_BASE_URL}/users/${profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          email,
        }),
      })

      if (response.status === 401 || response.status === 403) {
        onSignOut?.()
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(extractErrorMessage(errorText, 'Unable to save profile changes.'))
      }

      const updatedUser = await response.json()
      setProfile(updatedUser)
      setFormValues({
        username: updatedUser.username || '',
        email: updatedUser.email || '',
      })
      setSaveSuccess('Profile updated successfully.')
    } catch (saveRequestError) {
      setSaveError(saveRequestError.message || 'Unable to save profile changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <SideBar isAuthenticated />

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
            <p>Manage your account details and keep your information up to date.</p>
          </header>

          <ProfileOverviewCard
            user={profile}
            loading={loading}
            error={error}
            formValues={formValues}
            onFieldChange={handleFieldChange}
            onReload={() => void fetchProfile()}
            onSave={() => void handleSave()}
            isSaving={isSaving}
            saveError={saveError}
            saveSuccess={saveSuccess}
          />
        </section>
      </main>
    </div>
  )
}

export default ProfilePage
