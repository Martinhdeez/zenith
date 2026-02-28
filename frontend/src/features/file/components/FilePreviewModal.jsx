import { useEffect, useState, useCallback } from 'react'
import { fileService } from '../services/fileService'
import StudyPanel from './StudyPanel.jsx'
import './FilePreviewModal.css'

/**
 * FilePreviewModal — A Google Drive-style preview modal with AI Study Panel.
 * Supports images, text files, PDFs, and generic downloads.
 */
function FilePreviewModal({ file, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showStudyPanel, setShowStudyPanel] = useState(false)

  const isImage = file.mime_type?.startsWith('image/') || 
                ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.format?.toLowerCase());
  const isPdf = file.mime_type === 'application/pdf' || file.format?.toLowerCase() === 'pdf';
  
  const isText = (file.mime_type?.startsWith('text/') || 
               ['txt', 'md', 'json', 'js', 'py'].includes(file.format?.toLowerCase())) && !isPdf;

  const canStudy = isText || isPdf;

  const [pdfUrl, setPdfUrl] = useState(null);

  const fetchContent = useCallback(async () => {
    if (!isText && !isPdf) return;
    try {
      setLoading(true);
      setError(null);
      setContent(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      
      const res = await fileService.downloadFile(file.id);
      
      if (isPdf) {
        const b64 = res.content.replace(/^data:.*?;base64,/, '').replace(/\s/g, '');
        const binary = window.atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        return;
      }

      const raw = res?.content || '';
      let result = raw;
      const b64Candidate = typeof raw === 'string' 
        ? raw.replace(/^data:.*?;base64,/, '').replace(/\s/g, '')
        : '';
        
      const isProbablyBase64 = b64Candidate.length > 0 && 
                              /^[A-Za-z0-9+/]*={0,2}$/.test(b64Candidate) &&
                              (b64Candidate.length % 4 === 0);

      if (isProbablyBase64) {
        try {
          const binary = window.atob(b64Candidate);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          result = new TextDecoder('utf-8').decode(bytes);
        } catch (atobErr) {
          console.warn('Preview: atob failed despite check, using raw.', atobErr);
        }
      }
      
      setContent(result);
    } catch (err) {
      console.error('FilePreview error:', err);
      setError('Could not load file content preview.');
    } finally {
      setLoading(false);
    }
  }, [file.id, isText, isPdf, pdfUrl]);

  useEffect(() => {
    fetchContent();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [file.id]);

  if (!file) return null;

  return (
    <div className="preview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`preview-modal ${showStudyPanel ? 'preview-modal--with-panel' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="preview-header">
          <div className="preview-header__info">
            <span className="preview-icon">
              {isImage ? '🖼️' : isText ? '📄' : '📦'}
            </span>
            <div className="preview-titles">
              <h3>{file.name}</h3>
              <p>{file.mime_type || file.format || 'File'} · {file.size ? (file.size / 1024).toFixed(1) + ' KB' : '0 KB'}</p>
            </div>
          </div>
          <div className="preview-header__actions">
            {canStudy && (
              <button 
                className={`preview-study-btn ${showStudyPanel ? 'is-active' : ''}`}
                onClick={() => setShowStudyPanel(!showStudyPanel)}
                aria-label="Toggle AI Study Panel"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                AI Study
              </button>
            )}
             <a 
              href={file.url} 
              download={file.name} 
              className="preview-download-btn"
              target="_blank" 
              rel="noopener noreferrer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </a>
            <button className="preview-close" onClick={onClose} aria-label="Close">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div className="preview-layout">
          <main className="preview-body">
            {loading && (
              <div className="preview-status">
                <div className="preview-spinner" />
                <p>Loading content...</p>
              </div>
            )}

            {error && (
              <div className="preview-status error">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {isImage && (
                  <div className="preview-content preview-content--image">
                    <img src={file.url} alt={file.name} />
                  </div>
                )}

                {isText && content && (
                  <div className="preview-content preview-content--text">
                    <pre>{content}</pre>
                  </div>
                )}

                {isPdf && pdfUrl && (
                  <div className="preview-content preview-content--pdf">
                    <iframe 
                      src={pdfUrl} 
                      title={file.name}
                      width="100%" 
                      height="100%" 
                    />
                  </div>
                )}

                {!isImage && !isText && !isPdf && (
                  <div className="preview-content preview-content--generic">
                    <div className="generic-preview-icon">📦</div>
                    <p>Preview not available for this file type.</p>
                    <a href={file.url} className="upload-btn upload-btn--smart" target="_blank" rel="noopener noreferrer">
                      Open in new tab
                    </a>
                  </div>
                )}
              </>
            )}
          </main>

          {showStudyPanel && (
            <StudyPanel file={file} onClose={() => setShowStudyPanel(false)} />
          )}
        </div>
      </div>
    </div>
  )
}

export default FilePreviewModal
