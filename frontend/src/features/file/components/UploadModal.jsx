import { useState, useRef, useCallback } from 'react'
import { fileService } from '../services/fileService'
import './UploadModal.css'

/**
 * UploadModal — create or upload a file.
 *
 * Two input modes:
 *   1. Drag/select a file from disk
 *   2. Paste text (creates a .txt file)
 *
 * Two upload modes:
 *   - Smart Upload: AI auto-organizes the file into the best folder
 *   - Manual Upload: user picks the destination path
 */
function UploadModal({ currentPath = '/', onUpload, onClose }) {
  const [tab, setTab] = useState('file') // 'file' | 'text' | 'folder'
  const [files, setFiles] = useState([]) // Array of File objects
  const [textContent, setTextContent] = useState('')
  const [name, setName] = useState('') // Primary name for text notes or folders
  const [description, setDescription] = useState('')
  const [manualPath, setManualPath] = useState(currentPath)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [smartState, setSmartState] = useState('initial') // 'initial' | 'suggesting' | 'confirming'
  const [suggestedPath, setSuggestedPath] = useState('')
  const [aiReason, setAiReason] = useState('')
  const fileInputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async (mode) => {
    // Validation
    if (tab === 'file' && files.length === 0) {
      setError('Please select at least one file')
      return
    }
    if (tab === 'text' && !textContent.trim()) {
      setError('Please enter some text')
      return
    }
    if (tab !== 'file' && !name.trim()) {
      setError('Please enter a name')
      return
    }

    // Special case for Smart Suggestion (only for first file or text note)
    if (mode === 'smart' && smartState === 'initial') {
      try {
        setSmartState('suggesting')
        setError(null)
        const firstFile = tab === 'file' ? files[0] : null
        const refName = tab === 'file' ? firstFile.name : name
        const refMime = tab === 'file' ? firstFile.type : 'text/plain'
        
        const suggestion = await fileService.suggestPath(refName, refMime)
        setSuggestedPath(suggestion.suggested_path)
        setAiReason(suggestion.reason)
        setSmartState('confirming')
      } catch (err) {
        console.error('Path suggestion failed:', err)
        setError('Could not get AI suggestion. You can still upload manually.')
        setSmartState('initial')
      }
      return
    }

    setUploading(true)
    setError(null)

    try {
      if (tab === 'folder') {
        setProgress({ current: 1, total: 1 })
        await onUpload('folder', null, name.trim(), description.trim(), manualPath)
      } 
      else if (tab === 'text') {
        setProgress({ current: 1, total: 1 })
        const blob = new Blob([textContent], { type: 'text/plain' })
        const textFile = new File([blob], name.endsWith('.txt') ? name : `${name}.txt`, { type: 'text/plain' })
        const targetPath = mode === 'pending' ? '/Pending' : 
                          (smartState === 'confirming' ? suggestedPath : manualPath)
        await onUpload('manual', textFile, name.trim(), description.trim(), targetPath)
      }
      else {
        // Multi-file upload
        if (mode === 'pending') {
          // Ensure /Pending folder exists
          try {
            const rootFiles = await fileService.getFiles('/');
            const hasPending = rootFiles.some(f => f.name.toLowerCase() === 'pending' && f.file_type === 'dir');
            if (!hasPending) {
              await fileService.createFolder('Pending', '/', 'Files pending organization');
            }
          } catch (e) {
            console.warn('Could not verify/create Pending folder:', e);
          }
        }

        const total = files.length
        setProgress({ current: 0, total })
        
        for (let i = 0; i < total; i++) {
          setProgress(p => ({ ...p, current: i + 1 }))
          const f = files[i]
          
          let targetPath = manualPath
          let uploadMode = 'manual'

          if (mode === 'pending') {
            targetPath = '/Pending'
          } else if (mode === 'smart') {
            if (smartState === 'confirming' && i === 0) {
              targetPath = suggestedPath
            } else {
              // For subsequent files in smart mode, we use pure smart upload
              // which lets the backend decide each one's path
              uploadMode = 'smart'
            }
          }

          await onUpload(uploadMode, f, f.name, description.trim(), targetPath)
        }
      }
      
      onClose?.()
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="upload-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <header className="upload-modal__header">
          <h2>New Content</h2>
          <button className="upload-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div className="upload-modal__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'file'}
            className={tab === 'file' ? 'is-active' : ''}
            onClick={() => { setTab('file'); setSmartState('initial'); }}
            disabled={uploading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload Files
          </button>
          <button
            role="tab"
            aria-selected={tab === 'text'}
            className={tab === 'text' ? 'is-active' : ''}
            onClick={() => { setTab('text'); setSmartState('initial'); }}
            disabled={uploading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Text Note
          </button>
          <button
            role="tab"
            aria-selected={tab === 'folder'}
            className={tab === 'folder' ? 'is-active' : ''}
            onClick={() => { setTab('folder'); setSmartState('initial'); }}
            disabled={uploading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            New Folder
          </button>
        </div>

        <div className="upload-modal__body">
          {tab === 'file' ? (
            <div className="upload-file-section">
              <div
                className={`upload-dropzone${isDragOver ? ' is-dragover' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} hidden />
                <div className="upload-dropzone__icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M12 18V8"></path>
                    <path d="m9 11 3-3 3 3"></path>
                  </svg>
                </div>
                <p className="upload-dropzone__label">
                  Drop files or <strong>browse</strong>
                </p>
              </div>

              {files.length > 0 && (
                <div className="upload-file-list">
                   {files.map((f, i) => (
                     <div key={i} className="upload-file-item">
                        <div className="upload-file-item__info">
                          <span className="upload-file-item__name">{f.name}</span>
                          <span className="upload-file-item__size">{formatSize(f.size)}</span>
                        </div>
                        <button className="upload-file-item__remove" onClick={() => removeFile(i)}>✕</button>
                     </div>
                   ))}
                </div>
              )}
            </div>
          ) : tab === 'text' ? (
            <>
              <textarea
                className="upload-textarea"
                placeholder="What's on your mind?..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
              />
              <div className="upload-modal__fields">
                <label>
                  <span>Note Name</span>
                  <input type="text" placeholder="e.g. meeting_notes" value={name} onChange={(e) => setName(e.target.value)} disabled={smartState !== 'initial'} />
                </label>
              </div>
            </>
          ) : (
            <div className="upload-folder-view">
              <div className="upload-folder-view__icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff857a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="upload-modal__fields" style={{width: '100%'}}>
               <label style={{width: '100%'}}>
                 <span>Folder Name</span>
                 <input type="text" placeholder="e.g. Finance 2026" value={name} onChange={(e) => setName(e.target.value)} />
               </label>
              </div>
            </div>
          )}

          <div className="upload-modal__fields">
            <label style={{gridColumn: 'span 2'}}>
              <span>Description (Optional)</span>
              <input type="text" placeholder="Context for AI organization..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={smartState !== 'initial'} />
            </label>
          </div>

          {smartState === 'confirming' && (
            <div className="upload-modal__confirmation">
              <div className="confirmation-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#72fba1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h3>AI Recommendation Ready</h3>
              </div>
              <p className="ai-reason">"{aiReason}"</p>
              <label>
                <span>Suggested Path (You can edit this)</span>
                <input 
                  type="text" 
                  value={suggestedPath} 
                  onChange={(e) => setSuggestedPath(e.target.value)} 
                  className="path-input-highlight"
                />
              </label>
            </div>
          )}

          {smartState === 'initial' && tab !== 'folder' && (
            <details className="upload-modal__manual-section">
              <summary>Advanced Path Settings</summary>
              <input type="text" placeholder="Destination path (e.g. /work/2026)" value={manualPath} onChange={(e) => setManualPath(e.target.value)} />
            </details>
          )}

          {error && <p className="upload-modal__error">{error}</p>}
          
          {uploading && (
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }} 
                />
              </div>
              <span className="upload-progress-text">
                Syncing {progress.current} of {progress.total}...
              </span>
            </div>
          )}
        </div>

        <footer className="upload-modal__actions">
          {tab === 'folder' ? (
             <button className="upload-btn upload-btn--smart" style={{width: '100%', gridColumn: 'span 2'}} onClick={() => handleUpload('manual')} disabled={uploading}>
               {uploading ? <div className="upload-btn__spinner" /> : 'Create Folder'}
            </button>
          ) : smartState === 'confirming' ? (
            <>
              <button className="upload-btn upload-btn--smart" onClick={() => handleUpload('smart')} disabled={uploading}>
                Confirm & Sync All
              </button>
              <button className="upload-btn upload-btn--manual" onClick={() => setSmartState('initial')} disabled={uploading}>
                Back
              </button>
            </>
          ) : (
            <>
              <button className="upload-btn upload-btn--smart" onClick={() => handleUpload('smart')} disabled={uploading || smartState === 'suggesting'}>
                {smartState === 'suggesting' ? <div className="upload-btn__spinner" /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                    <path d="M12 12L2.5 4.5"></path>
                  </svg>
                )}
                {smartState === 'suggesting' ? 'Analyzing...' : 'Smart Auto-Sync'}
              </button>
              <div style={{display: 'flex', gap: '8px', justifyContent: 'space-between'}}>
                <button className="upload-btn upload-btn--manual" style={{flex: 1, padding: '16px 12px'}} onClick={() => handleUpload('manual')} disabled={uploading || smartState === 'suggesting'}>
                  Manual Place
                </button>
                <button className="upload-btn upload-btn--danger" style={{flex: 1, padding: '16px 12px'}} onClick={() => handleUpload('pending')} disabled={uploading || smartState === 'suggesting'}>
                  Save to Pending
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

export default UploadModal
