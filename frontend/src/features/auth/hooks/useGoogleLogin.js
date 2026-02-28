// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useEffect } from 'react'
import { getAuthErrorMessage } from '../utils/authErrorMessages.js'

export function useGoogleLogin({ isOpen, setLoading, setError, onLoginSuccess, onClose, buttonId }) {
  const handleGoogleLogin = useCallback(
    async (response) => {
      try {
        setLoading(true)
        setError(null)

        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential: response.credential,
          }),
        })

        if (!res.ok) {
          let payload = null
          try {
            payload = await res.json()
          } catch {
            payload = await res.text()
          }

          throw new Error(
            getAuthErrorMessage({
              mode: 'login',
              status: res.status,
              payload,
            }),
          )
        }

        const data = await res.json()

        if (!data.access_token) {
          throw new Error('Missing access token')
        }

        localStorage.setItem('token', data.access_token)
        onLoginSuccess?.(data)
        onClose?.()
      } catch (err) {
        setError(err.message || 'Google login failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setError, onLoginSuccess, onClose],
  )

  useEffect(() => {
    if (isOpen && buttonId) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (clientId && window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
        })
        
        window.google.accounts.id.renderButton(
          document.getElementById(buttonId),
          { 
            theme: 'outline', 
            size: 'large', 
            text: 'continue_with',
            shape: 'rectangular',
            width: '100%'
          }
        )
      }
    }
  }, [isOpen, buttonId, handleGoogleLogin])

  return {}
}
