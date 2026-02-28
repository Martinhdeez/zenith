import { useEffect, useMemo, useState, useCallback } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import FolderCard from '../../file/components/FolderCard.jsx'
import FileCard from '../../file/components/FileCard.jsx'
import UploadModal from '../../file/components/UploadModal.jsx'
import { fileService } from '../../file/services/fileService'
import './HomePage.css'

function HomePage({ currentUser, onSignOut, onViewProfile, onNavigate }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  
  const normalizedSearch = search.trim().toLowerCase()

  // Fetch files on mount
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fileService.getFiles('/')
      setItems(data)
    } catch (err) {
      console.error('Error fetching files:', err)
      setError('Failed to load files. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle search (could be optimized with debounce)
  useEffect(() => {
    if (!normalizedSearch) {
      fetchData()
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        // Default to semantic search for better experience
        const results = await fileService.searchFiles(normalizedSearch, 'semantic')
        // results represent the files found by semantic search
        setItems(results.map(r => r.file || r))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [normalizedSearch, fetchData])

  // Handle upload from modal
  const handleUpload = useCallback(async (mode, file, name, description, manualPath) => {
    let result
    if (mode === 'smart') {
      result = await fileService.smartUpload(file, name, description)
    } else {
      result = await fileService.uploadFile(file, name, manualPath, description)
    }
    // Refresh file list after successful upload
    fetchData()
    return result
  }, [fetchData])

  const folders = useMemo(() => items.filter(i => i.file_type === 'dir'), [items])
  const files = useMemo(() => items.filter(i => i.file_type === 'file'), [items])

  const userChar = currentUser?.username?.trim()?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="home-page">
      <SideBar isAuthenticated onNavigate={onNavigate} />

      <main className="home-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          onAiClick={() => {}} // Could trigger "deep" search
          onViewProfile={onViewProfile}
          onSignOut={onSignOut}
          profileLabel={`${currentUser?.username || 'User'} profile`}
        />

        <section className="home-shell" aria-label="Zenith Home">
          <header className="home-shell__header">
            <h1>Zenith Home</h1>
            <p>Your folders and recent files, organized in one place.</p>
          </header>

          {loading && <p className="status-msg">Loading your workspace...</p>}
          {error && <p className="status-msg error">{error}</p>}
          
          {!loading && !error && items.length === 0 && (
            <p className="status-msg">No files found. Try uploading something!</p>
          )}

          {!loading && folders.length > 0 && (
            <section className="home-section" aria-label="Folders">
              <h2>Folders</h2>
              <div className="folder-grid">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    title={folder.name}
                    subtitle={folder.description || 'Folder'}
                    onClick={() => console.log('Open folder', folder.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {!loading && files.length > 0 && (
            <section className="home-section" aria-label="Files">
              <div className="home-section__header">
                <h2>Recent files</h2>
                <div className="view-toggle" aria-label="View mode">
                  <button type="button" aria-label="List view">≡</button>
                  <button type="button" className="is-active" aria-label="Grid view">⊞</button>
                </div>
              </div>

              <div className="file-grid">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    name={file.name}
                    type={file.mime_type || file.format || 'file'}
                    activity={file.updated_at ? `Modified · ${new Date(file.updated_at).toLocaleDateString()}` : 'New file'}
                    userChar={userChar}
                    onClick={() => console.log('Open file', file.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </section>
      </main>

      {/* Floating action button */}
      <button
        className="fab-upload"
        onClick={() => setShowUpload(true)}
        aria-label="Upload or create new file"
      >
        <span>+</span>
      </button>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          currentPath="/"
          onUpload={handleUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}


export default HomePage

