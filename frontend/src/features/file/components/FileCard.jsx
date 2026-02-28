import './FileCard.css'

/**
 * FileCard component representing a file in the file system.
 */
function FileCard({ name, type, activity, userChar = 'U', onClick, onMenuClick }) {
  // Map backend mime types or formats to frontend types for styling
  const getTypeClass = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('pdf')) return 'pdf';
    if (typeLower.includes('sheet') || typeLower.includes('xls')) return 'sheet';
    if (typeLower.includes('slides') || typeLower.includes('ppt')) return 'slides';
    if (typeLower.includes('doc') || typeLower.includes('txt')) return 'doc';
    if (typeLower.includes('video') || typeLower.includes('mp4')) return 'video';
    if (typeLower.includes('image') || typeLower.includes('jpg') || typeLower.includes('png')) return 'image';
    return 'generic';
  };

  const typeClass = getTypeClass(type);

  return (
    <article className="file-card" onClick={onClick} role="button" tabIndex={0}>
      <header className="file-card__header">
        <span className={`file-card__type file-card__type--${typeClass}`}>
          {typeClass.toUpperCase()}
        </span>
        <h3>{name}</h3>
        <button 
          className="card-menu" 
          type="button" 
          aria-label={`Open ${name} options`}
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.();
          }}
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </header>
      
      <div className={`file-card__preview file-card__preview--${typeClass}`} />
      
      <footer className="file-card__meta">
        <span className="file-card__avatar" aria-hidden="true">
          {userChar}
        </span>
        <span>{activity}</span>
      </footer>
    </article>
  )
}

export default FileCard
