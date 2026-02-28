import { useCallback, useEffect, useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import ProfileOverviewCard from '../components/ProfileOverviewCard.jsx'
import './ProfilePage.css'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getDetailFromPayload(payload) {
  if (!payload) {
    return null
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload === 'object' && payload.detail !== undefined) {
    return payload.detail
  }

  return null
}

function getValidationMessage(issue) {
  const message = normalizeText(issue?.msg)
  const field = Array.isArray(issue?.loc) ? issue.loc[issue.loc.length - 1] : ''

  if (field === 'username') {
    if (message.includes('at least 3')) {
      return 'Username is too short. Use at least 3 characters.'
    }
    return 'Username is invalid. Use 3 to 50 characters.'
  }

  if (field === 'email') {
    return 'Email is not valid. Use a real email address like name@email.com.'
  }

  if (message) {
    return message
  }

  return 'Some fields are invalid. Please review the form.'
}

function getProfileSaveErrorMessage(status, payload) {
  const detail = getDetailFromPayload(payload)

  if (status === 400) {
    const normalized = normalizeText(detail)
    if (normalized.toLowerCase().includes('already exists')) {
      return 'That username or email is already in use. Try another one.'
    }
    return normalized || 'We could not save your profile changes.'
  }

  if (Array.isArray(detail)) {
    const messages = detail.map(getValidationMessage).filter(Boolean)
    return [...new Set(messages)].join('\n')
  }

  const normalized = normalizeText(detail)
  if (normalized) {
    return normalized
  }

  return 'We could not save your profile changes. Please try again.'
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

  const isValidEmail = (value) => /.+@.+\..+/.test(value)

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
      if (fetchError?.name === 'TypeError') {
        setError('Cannot connect to the server. Make sure backend is running.')
      } else {
        setError(fetchError.message || 'Unable to load profile information.')
      }
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

    if (username.length < 3) {
      setSaveError('Username is too short. Use at least 3 characters.')
      return
    }

    if (!isValidEmail(email)) {
      setSaveError('Email is not valid. Example: name@email.com')
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
        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = await response.text()
        }

        throw new Error(getProfileSaveErrorMessage(response.status, payload))
      }

      const updatedUser = await response.json()
      setProfile(updatedUser)
      setFormValues({
        username: updatedUser.username || '',
        email: updatedUser.email || '',
      })
      setSaveSuccess('Profile updated successfully.')
    } catch (saveRequestError) {
      if (saveRequestError?.name === 'TypeError') {
        setSaveError('Cannot connect to the server. Make sure backend is running.')
      } else {
        setSaveError(saveRequestError.message || 'Unable to save profile changes.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <SideBar isAuthenticated onSignOut={onSignOut} />

      <main className="profile-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
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
