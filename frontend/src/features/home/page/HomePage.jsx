import { useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import './HomePage.css'

const folderItems = [
  { title: 'Informatica', subtitle: 'in My Drive' },
  { title: 'UDC', subtitle: 'in Shared with me' },
  { title: 'Grupo Mayorista', subtitle: 'in Shared with me' },
]

const fileItems = [
  { name: '1.1_1 Interview group 3', type: 'doc', activity: 'Opened · 25 Feb' },
  { name: 'TGR ACL', type: 'doc', activity: 'Opened · 26 Feb' },
  { name: 'Comparative notes', type: 'sheet', activity: 'Opened · 20 Feb' },
  { name: 'APUNTES-XP.pdf', type: 'pdf', activity: 'Opened · 12 Feb' },
  { name: 'Tryhard FIC', type: 'sheet', activity: 'Opened · 19 Feb' },
  { name: 'Notas LSI P1 general', type: 'doc', activity: 'Opened · 25 Feb' },
  { name: '1.1_1 Interview group 2', type: 'doc', activity: 'Modified · 25 Feb' },
  { name: 'ACL-Grupo8', type: 'slides', activity: 'Opened · 19 Feb' },
  { name: 'Los santos inocentes...', type: 'video', activity: 'Opened · 11 Feb' },
  { name: 'Horarios de todos', type: 'sheet', activity: 'Opened · 2 Feb' },
]

function HomePage({ userName, onSignOut }) {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLowerCase()

  const visibleFolders = folderItems.filter((item) => {
    if (!normalizedSearch) {
      return true
    }
    return `${item.title} ${item.subtitle}`.toLowerCase().includes(normalizedSearch)
  })

  const visibleFiles = fileItems.filter((item) => {
    if (!normalizedSearch) {
      return true
    }
    return `${item.name} ${item.type} ${item.activity}`.toLowerCase().includes(normalizedSearch)
  })

  return (
    <div className="home-page">
      <SideBar isAuthenticated onSignOut={onSignOut} />

      <main className="home-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          onAiClick={() => {}}
          onProfileClick={() => {}}
          profileLabel={`${userName || 'User'} profile`}
        />

        <section className="drive-mockup" aria-label="Drive style mockup">
          <h1 className="drive-mockup__title">Welcome to Zenith Drive</h1>

          <div className="drive-block">
            <h2 className="drive-block__title">
              <span className="drive-block__chevron" aria-hidden="true">
                ▾
              </span>
              Suggested folders
            </h2>

            <div className="folder-grid">
              {visibleFolders.map((folder) => (
                <article key={folder.title} className="folder-card">
                  <div className="folder-card__left">
                    <span className="folder-card__icon" aria-hidden="true">
                      🗂
                    </span>
                    <div>
                      <h3>{folder.title}</h3>
                      <p>{folder.subtitle}</p>
                    </div>
                  </div>
                  <button className="folder-card__menu" type="button" aria-label={`Open ${folder.title} options`}>
                    ⋮
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="drive-block">
            <div className="drive-block__header">
              <h2 className="drive-block__title">Suggested files</h2>
              <div className="drive-view-switch" aria-label="View mode">
                <button type="button" className="is-muted" aria-label="List view">
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
                  <header className="file-card__head">
                    <span className={`file-card__type file-card__type--${file.type}`}>{file.type.toUpperCase()}</span>
                    <h3>{file.name}</h3>
                    <button className="file-card__menu" type="button" aria-label={`Open ${file.name} options`}>
                      ⋮
                    </button>
                  </header>
                  <div className="file-card__preview" />
                  <footer className="file-card__meta">
                    <span className="file-card__avatar" aria-hidden="true">
                      ●
                    </span>
                    <span>{file.activity}</span>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
