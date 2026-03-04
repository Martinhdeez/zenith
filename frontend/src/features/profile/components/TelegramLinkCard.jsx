// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'react'
import './TelegramLinkCard.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

function TelegramLinkCard({ user, onUnlinked }) {
  const [copied, setCopied] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [error, setError] = useState(null)

  const isLinked = Boolean(user?.telegram_chat_id)

  const handleCopyToken = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // fallback: select the text in a temporary input
      const el = document.createElement('textarea')
      el.value = token
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  const handleUnlink = async () => {
    const token = localStorage.getItem('token')
    if (!token || unlinking) return
    try {
      setUnlinking(true)
      setError(null)
      const res = await fetch(`${API_BASE_URL}/users/me/telegram`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to unlink Telegram.')
      onUnlinked?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <section className="tg-card">
      <div className="tg-card__header">
        <span className="tg-card__icon">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.93 13.63l-2.98-.924c-.647-.203-.66-.647.136-.959l11.647-4.49c.538-.194 1.008.131.834.964z" />
          </svg>
        </span>
        <div>
          <h3 className="tg-card__title">Telegram Bot</h3>
          <p className="tg-card__subtitle">Send files directly to Zenith from Telegram</p>
        </div>
        <span className={`tg-card__badge ${isLinked ? 'tg-card__badge--linked' : 'tg-card__badge--unlinked'}`}>
          {isLinked ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {isLinked ? (
        <div className="tg-card__linked">
          <p className="tg-card__info">
            Your Telegram account is linked. Send any file or text to the bot and it will appear in your <strong>/Telegram</strong> folder.
          </p>
          {error && <p className="tg-card__error">{error}</p>}
          <button
            type="button"
            className="tg-card__btn tg-card__btn--danger"
            onClick={handleUnlink}
            disabled={unlinking}
          >
            {unlinking ? 'Disconnecting...' : 'Disconnect Telegram'}
          </button>
        </div>
      ) : (
        <div className="tg-card__unlinked">
          <ol className="tg-card__steps">
            <li>
              Open Telegram and find <strong>@BotFather</strong>. Create a bot with{' '}
              <code>/newbot</code> and copy the token to your <code>.env</code>.
            </li>
            <li>
              Copy your session token below and send this message to the bot:
              <div className="tg-card__command">
                <code>/link YOUR_TOKEN</code>
              </div>
            </li>
            <li>The bot will confirm the link and start saving your files to Zenith.</li>
          </ol>

          <button type="button" className="tg-card__btn" onClick={handleCopyToken}>
            {copied ? 'Copied!' : 'Copy session token'}
          </button>
        </div>
      )}
    </section>
  )
}

export default TelegramLinkCard
