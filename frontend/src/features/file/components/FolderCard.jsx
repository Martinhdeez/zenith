import './FolderCard.css'

/**
 * FolderCard component representing a directory in the file system.
 */
function FolderCard({ title, subtitle, onClick, onMenuClick }) {
  return (
    <article className="folder-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="folder-card__left">
        <span className="folder-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.3l1.6 1.7h7.1A2.5 2.5 0 0 1 21 9.2v7.3a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5V7.5Z" />
          </svg>
        </span>
        <div className="folder-card__info">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <button 
        className="card-menu" 
        type="button" 
        aria-label={`Open ${title} options`}
        onClick={(e) => {
          e.stopPropagation();
          onMenuClick?.();
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
    </article>
  )
}

export default FolderCard
