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

function ProfileOverviewCard({ user, loading, error, onRefresh }) {
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
        <button type="button" className="profile-overview-card__refresh" onClick={onRefresh}>
          Try again
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

  return (
    <section className="profile-overview-card">
      <header className="profile-overview-card__header">
        <span className="profile-overview-card__avatar" aria-hidden="true">
          {user.username?.charAt(0)?.toUpperCase() || 'U'}
        </span>
        <div>
          <h2>{user.username || 'User'}</h2>
          <p>{user.email}</p>
        </div>
      </header>

      <dl className="profile-overview-card__details">
        <div>
          <dt>User ID</dt>
          <dd>{user.id ?? 'Not available'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{user.is_active ? 'Active' : 'Inactive'}</dd>
        </div>
        <div>
          <dt>Created at</dt>
          <dd>{formatDate(user.created_at)}</dd>
        </div>
        <div>
          <dt>Updated at</dt>
          <dd>{formatDate(user.updated_at)}</dd>
        </div>
      </dl>

      <button type="button" className="profile-overview-card__refresh" onClick={onRefresh}>
        Refresh profile
      </button>
    </section>
  )
}

export default ProfileOverviewCard
