import { useEffect, useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import Footer from '../../shared/components/Footer.jsx'
import ParticlesBackground from '../components/particlesBackground/ParticlesBackground.jsx'
import Hero from '../components/hero/Hero.jsx'
import FeaturesSection from '../components/featuresSection/FeaturesSection.jsx'
import CtaSection from '../components/ctaSection/CtaSection.jsx'
import Register from '../../auth/components/register/Register.jsx'
import Login from '../../auth/components/login/Login.jsx'
import HomePage from '../../home/page/HomePage.jsx'
import ProfilePage from '../../profile/page/ProfilePage.jsx'
import { featureCards, typewriterWords } from './landingData.js'
import './LandingPage.css'

function LandingPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentView, setCurrentView] = useState('home')

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setCurrentUser(null)
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
    }
  }

  useEffect(() => {
    void fetchCurrentUser()
  }, [])

  const openRegister = () => {
    setIsLoginOpen(false)
    setIsRegisterOpen(true)
  }

  const openLogin = () => {
    setIsRegisterOpen(false)
    setIsLoginOpen(true)
  }

  const closeRegister = () => setIsRegisterOpen(false)
  const closeLogin = () => setIsLoginOpen(false)

  const isModalOpen = isRegisterOpen || isLoginOpen

  const handleLoginSuccess = async () => {
    await fetchCurrentUser()
    setCurrentView('home')
  }

  const handleSignOut = () => {
    localStorage.removeItem('token')
    setCurrentUser(null)
    setCurrentView('home')
  }

  const handleNavigate = (href) => {
    if (href === '#home') {
      setCurrentView('home')
      return
    }
    if (href === '#profile') {
      setCurrentView('profile')
    }
  }

  if (currentUser) {
    if (currentView === 'profile') {
      return (
        <ProfilePage
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onViewHome={() => setCurrentView('home')}
          onNavigate={handleNavigate}
        />
      )
    }

    return (
      <HomePage
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onViewProfile={() => setCurrentView('profile')}
        onNavigate={handleNavigate}
      />
    )
  }

  return (
    <div className={`landing ${isModalOpen ? 'is-modal-open' : ''}`}>
      <ParticlesBackground />
      <div className="landing-content">
        <SideBar isAuthenticated={false} onLogin={openLogin} onRegister={openRegister} />
        <Hero words={typewriterWords} onStart={openRegister} />
        <FeaturesSection featureCards={featureCards} />
        <CtaSection onSignUp={openRegister} onSignIn={openLogin} />
        <Footer />
      </div>
      <Register isOpen={isRegisterOpen} onClose={closeRegister} onSignIn={openLogin} />
      <Login isOpen={isLoginOpen} onClose={closeLogin} onSignUp={openRegister} onLoginSuccess={handleLoginSuccess} />
    </div>
  )
}

export default LandingPage
