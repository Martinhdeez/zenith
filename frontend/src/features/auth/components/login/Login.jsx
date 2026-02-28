import { useEffect, useRef, useState } from 'react'
import { getAuthErrorMessage } from '../../utils/authErrorMessages.js'
import zenithLogo from '../../../../assets/logo/LOGO-DEFINITIVO.png'
import './Login.css'

function Login({ isOpen = true, onClose, onSignUp, onLoginSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const shouldCloseOnClickRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      setError(null)
      setFormKey((prev) => prev + 1)
    }
  }, [isOpen])



  if (!isOpen) {
    return null
  }

  const handleOverlayMouseDown = (event) => {
    shouldCloseOnClickRef.current = event.target === event.currentTarget
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && shouldCloseOnClickRef.current) {
      onClose?.()
    }
    shouldCloseOnClickRef.current = false
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const identifier = String(formData.get('identifier') || '').trim()
    const password = String(formData.get('password') || '')

    if (!identifier || !password) {
      setError('Please enter your username/email and password.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const body = new URLSearchParams({
        username: identifier,
        password,
      })

      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })

      if (!response.ok) {
        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = await response.text()
        }

        throw new Error(
          getAuthErrorMessage({
            mode: 'login',
            status: response.status,
            payload,
          }),
        )
      }

      const data = await response.json()

      if (!data.access_token) {
        throw new Error('Missing access token')
      }

      localStorage.setItem('token', data.access_token)
      onLoginSuccess?.(data)
      onClose?.()
    } catch (err) {
      if (err?.name === 'TypeError') {
        setError('Cannot connect to the server. Make sure backend is running.')
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div className="login-card">
        <button className="login-close" type="button" onClick={onClose} aria-label="Close login modal">
          x
        </button>
        <div className="login-header">
          <div className="login-badge" aria-hidden="true">
            <img src={zenithLogo} alt="" className="login-badge-logo" />
          </div>
          <h2>Sign in</h2>
          <p>Access your Zenith account and keep competing.</p>
        </div>

        <form key={formKey} className="login-form" onSubmit={handleSubmit}>
          <label>
            Username or email
            <input type="text" name="identifier" placeholder="yourname or name@email.com" autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" name="password" placeholder="********" autoComplete="current-password" />
          </label>

          <button className="btn primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Removed Google Login Button */}

        {error ? <p className="login-error">{error}</p> : null}

        <p className="login-footnote">
          No account yet?{' '}
          <button type="button" onClick={onSignUp}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}

export default Login
