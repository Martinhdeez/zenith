import { useMemo, useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import './HomePage.css'

const folderItems = [
  { title: 'Hackathon Assets', subtitle: 'in My Drive' },
  { title: 'UX References', subtitle: 'in Shared with me' },
  { title: 'Research Notes', subtitle: 'in Shared with me' },
]

const fileItems = [
  { name: 'Sprint brief v3', type: 'doc', activity: 'Opened · 25 Feb' },
  { name: 'Architecture overview', type: 'slides', activity: 'Opened · 24 Feb' },
  { name: 'Data model matrix', type: 'sheet', activity: 'Opened · 20 Feb' },
  { name: 'API contract.pdf', type: 'pdf', activity: 'Opened · 19 Feb' },
  { name: 'Roadmap timeline', type: 'sheet', activity: 'Opened · 18 Feb' },
  { name: 'Onboarding notes', type: 'doc', activity: 'Opened · 17 Feb' },
  { name: 'Research summary', type: 'doc', activity: 'Modified · 15 Feb' },
  { name: 'Zenith pitch deck', type: 'slides', activity: 'Opened · 14 Feb' },
  { name: 'Prototype demo', type: 'video', activity: 'Opened · 13 Feb' },
  { name: 'Team planning', type: 'sheet', activity: 'Opened · 10 Feb' },
]

function HomePage({ currentUser, onSignOut, onViewProfile, onNavigate }) {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLowerCase()

  const visibleFolders = useMemo(
    () =>
      folderItems.filter((item) => {
        if (!normalizedSearch) {
          return true
        }
        return `${item.title} ${item.subtitle}`.toLowerCase().includes(normalizedSearch)
      }),
    [normalizedSearch],
  )

  const visibleFiles = useMemo(
    () =>
      fileItems.filter((item) => {
        if (!normalizedSearch) {
          return true
        }
        return `${item.name} ${item.type} ${item.activity}`.toLowerCase().includes(normalizedSearch)
      }),
    [normalizedSearch],
  )

  return (
    <div className="home-page">
      <SideBar isAuthenticated onNavigate={onNavigate} />

      <main className="home-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          onAiClick={() => {}}
          onViewProfile={onViewProfile}
          onSignOut={onSignOut}
          profileLabel={`${currentUser?.username || 'User'} profile`}
        />

        <section className="home-shell" aria-label="Zenith Home">
          <header className="home-shell__header">
            <h1>Zenith Home</h1>
            <p>Your folders and recent files, organized in one place.</p>
          </header>

          <section className="home-section" aria-label="Suggested folders">
            <h2>Suggested folders</h2>
            <div className="folder-grid">
              {visibleFolders.map((folder) => (
                <article key={folder.title} className="folder-card">
                  <div className="folder-card__left">
                    <span className="folder-card__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.3l1.6 1.7h7.1A2.5 2.5 0 0 1 21 9.2v7.3a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5V7.5Z" />
                      </svg>
                    </span>
                    <div>
                      <h3>{folder.title}</h3>
                      <p>{folder.subtitle}</p>
                    </div>
                  </div>
                  <button className="card-menu" type="button" aria-label={`Open ${folder.title} options`}>
                    <span aria-hidden="true">⋯</span>
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="home-section" aria-label="Suggested files">
            <div className="home-section__header">
              <h2>Suggested files</h2>
              <div className="view-toggle" aria-label="View mode">
                <button type="button" aria-label="List view">
                  ≡
                </button>
                <button type="button" className="is-active" aria-label="Grid view">
                  ⊞
                </button>
              </div>
            </div>

            <div className="file-grid">
              {visibleFiles.map((file) => (
                <article key={file.name} className="file-card">
                  <header className="file-card__header">
                    <span className={`file-card__type file-card__type--${file.type}`}>{file.type.toUpperCase()}</span>
                    <h3>{file.name}</h3>
                    <button className="card-menu" type="button" aria-label={`Open ${file.name} options`}>
                      <span aria-hidden="true">⋯</span>
                    </button>
                  </header>
                  <div className={`file-card__preview file-card__preview--${file.type}`} />
                  <footer className="file-card__meta">
                    <span className="file-card__avatar" aria-hidden="true">
                      {currentUser?.username?.trim()?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <span>{file.activity}</span>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

export default HomePage
