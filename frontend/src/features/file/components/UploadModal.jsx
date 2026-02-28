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
    // For text mode, create a Blob as a .txt file
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
    <div className="upload-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Upload file">
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="upload-modal__header">
          <h2>Create new</h2>
          <button className="upload-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        </header>

        {/* Tab switcher */}
        <div className="upload-modal__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'file'}
            className={tab === 'file' ? 'is-active' : ''}
            onClick={() => setTab('file')}
          >
            <span className="tab-icon">📁</span> Upload File
          </button>
          <button
            role="tab"
            aria-selected={tab === 'text'}
            className={tab === 'text' ? 'is-active' : ''}
            onClick={() => setTab('text')}
          >
            <span className="tab-icon">📝</span> Paste Text
          </button>
        </div>

        {/* Content area */}
        <div className="upload-modal__body">
          {tab === 'file' ? (
            <div
              className={`upload-dropzone${isDragOver ? ' is-dragover' : ''}${file ? ' has-file' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                hidden
              />
              {file ? (
                <div className="upload-dropzone__selected">
                  <span className="upload-dropzone__file-icon">📄</span>
                  <div className="upload-dropzone__file-info">
                    <strong>{file.name}</strong>
                    <span>{formatSize(file.size)}</span>
                  </div>
                  <button
                    className="upload-dropzone__clear"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="upload-dropzone__icon">⬆</span>
                  <p className="upload-dropzone__label">
                    Drag & drop a file here, or <strong>click to browse</strong>
                  </p>
                </>
              )}
            </div>
          ) : (
            <textarea
              className="upload-textarea"
              placeholder="Paste or type your text here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
            />
          )}

          {/* Name & description */}
          <div className="upload-modal__fields">
            <label>
              <span>Name</span>
              <input
                type="text"
                placeholder={tab === 'text' ? 'my_note.txt' : 'File name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              <span>Description <small>(optional)</small></span>
              <input
                type="text"
                placeholder="Brief description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {/* Manual path input */}
          <details className="upload-modal__manual-section">
            <summary>Manual path (for manual upload)</summary>
            <label>
              <input
                type="text"
                placeholder="/"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
              />
            </label>
          </details>

          {/* Error / Success */}
          {error && <p className="upload-modal__error">{error}</p>}
          {result && (
            <div className="upload-modal__success">
              <span>✅</span>
              <div>
                <strong>{result.name}</strong> uploaded
                {result.suggested_path && (
                  <span className="upload-modal__ai-path">
                    → AI placed in <code>{result.suggested_path}</code>
                    {result.created_new_folder && <em> (new folder)</em>}
                  </span>
                )}
                {result.ai_reason && (
                  <p className="upload-modal__ai-reason">{result.ai_reason}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <footer className="upload-modal__actions">
          <button
            className="upload-btn upload-btn--smart"
            onClick={() => handleUpload('smart')}
            disabled={uploading}
          >
            {uploading ? (
              <span className="upload-btn__spinner" />
            ) : (
              <span className="upload-btn__icon">🧠</span>
            )}
            {uploading ? 'AI is organizing...' : 'Smart Upload'}
          </button>
          <button
            className="upload-btn upload-btn--manual"
            onClick={() => handleUpload('manual')}
            disabled={uploading}
          >
            Manual Upload
          </button>
        </footer>
      </div>
    </div>
  )
}

export default UploadModal
