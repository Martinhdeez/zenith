// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState, useEffect, useMemo } from 'react'
import './OnboardingTutorial.css'

const TUTORIAL_STEPS = [
  {
    targetId: 'step-search',
    title: 'AI Semantic Search',
    content: 'Find files by meaning, not just keywords. Try searching for "design concepts" or "financial reports".',
    position: 'bottom'
  },
  {
    targetId: 'step-upload',
    title: 'New Content',
    content: 'Click here to start adding files or folders to your workspace. Let’s try it now!',
    position: 'right'
  },
  {
    targetId: 'step-tabs',
    title: 'Content Types',
    content: 'Organize your way. Choose between uploading files, creating text notes, or making new folders.',
    position: 'bottom'
  },
  {
    targetId: 'step-dropzone',
    title: 'Smart Dropzone',
    content: 'Drag and drop your files here. Multi-file support is built-in!',
    position: 'top'
  },
  {
    targetId: 'step-description',
    title: 'AI Context',
    content: 'Optionally add context. This helps Zenith’s AI find the perfect home for your files.',
    position: 'top'
  },
  {
    targetId: 'step-smart-sync',
    title: 'Smart Auto-Sync',
    content: 'The magic happens here. Zenith analyzes your workspace and suggests the perfect PARA category automatically.',
    position: 'top'
  },
  {
    targetId: 'step-breadcrumbs',
    title: 'Fluid Navigation',
    content: 'Keep track of where you are. Click on any part of the path to jump back instantly.',
    position: 'bottom'
  },
  {
    targetId: 'step-study',
    title: 'AI Study Guide',
    content: 'Inside any folder, click this button to generate a comprehensive study guide from all your documents.',
    position: 'top'
  }
]

function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [isReady, setIsReady] = useState(false)

  const step = TUTORIAL_STEPS[currentStep]

  // Wait for the first target OR timeout to show something
  useEffect(() => {
    let attempts = 0
    const checkFirstTarget = setInterval(() => {
      const el = document.getElementById(TUTORIAL_STEPS[0].targetId)
      if (el || attempts > 20) { // Max 2 seconds wait for target
        setIsReady(true)
        clearInterval(checkFirstTarget)
      }
      attempts++
    }, 100)
    
    return () => clearInterval(checkFirstTarget)
  }, [])

  useEffect(() => {
    const updateTargetRect = () => {
      const element = document.getElementById(step.targetId)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        // If element not found, try to find next available step or set null
        setTargetRect(null)
      }
    }

    const checkAvailability = setInterval(updateTargetRect, 500)
    updateTargetRect()

    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect)
    return () => {
      clearInterval(checkAvailability)
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect)
    }
  }, [currentStep, step.targetId])

  const handleNext = () => {
    // Check if next step's element exists, if not we might need to skip to the next available one
    // or just let it be null until the user performs the action.
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete?.()
    }
  }

  // Auto-skip steps that are not visible (e.g. modal steps when modal is closed)
  // EXCEPT if they are the direct next step.
  useEffect(() => {
    const element = document.getElementById(step.targetId)
    // If we are on a step that is not visible, and it's not the initial home steps, 
    // we might want to wait. But let's show a "Placeholder" or just hide until found.
  }, [currentStep, step.targetId])

  if (!isReady) return null

  // Calculate tooltip position based on target and step preference
  const getTooltipStyle = () => {
    if (!targetRect) {
      // Fallback: Center of screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      }
    }

    const padding = 20
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    
    switch (step.position) {
      case 'right':
        return {
          top: targetRect.top + scrollY + targetRect.height / 2,
          left: targetRect.right + scrollX + padding,
          transform: 'translateY(-50%)'
        }
      case 'top':
        return {
          top: targetRect.top + scrollY - padding,
          left: targetRect.left + scrollX + targetRect.width / 2,
          transform: 'translate(-50%, -100%)'
        }
      case 'bottom':
      default:
        return {
          top: targetRect.bottom + scrollY + padding,
          left: targetRect.left + scrollX + targetRect.width / 2,
          transform: 'translateX(-50%)'
        }
    }
  }

  return (
    <div className="onboarding-overlay">
      {/* Background Mask */}
      <div className="onboarding-mask">
        {targetRect && (
          <div 
            className="onboarding-highlight"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              borderRadius: '12px'
            }}
          />
        )}
      </div>

      {/* Tooltip Card */}
      <div 
        className={`onboarding-tooltip onboarding-tooltip--${step.position}`}
        style={getTooltipStyle()}
      >
        <div className="onboarding-tooltip__header">
          <span className="onboarding-step-counter">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>
          <h3>{step.title}</h3>
        </div>
        
        <p className="onboarding-content">{step.content}</p>

        <div className="onboarding-footer">
          <button className="onboarding-skip" onClick={onSkip}>
            Skip Tutorial
          </button>
          <button className="onboarding-next" onClick={handleNext}>
            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Get Started' : 'Next Step'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Pointer Arrow */}
        <div className="onboarding-arrow" />
      </div>
    </div>
  )
}

export default OnboardingTutorial
