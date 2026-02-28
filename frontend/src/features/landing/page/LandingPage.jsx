// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function LandingPage({ currentUser, onAuthSuccess, onSignOut }) {
  const navigate = useNavigate()
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)

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
    closeLogin()
    if (onAuthSuccess) {
      await onAuthSuccess()
      navigate('/home')
    }
  }

  // Removed auto-redirect to allow authenticated users to visit landing page
  /*
  useEffect(() => {
    if (currentUser) {
      navigate('/home')
    }
  }, [currentUser, navigate])
  */

  return (
    <div className={`landing ${isModalOpen ? 'is-modal-open' : ''}`}>
      <ParticlesBackground />
      <div className="landing-content">
        <SideBar
          isAuthenticated={Boolean(currentUser)}
          onLogin={openLogin}
          onRegister={openRegister}
          onSignOut={onSignOut}
        />
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
