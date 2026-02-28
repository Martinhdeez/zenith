import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import FolderCard from '../../file/components/FolderCard.jsx'
import FileCard from '../../file/components/FileCard.jsx'
import FileRow from '../../file/components/FileRow.jsx'
import UploadModal from '../../file/components/UploadModal.jsx'
import FilePreviewModal from '../../file/components/FilePreviewModal.jsx'
import ParticlesBackground from '../../landing/components/particlesBackground/ParticlesBackground.jsx'
import { fileService } from '../../file/services/fileService'
import { SideBarIcon } from '../../shared/components/SideBar.jsx'
import './HomePage.css'

function HomePage({ currentUser, onSignOut }) {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [currentPath, setCurrentPath] = useState('/')
  const [previewFile, setPreviewFile] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchMode, setSearchMode] = useState('name') // 'name', 'semantic', 'deep'
  
  const normalizedSearch = search.trim().toLowerCase()

  // Fetch files based on current path
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fileService.getFiles(currentPath)
      setItems(data)
    } catch (err) {
      console.error('Error fetching files:', err)
      setError('Failed to load files. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  const fetchRecentFiles = useCallback(async () => {
    try {
      const data = await fileService.getRecentFiles(6)
      setRecentFiles(data)
    } catch (err) {
      console.error('Error fetching recent files:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (currentPath === '/') {
      fetchRecentFiles()
    }
  }, [fetchData, fetchRecentFiles, currentPath])

  // Handle folder navigation
  const handleFolderClick = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`
    setCurrentPath(newPath)
  }

  const handleGoBack = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}`
    setCurrentPath(newPath)
  }

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentPath('/')
      return
    }
    const parts = currentPath.split('/').filter(Boolean)
    const newPath = '/' + parts.slice(0, index + 1).join('/')
    setCurrentPath(newPath)
  }

  // Handle search (could be optimized with debounce)
  useEffect(() => {
    if (!normalizedSearch) {
      fetchData()
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        // Switch between modes: 'name', 'semantic', 'deep'
        const results = await fileService.searchFiles(normalizedSearch, searchMode)
        // results represent the files found by search
        setItems(results.map(r => r.file || r))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [normalizedSearch, searchMode, fetchData])

  // Handle upload from modal
  const handleUpload = useCallback(async (mode, file, name, description, manualPath) => {
    let result
    if (mode === 'folder') {
      result = await fileService.createFolder(name, manualPath || currentPath, description)
    } else if (mode === 'smart') {
      result = await fileService.smartUpload(file, name, description)
    } else {
      // Use the provided manualPath or default to currentPath
      result = await fileService.uploadFile(file, name, manualPath || currentPath, description)
    }
    
    // Refresh data after upload/creation
    fetchData()
    if (currentPath === '/') fetchRecentFiles()
    
    return result
  }, [currentPath, fetchData, fetchRecentFiles])

  const folders = useMemo(() => items.filter(i => i.file_type === 'dir'), [items])
  const files = useMemo(() => items.filter(i => i.file_type === 'file'), [items])

  const userChar = currentUser?.username?.trim()?.charAt(0).toUpperCase() || 'U'

  // Breadcrumb parts
  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div className="home-page">
      <ParticlesBackground />
      <SideBar isAuthenticated onNewClick={() => setShowUpload(true)} />

      <main className="home-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          searchMode={searchMode}
          onModeChange={setSearchMode}
          onViewProfile={() => navigate('/profile')}
          onSignOut={onSignOut}
          profileLabel={`${currentUser?.username || 'User'} profile`}
        />

        <section className="home-shell home-shell--main" aria-label="Zenith Home">
          <header className="home-shell__header">
            <div className="breadcrumb-nav">
              <button 
                className={`breadcrumb-item ${currentPath === '/' ? 'is-active' : ''}`}
                onClick={() => handleBreadcrumbClick(-1)}
              >
                Zenith Home
              </button>
              {pathParts.map((part, index) => (
                <span key={index} className="breadcrumb-wrapper">
                  <span className="breadcrumb-separator">/</span>
                  <button 
                    className={`breadcrumb-item ${index === pathParts.length - 1 ? 'is-active' : ''}`}
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
            {currentPath !== '/' && (
              <button className="back-btn" onClick={handleGoBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
            )}
          </header>

          {loading && <p className="status-msg">Loading your workspace...</p>}
          {error && <p className="status-msg error">{error}</p>}
          
          {!loading && !error && items.length === 0 && (
            <p className="status-msg">No files found here. Try uploading something!</p>
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
                    onClick={() => handleFolderClick(folder.name)}
                  />
                ))}
              </div>
            </section>
          )}

          {!loading && files.length > 0 && (
            <section className="home-section" aria-label="Files">
              <div className="home-section__header">
                <h2>Files</h2>
                <div className="view-toggle" aria-label="View mode">
                  <button 
                    type="button" 
                    className={viewMode === 'list' ? 'is-active' : ''} 
                    aria-label="List view"
                    onClick={() => setViewMode('list')}
                  >
                    ≡
                  </button>
                  <button 
                    type="button" 
                    className={viewMode === 'grid' ? 'is-active' : ''} 
                    aria-label="Grid view"
                    onClick={() => setViewMode('grid')}
                  >
                    ⊞
                  </button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
                {files.map((file) => (
                  viewMode === 'grid' ? (
                    <FileCard
                      key={file.id}
                      name={file.name}
                      type={file.mime_type || file.format || 'file'}
                      activity={file.updated_at ? `Modified · ${new Date(file.updated_at).toLocaleDateString()}` : 'New file'}
                      userChar={userChar}
                      onClick={() => setPreviewFile(file)}
                    />
                  ) : (
                    <FileRow
                      key={file.id}
                      name={file.name}
                      type={file.mime_type || file.format || 'file'}
                      activity={file.updated_at ? `Modified · ${new Date(file.updated_at).toLocaleDateString()}` : 'New file'}
                      userChar={userChar}
                      onClick={() => setPreviewFile(file)}
                    />
                  )
                ))}
              </div>
            </section>
          )}
        </section>

        {/* Recents Section — Now in a separate shell below */}
        {currentPath === '/' && !normalizedSearch && recentFiles.length > 0 && (
          <section className="home-shell home-shell--recents" aria-label="Recent Files">
            <div className="home-section__header">
              <h2>Recent Files</h2>
            </div>
            <div className="recent-grid">
              {recentFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="recent-card"
                  onClick={() => setPreviewFile(file)}
                >
                  <div className="recent-card__icon">
                    <SideBarIcon type={file.mime_type?.includes('image') ? 'image' : 'file'} />
                  </div>
                  <div className="recent-card__info">
                    <span className="recent-card__name">{file.name}</span>
                    <span className="recent-card__path">{file.path}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          currentPath={currentPath}
          onUpload={handleUpload}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>


  )
}


export default HomePage

