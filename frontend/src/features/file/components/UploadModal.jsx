import { useState, useRef, useCallback } from 'react'
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
  const [tab, setTab] = useState('file') // 'file' | 'text'
  const [file, setFile] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [manualPath, setManualPath] = useState(currentPath)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      if (!name) setName(dropped.name)
    }
  }, [name])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      if (!name) setName(selected.name)
    }
  }

  const getUploadFile = () => {
    if (tab === 'file') return file
    if (!textContent.trim()) return null
    const blob = new Blob([textContent], { type: 'text/plain' })
    return new File([blob], name || 'note.txt', { type: 'text/plain' })
  }

  const handleUpload = async (mode) => {
    const uploadFile = getUploadFile()
    if (!uploadFile) {
      setError(tab === 'file' ? 'Please select a file' : 'Please enter some text')
      return
    }
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const res = await onUpload(mode, uploadFile, name.trim(), description.trim(), manualPath)
      setResult(res)
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
            onClick={() => setTab('file')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload File
          </button>
          <button
            role="tab"
            aria-selected={tab === 'text'}
            className={tab === 'text' ? 'is-active' : ''}
            onClick={() => setTab('text')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Text Note
          </button>
        </div>

        <div className="upload-modal__body">
          {tab === 'file' ? (
            <div
              className={`upload-dropzone${isDragOver ? ' is-dragover' : ''}${file ? ' has-file' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} hidden />
              {file ? (
                <div className="upload-dropzone__selected">
                  <span className="upload-dropzone__file-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff857a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                  </span>
                  <div className="upload-dropzone__file-info">
                    <strong>{file.name}</strong>
                    <span>{formatSize(file.size)}</span>
                  </div>
                  <button className="upload-dropzone__clear" onClick={(e) => { e.stopPropagation(); setFile(null) }}>✕</button>
                </div>
              ) : (
                <>
                  <div className="upload-dropzone__icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M12 18V8"></path>
                      <path d="m9 11 3-3 3 3"></path>
                    </svg>
                  </div>
                  <p className="upload-dropzone__label">
                    Drop file or <strong>browse</strong>
                  </p>
                </>
              )}
            </div>
          ) : (
            <textarea
              className="upload-textarea"
              placeholder="What's on your mind?..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
            />
          )}

          <div className="upload-modal__fields">
            <label>
              <span>File Name</span>
              <input type="text" placeholder="e.g. meeting_notes" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Description</span>
              <input type="text" placeholder="Optional context..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          <details className="upload-modal__manual-section">
            <summary>Advanced Path Settings</summary>
            <input type="text" placeholder="Destination path (e.g. /work/2026)" value={manualPath} onChange={(e) => setManualPath(e.target.value)} />
          </details>

          {error && <p className="upload-modal__error">{error}</p>}
          
          {result && (
            <div className="upload-modal__success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#72fba1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginTop: '2px'}}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <div>
                <strong>{result.name}</strong> successfully synced
                {result.suggested_path && (
                  <span className="upload-modal__ai-path">
                     Organized to <code>{result.suggested_path}</code>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="upload-modal__actions">
          <button className="upload-btn upload-btn--smart" onClick={() => handleUpload('smart')} disabled={uploading}>
            {uploading ? <div className="upload-btn__spinner" /> : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                <path d="M12 12L2.5 4.5"></path>
                <path d="M12 12V22a10 10 0 0 0 10-10H12z"></path>
              </svg>
            )}
            {uploading ? 'Processing...' : 'Smart Auto-Sync'}
          </button>
          <button className="upload-btn upload-btn--manual" onClick={() => handleUpload('manual')} disabled={uploading}>
            Manual Place
          </button>
        </footer>
      </div>
    </div>
  )
}


export default UploadModal
