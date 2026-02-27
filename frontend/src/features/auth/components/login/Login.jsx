import { useState } from 'react'
import './Login.css'

function Login({ isOpen = true, onClose, onSignUp, onLoginSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) {
    return null
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
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
        const errorText = await response.text()
        throw new Error(errorText || 'Invalid credentials')
      }

      const data = await response.json()

      if (!data.access_token) {
        throw new Error('Missing access token')
      }

      localStorage.setItem('token', data.access_token)
      onLoginSuccess?.(data)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="login-card">
        <button className="login-close" type="button" onClick={onClose} aria-label="Close login modal">
          x
        </button>
        <div className="login-header">
          <div className="login-badge">DA</div>
          <h2>Sign in</h2>
          <p>Access your DevArena account and keep competing.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="gsi-material-button" type="button" disabled={loading}>
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper">
            <div className="gsi-material-button-icon">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                style={{ display: 'block' }}
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents">Sign in with Google</span>
            <span className="gsi-hidden-text">Sign in with Google</span>
          </div>
        </button>

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
