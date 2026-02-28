import './CtaSection.css'

function CtaSection({ onSignUp, onSignIn }) {
  return (
    <section className="cta">
      <div className="cta-card">
        <h2>Ready to build your Digital Brain?</h2>
        <p>
          Create your account to capture, process, and organize knowledge in one
          place with an AI-powered workflow.
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
