import './Footer.css'

const defaultLinks = [
  { href: '#overview', label: 'Overview' },
  { href: '#paths', label: 'Workflow' },
]

function Footer({ links = defaultLinks, copyright }) {
  return (
    <footer className="footer">
      <div className="footer-links">
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
      <p>{copyright}</p>
    </footer>
  )
}

Footer.defaultProps = {
  copyright: '(c) 2026 Zenith. All rights reserved.',
}

export default Footer
