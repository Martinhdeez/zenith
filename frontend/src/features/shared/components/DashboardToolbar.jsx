import SearchInput from './SearchInput.jsx'
import userIcon from '../../../assets/icons/user.svg'
import './DashboardToolbar.css'

function DashboardToolbar({ search, onSearchChange, onAiClick, onProfileClick, profileLabel = 'Profile' }) {
  return (
    <div className="dashboard-toolbar" role="region" aria-label="Dashboard toolbar">
      <SearchInput
        id="dashboard-search"
        label="Search"
        value={search}
        onChange={onSearchChange}
        placeholder="Search..."
      />

      <button className="dashboard-toolbar__ai" type="button" onClick={onAiClick}>
        AI
      </button>

      <button className="dashboard-toolbar__profile" type="button" onClick={onProfileClick} aria-label={profileLabel}>
        <img src={userIcon} alt="" />
      </button>
    </div>
  )
}

export default DashboardToolbar
