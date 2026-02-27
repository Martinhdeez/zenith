import iconChallenges from '../../../../assets/icons/challenges.svg'
import iconFeedback from '../../../../assets/icons/feedback.svg'
import iconCommunity from '../../../../assets/icons/community.svg'
import iconTracks from '../../../../assets/icons/tracks.svg'
import './FeaturesSection.css'

const iconMap = {
  challenges: iconChallenges,
  feedback: iconFeedback,
  community: iconCommunity,
  tracks: iconTracks,
}

function FeaturesSection({ featureCards }) {
  return (
    <section className="features" id="paths">
      <div className="section-header">
        <h2>From scattered input to reusable knowledge</h2>
      </div>
      <div className="feature-grid">
        {featureCards.map((feature) => (
          <article key={feature.title} className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              <img src={iconMap[feature.icon] || iconChallenges} alt="" />
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default FeaturesSection
