// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef, useState } from 'react'
import { getAuthErrorMessage } from '../../utils/authErrorMessages.js'
import zenithLogo from '../../../../assets/logo/LOGO-DEFINITIVO.png'
import './Register.css'

function Register({ isOpen, onClose, onSignIn }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const shouldCloseOnClickRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      return
    }

    setLoading(false)
    setError(null)
    setFormKey((prev) => prev + 1)
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const isValidEmail = (value) => /.+@.+\..+/.test(value)

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
    const username = String(formData.get('username') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!username || !email || !password || !confirmPassword) {
      setError('Complete all fields before creating your account.')
      return
    }

    if (username.length < 3) {
      setError('Username is too short. Use at least 3 characters.')
      return
    }

    if (!isValidEmail(email)) {
      setError('Email is not valid. Example: name@email.com')
      return
    }

    if (password.length < 8) {
      setError('Password is too short. Use at least 8 characters.')
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
        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = await response.text()
        }

        throw new Error(
          getAuthErrorMessage({
            mode: 'register',
            status: response.status,
            payload,
          }),
        )
      }

      onClose?.()
      onSignIn?.()
    } catch (err) {
      if (err?.name === 'TypeError') {
        setError('Cannot connect to the server. Make sure backend is running.')
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="register-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div className="register-card">
        <button className="register-close" type="button" onClick={onClose} aria-label="Close register modal">
          x
        </button>
        <div className="register-header">
          <div className="register-badge" aria-hidden="true">
            <img src={zenithLogo} alt="" className="register-badge-logo" />
          </div>
          <h2>Create account</h2>
          <p>Join Zenith and start competing in real challenges.</p>
        </div>

        <form key={formKey} className="register-form" onSubmit={handleSubmit}>
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

        {/* Removed Google Signup Button */}

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
