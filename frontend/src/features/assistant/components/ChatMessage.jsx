import ReactMarkdown from 'react-markdown'
import './ChatMessage.css'

function ChatMessage({ role, content, filesUsed }) {
  const isUser = role === 'user'

  return (
    <div className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--ai'}`}>
      <div className="chat-message__avatar">
        {isUser ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.93-4H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-3 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
          </svg>
        )}
      </div>

      <div className="chat-message__body">
        <span className="chat-message__role">{isUser ? 'You' : 'Zenith AI'}</span>
        <div className="chat-message__content">
          {isUser ? (
            <p>{content}</p>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </div>
        {!isUser && typeof filesUsed === 'number' && filesUsed > 0 && (
          <span className="chat-message__files-badge">
            📄 {filesUsed} file{filesUsed !== 1 ? 's' : ''} referenced
          </span>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
