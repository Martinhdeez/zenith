import { useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import './HomePage.css'

function HomePage({ userName, onSignOut }) {
  const [search, setSearch] = useState('')

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
      </main>
    </div>
  )
}

export default HomePage
