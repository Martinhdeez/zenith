import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import SideBar from '../../shared/components/SideBar.jsx'
import DashboardToolbar from '../../shared/components/DashboardToolbar.jsx'
import FolderCard from '../../file/components/FolderCard.jsx'
import FileCard from '../../file/components/FileCard.jsx'
import FileRow from '../../file/components/FileRow.jsx'
import UploadModal from '../../file/components/UploadModal.jsx'
import FilePreviewModal from '../../file/components/FilePreviewModal.jsx'
import ParticlesBackground from '../../landing/components/particlesBackground/ParticlesBackground.jsx'
import { fileService } from '../../file/services/fileService'
import { chatService } from '../../assistant/services/chatService'
import { SideBarIcon } from '../../shared/components/SideBar.jsx'
import relojIcon from '../../../assets/icons/reloj.svg'
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
  const [currentFolder, setCurrentFolder] = useState(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [activeFilters, setActiveFilters] = useState([]) // filter keys: 'document', 'image', 'video', 'audio', 'folder'
  const [searchMode, setSearchMode] = useState('name') // 'name', 'semantic'
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [showStudySumupModal, setShowStudySumupModal] = useState(false)
  
  const normalizedSearch = search.trim().toLowerCase()

  // Handle URL query parameters to make the URL the source of truth for the folder path
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlPath = params.get('path') || '/'
    if (urlPath !== currentPath) {
      setCurrentPath(urlPath)
    }
  }, [location.search, currentPath])

  // Fetch files based on current path and active filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // If a single media/document category filter is active, let the backend handle it recursively
      const backendCategory = activeFilters.length === 1 && activeFilters[0] !== 'folder'
        ? activeFilters[0]
        : null
      const data = await fileService.getFiles(currentPath, 0, 100, backendCategory)
      setItems(data)
    } catch (err) {
      console.error('Error fetching files:', err)
      setError('Failed to load files. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentPath, activeFilters])

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
    setIsEditingDescription(false)
    if (currentPath === '/') {
      fetchRecentFiles()
      setCurrentFolder(null)
    } else {
      const fetchFolderInfo = async () => {
        try {
          const data = await fileService.getFolderMetadata(currentPath)
          setCurrentFolder(data || null)
          // Pre-fill the description value so the input is ready
          setDescriptionValue(data?.description || '')
        } catch (err) {
          console.error('Error fetching folder metadata:', err)
          setCurrentFolder(null)
          setDescriptionValue('')
        }
      }
      fetchFolderInfo()
    }
  }, [fetchData, fetchRecentFiles, currentPath])

  // Handle folder navigation via query parameters
  const handleFolderClick = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`
    navigate(`/home?path=${encodeURIComponent(newPath)}`)
  }

  const handleGoBack = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}`
    navigate(newPath === '/' ? '/home' : `/home?path=${encodeURIComponent(newPath)}`)
  }

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      navigate('/home')
      return
    }
    const parts = currentPath.split('/').filter(Boolean)
    const newPath = '/' + parts.slice(0, index + 1).join('/')
    navigate(`/home?path=${encodeURIComponent(newPath)}`)
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
        const results = await fileService.searchFiles(normalizedSearch, searchMode, 10, currentPath)
        setItems(results.map(r => r.file || r))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [normalizedSearch, searchMode, fetchData, currentPath])

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

  // Handle renaming a file or folder
  const handleRename = useCallback(async (fileId, newName) => {
    try {
      if (!newName || newName.trim() === '') return
      await fileService.updateFile(fileId, { name: newName.trim() })
      fetchData()
      if (currentPath === '/') fetchRecentFiles()
    } catch (err) {
      console.error('Rename error:', err)
      setError('Failed to rename item')
    }
  }, [currentPath, fetchData, fetchRecentFiles])

  // Handle deleting a file or folder
  const handleDelete = useCallback(async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return
    }
    try {
      setLoading(true)
      await fileService.deleteFile(fileId)
      fetchData()
      if (currentPath === '/') fetchRecentFiles()
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete item')
    } finally {
      setLoading(false)
    }
  }, [currentPath, fetchData, fetchRecentFiles])

  const handleDescriptionSubmit = async () => {
    if (!currentFolder || !isEditingDescription) return
    
    const newValue = descriptionValue.trim()
    const oldValue = (currentFolder.description || '').trim()
    
    setIsEditingDescription(false)
    
    if (newValue === oldValue) return
    
    try {
      await fileService.updateFile(currentFolder.id, { description: newValue })
      setCurrentFolder(prev => ({ ...prev, description: newValue }))
      // Sync the description value back to ensure consistency
      setDescriptionValue(newValue)
    } catch (err) {
      console.error('Update description error:', err)
      setError('Failed to update description')
      // Revert local state on error
      setDescriptionValue(oldValue)
    }
  }

  const handleDescriptionKeyDown = (e) => {
    // Save on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleDescriptionSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingDescription(false)
      setDescriptionValue(currentFolder?.description || '')
    }
  }

  const startEditingDescription = () => {
    // Ensure the input is pre-filled with the latest description
    setDescriptionValue(currentFolder?.description || '')
    setIsEditingDescription(true)
  }

  const handleGenerateStudySummary = async () => {
    if (!currentFolder) return
    try {
      setIsGeneratingSummary(true)
      // setShowStudySumupModal(false) // Removed as per instruction
      await chatService.generateFolderStudySummary(currentFolder.id)
      // Refresh the view so the newly created summary file appears
      fetchData()
      if (currentPath === '/') fetchRecentFiles()
      
      // Notify the user softly if you have a toast component, else we just refresh
      alert("Study Guide generated successfully! You can find it in the current folder.")
    } catch (err) {
      console.error('Failed to generate study summary:', err)
      alert("Error generating study guide.")
    } finally {
      setIsGeneratingSummary(false)
      setShowStudySumupModal(false) // Close modal here after attempt
    }
  }

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
      <SideBar isAuthenticated onNewClick={() => setShowUpload(true)} onSignOut={onSignOut} />

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

          {currentPath !== '/' && (
            <div className="folder-description-area" style={{ marginBottom: '24px' }}>
              {isEditingDescription ? (
                <textarea
                  className="folder-description-input"
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  onBlur={handleDescriptionSubmit}
                  onKeyDown={handleDescriptionKeyDown}
                  autoFocus
                  placeholder="Add a description for this folder..."
                />
              ) : (
                <div 
                  className="folder-description"
                  onDoubleClick={startEditingDescription}
                  title="Double click to edit description"
                >
                  {currentFolder?.description ? (
                    currentFolder.description
                  ) : (
                    <span className="folder-description__placeholder">Add a description for this folder...</span>
                  )}
                </div>
              )}

              {currentFolder?.summary && (
                <div className="folder-sumup-card" style={{ marginTop: '16px' }}>
                  <div className="folder-sumup-card__header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff857a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <h4>AI Folder Sum-up</h4>
                  </div>
                  <div className="folder-sumup-card__content">
                    <ReactMarkdown>{currentFolder.summary}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

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
                    onRename={(newName) => handleRename(folder.id, newName)}
                    onDelete={() => handleDelete(folder.id)}
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
                      file={file}
                      userChar={userChar}
                      onClick={() => setPreviewFile(file)}
                      onRename={(newName) => handleRename(file.id, newName)}
                      onDelete={() => handleDelete(file.id)}
                    />
                  ) : (
                    <FileRow
                      key={file.id}
                      name={file.name}
                      type={file.mime_type || file.format || 'file'}
                      activity={file.updated_at ? `Modified · ${new Date(file.updated_at).toLocaleDateString()}` : 'New file'}
                      userChar={userChar}
                      onClick={() => setPreviewFile(file)}
                      onRename={(newName) => handleRename(file.id, newName)}
                      onDelete={() => handleDelete(file.id)}
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
                    <img src={relojIcon} alt="" aria-hidden="true" />
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

      {/* Floating Action Button for Study Summary */}
        {currentPath !== '/' && currentFolder && (
          <>
            <button 
              className="fab-study-summary" 
              onClick={() => setShowStudySumupModal(true)}
              disabled={isGeneratingSummary}
              title="Generate Study Guide"
            >
              {isGeneratingSummary ? (
                <div className="fab-spinner"></div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              )}
              <span>{isGeneratingSummary ? 'Generating...' : 'Study Sumup'}</span>
            </button>

            {showStudySumupModal && (
              <div className="upload-overlay" onClick={() => setShowStudySumupModal(false)} role="dialog" aria-modal="true" style={{zIndex: 9999}}>
                <div className="upload-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px', padding: '32px', textAlign: 'center'}}>
                  <div style={{color: '#ff857a', marginBottom: '16px'}}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <h2 style={{margin: '0 0 8px', fontSize: '1.4rem', color: '#fff'}}>Generate Study Sumup?</h2>
                  <p style={{margin: '0 0 24px', color: 'var(--text-muted)', lineHeight: '1.5'}}>
                    This action will read all files inside <strong>{currentFolder?.name}</strong> and create a comprehensive markdown study guide. This might take a few moments.
                  </p>
                  <div style={{display: 'flex', gap: '12px'}}>
                    <button 
                      className="upload-btn upload-btn--manual" 
                      style={{flex: 1, padding: '12px'}} 
                      onClick={() => setShowStudySumupModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="upload-btn upload-btn--smart" 
                      style={{flex: 1, padding: '12px'}} 
                      onClick={handleGenerateStudySummary}
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
    </div>


  )
}


export default HomePage
