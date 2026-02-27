import { useState } from 'react'
import './Register.css'

function Register({ isOpen, onClose, onSignIn }) {
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
    const username = String(formData.get('username') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!username || !email || !password || !confirmPassword) {
      setError('Please complete all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Registration failed')
      }

      onClose?.()
      onSignIn?.()
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="register-card">
        <button className="register-close" type="button" onClick={onClose} aria-label="Close register modal">
          x
        </button>
        <div className="register-header">
          <div className="register-badge">DA</div>
          <h2>Create account</h2>
          <p>Join DevArena and start competing in real challenges.</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input type="text" name="username" placeholder="yourname" autoComplete="username" />
          </label>
          <label>
            Email
            <input type="email" name="email" placeholder="name@email.com" autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" placeholder="********" autoComplete="new-password" />
          </label>
          <label>
            Confirm password
            <input type="password" name="confirmPassword" placeholder="********" autoComplete="new-password" />
          </label>

          <button className="btn primary register-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="register-divider">
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
            <span className="gsi-material-button-contents">Sign up with Google</span>
            <span className="gsi-hidden-text">Sign up with Google</span>
          </div>
        </button>

        {error ? <p className="register-error">{error}</p> : null}

        <p className="register-footnote">
          Already have an account?{' '}
          <button type="button" onClick={onSignIn}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}

export default Register
