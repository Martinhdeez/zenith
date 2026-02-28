// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../../core/firebase/firebaseConfig.js'
import { getAuthErrorMessage } from '../utils/authErrorMessages.js'

export function useFirebaseGoogleAuth({ setLoading, setError, onLoginSuccess, onClose }) {
  const handleGoogleLogin = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      googleProvider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: idToken,
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
            mode: 'google', // Use a dedicated mode to avoid generic login messages
            status: res.status,
            payload,
          }),
        )
      }

      const data = await res.json()

      if (!data.access_token) {
        throw new Error('Missing access token from backend')
      }

      localStorage.setItem('token', data.access_token)
      onLoginSuccess?.(data)
      onClose?.()
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error
        return
      }
      setError(err.message || 'Firebase Google login failed.')
      console.error('Google Auth Error:', err)
      
      if (err.message.includes('Not Found') || err.message.includes('404')) {
        setError('Endpoint not found. Check if the backend is running and the API path is correct.')
      }
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, onLoginSuccess, onClose])

  return { handleGoogleLogin }
}
