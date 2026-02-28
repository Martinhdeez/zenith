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

function LandingPage({ onAuthSuccess }) {
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
    }
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
