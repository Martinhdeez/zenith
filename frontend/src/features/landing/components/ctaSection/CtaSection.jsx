import './CtaSection.css'

function CtaSection({ onSignUp, onSignIn }) {
  return (
    <section className="cta">
      <div className="cta-card">
        <h2>Ready to enter the arena?</h2>
        <p>
          Create your account, compete in real challenges, and showcase your
          progress in a public profile ready for recruiters.
        </p>
        <div className="hero-actions">
          <button className="btn primary" type="button" onClick={onSignUp}>
            Create account
          </button>
          <button className="btn secondary" type="button" onClick={onSignIn}>
            I already have an account
          </button>
        </div>
      </div>
    </section>
  )
}

export default CtaSection
