import { useState, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './PdfViewer.css'

// Standard worker setup for react-pdf
// Use the legacy build worker for better compatibility across environments
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`

/**
 * PdfViewer — A premium, high-fidelity PDF viewer with Zenith aesthetics.
 * Features:
 *  - Custom pagination (Page X of Y)
 *  - Zoom In / Out / Fit to Width
 *  - Responsive glassmorphism toolbar
 */
function PdfViewer({ url, fileName }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [isReady, setIsReady] = useState(false)

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setIsReady(true)
  }

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset
      return Math.min(Math.max(1, newPage), numPages)
    })
  }

  const zoom = (factor) => {
    setScale(prevScale => Math.min(Math.max(0.5, prevScale + factor), 3.0))
  }

  const resetZoom = () => setScale(1.0)

  return (
    <div className="pdf-viewer">
      {/* Premium Toolbar */}
      <div className="pdf-toolbar">
         <div className="pdf-toolbar__group">
           <button 
             className="pdf-btn" 
             onClick={() => changePage(-1)} 
             disabled={pageNumber <= 1}
             aria-label="Previous Page"
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="m15 18-6-6 6-6"/>
             </svg>
           </button>
           <span className="pdf-page-indicator">
             Page {pageNumber} of {numPages || '...'}
           </span>
           <button 
             className="pdf-btn" 
             onClick={() => changePage(1)} 
             disabled={pageNumber >= numPages}
             aria-label="Next Page"
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="m9 18 6-6-6-6"/>
             </svg>
           </button>
         </div>

         <div className="pdf-toolbar__divider" />

         <div className="pdf-toolbar__group">
           <button className="pdf-btn" onClick={() => zoom(-0.2)} aria-label="Zoom Out">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
             </svg>
           </button>
           <span className="pdf-zoom-indicator" onClick={resetZoom}>
             {Math.round(scale * 100)}%
           </span>
           <button className="pdf-btn" onClick={() => zoom(0.2)} aria-label="Zoom In">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
             </svg>
           </button>
         </div>
      </div>

      <div className="pdf-content">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => {
            console.error('PDF Load Error:', err)
            setIsReady(false)
          }}
          loading={
            <div className="pdf-loading">
              <div className="pdf-spinner" />
              <p>Rendering High-Fidelity Preview...</p>
            </div>
          }
          error={
            <div className="pdf-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '16px', opacity: 0.6}}>
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <p>We couldn't render this PDF preview.</p>
              <span style={{fontSize: '0.85rem', opacity: 0.7, marginTop: '8px', display: 'block'}}>
                The file might be corrupted or too large for in-browser rendering.
              </span>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderAnnotationLayer={true}
            renderTextLayer={true}
            className="pdf-page-container"
          />
        </Document>
      </div>
    </div>
  )
}

export default PdfViewer
