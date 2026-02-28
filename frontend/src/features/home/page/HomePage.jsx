import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [currentPath, setCurrentPath] = useState('/')
  const [previewFile, setPreviewFile] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [activeFilters, setActiveFilters] = useState([]) // filter keys: 'document', 'image', 'video', 'audio', 'folder'
  const [searchMode, setSearchMode] = useState('name') // 'name', 'semantic'
  
  const normalizedSearch = search.trim().toLowerCase()

  // Handle URL query parameters for direct path navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const targetPath = params.get('path')
    if (targetPath && targetPath.startsWith('/')) {
      setCurrentPath(targetPath)
      // Clean up the URL so back navigation doesn't get stuck
      navigate('/home', { replace: true })
    }
  }, [location.search, navigate])

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
        const results = await fileService.searchFiles(normalizedSearch, searchMode)
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

  // Helper: check if a file matches a given filter category
  const matchesFilter = (item, filterKey) => {
    const mime = (item.mime_type || '').toLowerCase()
    switch (filterKey) {
      case 'document': return (
        mime.startsWith('application/pdf') ||
        mime.startsWith('text/') ||
        mime.includes('word') || mime.includes('document') ||
        mime.includes('spreadsheet') || mime.includes('presentation') ||
        mime.includes('excel') || mime.includes('powerpoint')
      )
      case 'image': return mime.startsWith('image/')
      case 'video': return mime.startsWith('video/')
      case 'audio': return mime.startsWith('audio/')
      case 'folder': return item.file_type === 'dir'
      default: return true
    }
  }

  // Apply filters
  const filteredItems = useMemo(() => {
    if (activeFilters.length === 0) return items
    return items.filter((item) => activeFilters.some((f) => matchesFilter(item, f)))
  }, [items, activeFilters])

  const folders = useMemo(() => filteredItems.filter(i => i.file_type === 'dir'), [filteredItems])
  const files = useMemo(() => filteredItems.filter(i => i.file_type === 'file'), [filteredItems])

  const userChar = currentUser?.username?.trim()?.charAt(0).toUpperCase() || 'U'

  // Breadcrumb parts
  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div className="home-page">
      <ParticlesBackground />
      <SideBar isAuthenticated onNewClick={() => setShowUpload(true)} onViewProfile={() => navigate('/profile')} onSignOut={onSignOut} />

      <main className="home-page__content">
        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          searchMode={searchMode}
          onModeChange={setSearchMode}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
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

