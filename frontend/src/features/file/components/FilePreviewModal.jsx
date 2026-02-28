import { useEffect, useState, useCallback } from 'react'
import { fileService } from '../services/fileService'
import ReactMarkdown from 'react-markdown'
import StudyPanel from './StudyPanel.jsx'
import './FilePreviewModal.css'

/**
 * FilePreviewModal — A Google Drive-style preview modal with AI Study Panel.
 * Supports images, text files, and generic downloads.
 */
function FilePreviewModal({ file, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showStudyPanel, setShowStudyPanel] = useState(false)
  const [isStudyFullscreen, setIsStudyFullscreen] = useState(false)

  const isImage = file.mime_type?.startsWith('image/') || 
                ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.format?.toLowerCase());
  
  const isVideo = !isImage && (file.mime_type?.startsWith('video/') ||
                (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(file.format?.toLowerCase()) && file.format?.toLowerCase() !== 'ogg'));
  
  const isAudio = !isImage && !isVideo && (file.mime_type?.startsWith('audio/') ||
                ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(file.format?.toLowerCase()));
  
  // Universal Text Fallback: If it's not a known media type, treat it as text-capable for preview
  // Note: PDF is now excluded from specialized preview and handled as text or generic download
  const isKnownMedia = isImage || isVideo || isAudio;
  const isText = !isKnownMedia;
  
  const isMarkdown = file.mime_type === 'text/markdown' || file.format?.toLowerCase() === 'md';

  const canStudy = isText || isAudio || isVideo;

  const fetchContent = useCallback(async () => {
    if (!isText) return;
    try {
      setLoading(true);
      setError(null);
      setContent(null);
      
      const res = await fileService.downloadFile(file.id);
      
      const raw = res?.content || '';
      let result = raw;
      const b64Candidate = typeof raw === 'string' 
        ? raw.replace(/^data:.*?;base64,/, '').replace(/\s/g, '') : '';
        
      const isProbablyBase64 = b64Candidate.length > 0 && 
                               /^[A-Za-z0-9+/]*={0,2}$/.test(b64Candidate) &&
                               (b64Candidate.length % 4 === 0);

      if (isProbablyBase64) {
        try {
          const binary = window.atob(b64Candidate);
          let looksBinary = false;
          for (let i = 0; i < Math.min(binary.length, 100); i++) {
            if (binary.charCodeAt(i) === 0) {
              looksBinary = true;
              break;
            }
          }

          if (looksBinary) {
            result = "[Binary content - preview not available as text]";
          } else {
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            result = new TextDecoder('utf-8').decode(bytes);
          }
        } catch (err) {
          result = "[Content could not be decoded]";
        }
      }
      setContent(result);
    } catch (err) {
      console.error('FilePreview error:', err);
      setError('Could not load file preview.');
    } finally {
      setLoading(false);
    }
  }, [file.id, isText]);

  useEffect(() => {
    fetchContent();
  }, [file.id, fetchContent]);

  if (!file) return null;

  return (
    <div className="preview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`preview-modal ${showStudyPanel ? 'preview-modal--with-panel' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="preview-header">
          <div className="preview-header__info">
            <span className="preview-icon">
              {isImage ? '🖼️' : isVideo ? '🎬' : isAudio ? '🎵' : isText ? '📄' : '📦'}
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
          {!isStudyFullscreen && (
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
                    <div className={`preview-content preview-content--text ${isMarkdown ? 'markdown-view' : ''}`}>
                      {!isMarkdown && !file.mime_type?.startsWith('text/') && 
                       !['json', 'js', 'py', 'ts', 'jsx', 'tsx', 'css', 'html', 'sql', 'sh', 'env', 'log'].includes(file.format?.toLowerCase()) && (
                        <div className="preview-content-label">Partial Text Preview</div>
                      )}
                      {isMarkdown ? (
                        <div className="rendered-markdown">
                          <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                      ) : (
                        <pre>{content}</pre>
                      )}
                    </div>
                  )}

                  {isVideo && (
                    <div className="preview-content preview-content--video">
                      <div style={{ width: '100%' }}>
                        <video
                          controls
                          autoPlay
                          playsInline
                          preload="metadata"
                          controlsList="nodownload"
                          style={{ width: '100%', borderRadius: '20px', boxShadow: '0 40px 100px rgba(0,0,0,.8)', border: '1px solid rgba(255,255,255,.1)', background: '#000', outline: 'none' }}
                        >
                          <source src={file.url} type={file.mime_type || 'video/mp4'} />
                          Your browser does not support video playback.
                        </video>
                        {file.transcription && (
                          <div className="audio-transcription" style={{ marginTop: '20px' }}>
                            <h5>Transcription</h5>
                            <p>{file.transcription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isAudio && (
                    <div className="preview-content preview-content--audio">
                      <div className="audio-player-card">
                        <div className="audio-player-icon">🎵</div>
                        <h4 className="audio-player-title">{file.name}</h4>
                        <p className="audio-player-meta">{file.mime_type || 'Audio'} · {file.size ? (file.size / 1024).toFixed(1) + ' KB' : ''}</p>
                        <audio
                          controls
                          autoPlay
                          preload="metadata"
                          controlsList="nodownload"
                          style={{ width: '100%', marginTop: '16px' }}
                        >
                          <source src={file.url} type={file.mime_type || 'audio/mpeg'} />
                          Your browser does not support audio playback.
                        </audio>
                        {file.transcription && (
                          <div className="audio-transcription">
                            <h5>Transcription</h5>
                            <p>{file.transcription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isImage && !isText && !isPdf && !isVideo && !isAudio && (
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
          )}

          {showStudyPanel && (
            <StudyPanel 
              file={file} 
              onClose={() => {
                setShowStudyPanel(false)
                setIsStudyFullscreen(false)
              }} 
              onFullscreenToggle={setIsStudyFullscreen}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default FilePreviewModal
