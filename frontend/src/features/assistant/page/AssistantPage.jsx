import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SideBar from '../../shared/components/SideBar.jsx'
import ParticlesBackground from '../../landing/components/particlesBackground/ParticlesBackground.jsx'
import ChatMessage from '../components/ChatMessage.jsx'
import ChatInput from '../components/ChatInput.jsx'
import { chatService } from '../services/chatService.js'
import './AssistantPage.css'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "👋 Hey! I'm **Zenith AI**, your personal file assistant.\n\n" +
    "I have context on all of your files and can help you:\n" +
    "- 🔍 **Find files** by describing what you're looking for\n" +
    "- 📂 **Organize** your workspace more efficiently\n" +
    "- 📝 **Summarize** what's in a folder or topic\n\n" +
    "Just type your question below!",
}

function AssistantPage({ currentUser, onSignOut }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const scrollRef = useRef(null)

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await chatService.getHistory()
        if (data && data.messages && data.messages.length > 0) {
          // Keep the welcome message and append the loaded history
          const formattedHistory = data.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            filesUsed: msg.files_used || 0, // Fallback if not provided
          }))
          setMessages([WELCOME_MESSAGE, ...formattedHistory])
        }
      } catch (err) {
        console.error('Failed to load chat history:', err)
        // We just log the error and keep the welcome message
      } finally {
        setIsHistoryLoading(false)
      }
    }

    loadHistory()
  }, [])

  // Auto-scroll to bottom when messages change

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = useCallback(async (text) => {
    // Add user message
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Build history from previous messages (exclude the welcome message)
      const history = messages
        .filter((m) => m !== WELCOME_MESSAGE)
        .map((m) => ({ role: m.role, content: m.content }))

      const data = await chatService.sendMessage(text, history)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          filesUsed: data.files_used,
        },
      ])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ Sorry, something went wrong. Please try again in a moment.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  return (
    <div className="assistant-page">
      <ParticlesBackground />
      <SideBar isAuthenticated onNewClick={() => navigate('/home')} />

      <main className="assistant-page__main">
        {/* Header */}
        <header className="assistant-page__header">
          <div className="assistant-page__header-info">
            <span className="assistant-page__badge">AI ASSISTANT</span>
            <h1 className="assistant-page__title">Zenith AI</h1>
          </div>
          {isLoading && (
            <div className="assistant-page__status">
              <span className="assistant-page__status-dot" />
              Thinking...
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="assistant-page__messages" ref={scrollRef}>
          <div className="assistant-page__messages-inner">
            {isHistoryLoading ? (
              <div className="assistant-page__loading-history">
                <div className="spinner" />
                <p>Loading previous conversations...</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  filesUsed={msg.filesUsed}
                />
              ))
            )}

            {isLoading && (
              <div className="assistant-page__typing">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </main>
    </div>
  )
}

export default AssistantPage
