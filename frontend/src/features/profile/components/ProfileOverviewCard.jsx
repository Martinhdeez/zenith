import './ProfileOverviewCard.css'

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not available'
  }

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function ProfileOverviewCard({
  user,
  loading,
  error,
  formValues,
  onFieldChange,
  onReload,
  onSave,
  isSaving,
  saveError,
  saveSuccess,
}) {
  if (loading) {
    return (
      <section className="profile-overview-card">
        <p className="profile-overview-card__status">Loading profile...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="profile-overview-card">
        <p className="profile-overview-card__status profile-overview-card__status--error">{error}</p>
        <button type="button" className="profile-overview-card__save" onClick={onReload}>
          Reload profile
        </button>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="profile-overview-card">
        <p className="profile-overview-card__status">No profile data found.</p>
      </section>
    )
  }

  const displayName = formValues.username?.trim() || 'User'
  const avatarLetter = displayName.charAt(0).toUpperCase() || 'U'

  return (
    <section className="profile-overview-card">
      <div className="profile-overview-card__form">
        <label>
          Username
          <input
            type="text"
            name="username"
            value={formValues.username}
            onChange={onFieldChange}
            placeholder="username"
            autoComplete="username"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={formValues.email}
            onChange={onFieldChange}
            placeholder="name@email.com"
            autoComplete="email"
          />
        </label>
      </div>

      <p className="profile-overview-card__meta">Created at: {formatDate(user.created_at)}</p>

      {saveError ? <p className="profile-overview-card__status profile-overview-card__status--error">{saveError}</p> : null}
      {saveSuccess ? <p className="profile-overview-card__status profile-overview-card__status--success">{saveSuccess}</p> : null}

      <button type="button" className="profile-overview-card__save" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </section>
  )
}

export default ProfileOverviewCard
