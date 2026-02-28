import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './features/landing/page/LandingPage.jsx'
import HomePage from './features/home/page/HomePage.jsx'
import AssistantPage from './features/assistant/page/AssistantPage.jsx'
import ProfilePage from './features/profile/page/ProfilePage.jsx'
import './App.css'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setCurrentUser(null)
      setLoading(false)
      return
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Session expired')
      }

      const user = await response.json()
      setCurrentUser(user)
    } catch (error) {
      console.error('Unable to restore user session', error)
      localStorage.removeItem('token')
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  const handleSignOut = () => {
    localStorage.removeItem('token')
    setCurrentUser(null)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Initializing Zenith...</p>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <LandingPage currentUser={currentUser} onAuthSuccess={fetchCurrentUser} onSignOut={handleSignOut} />
          } 
        />
        <Route 
          path="/home" 
          element={
            currentUser ? (
              <HomePage currentUser={currentUser} onSignOut={handleSignOut} onAuthSuccess={fetchCurrentUser} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/assistant" 
          element={
            currentUser ? (
              <AssistantPage currentUser={currentUser} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/profile" 
          element={
            currentUser ? (
              <ProfilePage currentUser={currentUser} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
