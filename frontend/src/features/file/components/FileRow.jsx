import './FileRow.css'

/**
 * FileRow component representing a file in list view.
 */
function FileRow({ name, type, activity, userChar = 'U', onClick, onMenuClick }) {
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
    <div className="file-row" onClick={onClick} role="button" tabIndex={0}>
      <div className="file-row__main">
        <span className={`file-row__type-icon file-row__type-icon--${typeClass}`}>
          {typeClass.substring(0, 1).toUpperCase()}
        </span>
        <span className="file-row__name">{name}</span>
      </div>
      
      <div className="file-row__meta">
        <span className="file-row__activity">{activity}</span>
        <div className="file-row__owner">
          <span className="file-row__avatar">{userChar}</span>
        </div>
        <button 
          className="row-menu" 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.();
          }}
        >
          ⋯
        </button>
      </div>
    </div>
  )
}

export default FileRow
