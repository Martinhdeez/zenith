import { useState, useRef, useCallback } from 'react'
import { fileService } from '../services/fileService'
import './UploadModal.css'

/**
 * UploadModal — create or upload a file.
 *
 * Multi-phase features:
 *   1. Multi-file selection / Drag & Drop
 *   2. Bulk Smart Suggestions (PARA-based)
 *   3. Visualization of suggested paths per file
 *   4. Sequential Batch Uploads
 */
function UploadModal({ currentPath = '/', onUpload, onClose }) {
  const [tab, setTab] = useState('file') // 'file' | 'text' | 'folder'
  const [files, setFiles] = useState([]) // Array of { id: string, file: File, name: string, suggestedPath: string, reason: string, status: 'idle' | 'suggesting' | 'suggested' | 'uploading' | 'done' }
  const [textContent, setTextContent] = useState('')
  const [name, setName] = useState('') // Primary name for text notes or folders
  const [description, setDescription] = useState('')
  const [manualPath, setManualPath] = useState(currentPath)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [smartState, setSmartState] = useState('initial') // 'initial' | 'suggesting' | 'confirming'
  const fileInputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      suggestedPath: '',
      reason: '',
      status: 'idle'
    }))
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
    const selectedFiles = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name,
      suggestedPath: '',
      reason: '',
      status: 'idle'
    }))
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const updateFileStatus = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const fetchBulkSuggestions = async () => {
    setSmartState('suggesting')
    setError(null)
    
    try {
      const total = files.length
      setProgress({ current: 0, total })

      for (let i = 0; i < total; i++) {
        const fObj = files[i]
        if (fObj.status === 'suggested') continue;
        
        updateFileStatus(fObj.id, { status: 'suggesting' })
        setProgress(p => ({ ...p, current: i + 1 }))

        const suggestion = await fileService.suggestPath(fObj.name, fObj.file.type)
        updateFileStatus(fObj.id, { 
          suggestedPath: suggestion.suggested_path, 
          reason: suggestion.reason,
          status: 'suggested' 
        })
      }
      setSmartState('confirming')
    } catch (err) {
      console.error('Bulk suggestion failed:', err)
      setError('AI suggestion failed for some files. You can still upload manually.')
      setSmartState('initial')
    }
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

    // Phase 1: Smart Suggestions for Files
    if (mode === 'smart' && smartState === 'initial' && tab === 'file') {
      await fetchBulkSuggestions()
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
        
        let targetPath = manualPath
        if (mode === 'smart' || smartState === 'confirming') {
          const suggestion = await fileService.suggestPath(name, 'text/plain')
          targetPath = suggestion.suggested_path
        } else if (mode === 'pending') {
          targetPath = '/Pending'
        }
        
        await onUpload('manual', textFile, name.trim(), description.trim(), targetPath)
      }
      else {
        // Multi-file upload
        if (mode === 'pending') {
          try {
            const rootFiles = await fileService.getFiles('/');
            const hasPending = rootFiles.some(f => f.name.toLowerCase() === 'pending' && f.file_type === 'dir');
            if (!hasPending) await fileService.createFolder('Pending', '/', 'Files pending organization');
          } catch (e) { console.warn('Pending folder check failed', e); }
        }

        const total = files.length
        setProgress({ current: 0, total })
        
        for (let i = 0; i < total; i++) {
          setProgress(p => ({ ...p, current: i + 1 }))
          const fObj = files[i]
          updateFileStatus(fObj.id, { status: 'uploading' })
          
          let targetPath = manualPath
          let uploadMode = 'manual'

          if (mode === 'pending') {
            targetPath = '/Pending'
          } else if (smartState === 'confirming' || mode === 'smart') {
            targetPath = fObj.suggestedPath || manualPath
            if (!fObj.suggestedPath) uploadMode = 'smart'
          }

          await onUpload(uploadMode, fObj.file, fObj.name, description.trim(), targetPath)
          updateFileStatus(fObj.id, { status: 'done' })
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
            disabled={uploading || smartState === 'suggesting'}
          >
            Upload Files
          </button>
          <button
            role="tab"
            aria-selected={tab === 'text'}
            className={tab === 'text' ? 'is-active' : ''}
            onClick={() => { setTab('text'); setSmartState('initial'); }}
            disabled={uploading || smartState === 'suggesting'}
          >
            Text Note
          </button>
          <button
            role="tab"
            aria-selected={tab === 'folder'}
            className={tab === 'folder' ? 'is-active' : ''}
            onClick={() => { setTab('folder'); setSmartState('initial'); }}
            disabled={uploading || smartState === 'suggesting'}
          >
            New Folder
          </button>
        </div>

        <div className="upload-modal__body">
          {tab === 'file' ? (
            <div className={`upload-file-section ${files.length > 0 ? 'has-files' : ''}`}>
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
                   {files.map((fObj) => (
                     <div key={fObj.id} className={`upload-file-item status-${fObj.status}`}>
                        <div className="upload-file-item__info">
                          <span className="upload-file-item__name">{fObj.file.name}</span>
                          <div className="upload-file-item__meta">
                             <span className="upload-file-item__size">{formatSize(fObj.file.size)}</span>
                             {fObj.suggestedPath && (
                               <span className="upload-file-item__path-chip" title={fObj.reason}>
                                 AI: {fObj.suggestedPath}
                               </span>
                             )}
                             {fObj.status === 'suggesting' && <span className="upload-file-item__status-text">Analyzing...</span>}
                             {fObj.status === 'uploading' && <span className="upload-file-item__status-text">Syncing...</span>}
                             {fObj.status === 'done' && <span className="upload-file-item__status-text done">✓</span>}
                          </div>
                        </div>
                        {fObj.status === 'idle' && (
                          <button className="upload-file-item__remove" onClick={() => removeFile(fObj.id)}>✕</button>
                        )}
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
                  <input type="text" placeholder="e.g. meeting_notes" value={name} onChange={(e) => setName(e.target.value)} />
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
              <span>Description (Optional Context for AI)</span>
              <input type="text" placeholder="Context helps AI organize better..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          {(smartState === 'confirming' || smartState === 'suggesting') && (
            <div className={`upload-modal__confirmation ${smartState === 'suggesting' ? 'is-loading' : ''}`}>
              <div className="confirmation-header">
                <svg className={smartState === 'suggesting' ? 'spin' : ''} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#72fba1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {smartState === 'suggesting' ? (
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  ) : (
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  )}
                </svg>
                <h3>{smartState === 'suggesting' ? 'AI Analyzing Workspace...' : 'Bulk Suggestions Ready'}</h3>
              </div>
              <p className="ai-reason">
                {smartState === 'suggesting' 
                  ? 'I am analyzing your current file structure to find the best place for each item.' 
                  : 'Check the paths next to each file. I have found the most logical location for each one based on PARA.'}
              </p>
            </div>
          )}

          {smartState === 'initial' && tab !== 'folder' && (
            <details className="upload-modal__manual-section">
              <summary>Advanced Manual Placement</summary>
              <input type="text" placeholder="Destination path (e.g. /work/2026)" value={manualPath} onChange={(e) => setManualPath(e.target.value)} />
            </details>
          )}

          {error && <p className="upload-modal__error">{error}</p>}
          
          {(uploading || smartState === 'suggesting') && (
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }} 
                />
              </div>
              <span className="upload-progress-text">
                {smartState === 'suggesting' ? 'Analyzing' : 'Syncing'} {progress.current} of {progress.total}...
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
              <button className="upload-btn upload-btn--smart" onClick={() => handleUpload('confirm')} disabled={uploading}>
                Sync All to Recommended
              </button>
              <button className="upload-btn upload-btn--manual" onClick={() => setSmartState('initial')} disabled={uploading}>
                Reset
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
