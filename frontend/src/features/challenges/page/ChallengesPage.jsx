import { useMemo, useState } from 'react'
import SideBar from '../../shared/components/SideBar.jsx'
import ChallengesHeader from '../components/challengesHeader/ChallengesHeader.jsx'
import ChallengesFilters from '../components/challengesFilters/ChallengesFilters.jsx'
import ChallengesList from '../components/challengesList/ChallengesList.jsx'
import { challengeItems, difficultyOptions, languageOptions } from './challengesData.js'
import './ChallengesPage.css'

function ChallengesPage({ userName, onSignOut }) {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('cards')
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [selectedLanguage, setSelectedLanguage] = useState('All')

  const visibleChallenges = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return challengeItems.filter((challenge) => {
      const matchesDifficulty = selectedDifficulty === 'All' || challenge.difficulty === selectedDifficulty
      const matchesLanguage = selectedLanguage === 'All' || challenge.language === selectedLanguage
      const searchableText = `${challenge.title} ${challenge.description} ${challenge.language}`.toLowerCase()
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch)

      return matchesDifficulty && matchesLanguage && matchesSearch
    })
  }, [search, selectedDifficulty, selectedLanguage])

  return (
    <div className="challenges-page">
      <SideBar isAuthenticated onSignOut={onSignOut} />

      <main className="challenges-page__content">
        <section id="challenges-header">
          <ChallengesHeader
            search={search}
            onSearchChange={setSearch}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalResults={visibleChallenges.length}
          />
        </section>

        <ChallengesFilters
          difficultyOptions={difficultyOptions}
          languageOptions={languageOptions}
          selectedDifficulty={selectedDifficulty}
          selectedLanguage={selectedLanguage}
          onDifficultyChange={setSelectedDifficulty}
          onLanguageChange={setSelectedLanguage}
        />

        <ChallengesList challenges={visibleChallenges} viewMode={viewMode} />
      </main>
    </div>
  )
}

export default ChallengesPage
