import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlobalNav from '../components/GlobalNav.jsx'
import GlobalFooter from '../components/GlobalFooter.jsx'
import './Contact.css'

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
}

function validate(fields) {
  const errors = {}
  if (!fields.name.trim())    errors.name    = 'Name is required.'
  if (!fields.email.trim())   errors.email   = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
                               errors.email   = 'Please enter a valid email.'
  if (!fields.message.trim()) errors.message = 'Message is required.'
  return errors
}

export default function Contact() {
  const navigate = useNavigate()

  const [fields,  setFields]  = useState({ name: '', email: '', message: '' })
  const [errors,  setErrors]  = useState({})
  const [touched, setTouched] = useState({})
  const [status,  setStatus]  = useState('idle') // idle | sending | success

  const set = (key, val) => {
    setFields(prev => ({ ...prev, [key]: val }))
    if (touched[key]) {
      const errs = validate({ ...fields, [key]: val })
      setErrors(prev => ({ ...prev, [key]: errs[key] }))
    }
  }

  const blur = (key) => {
    setTouched(prev => ({ ...prev, [key]: true }))
    const errs = validate(fields)
    setErrors(prev => ({ ...prev, [key]: errs[key] }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched({ name: true, email: true, message: true })
    const errs = validate(fields)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStatus('sending')
    // Simulate async submission
    setTimeout(() => {
      setStatus('success')
      setFields({ name: '', email: '', message: '' })
      setTouched({})
      setErrors({})
    }, 1200)
  }

  const resetForm = () => setStatus('idle')

  return (
    <div className="contact-page">

      {/* Animated background */}
      <div className="contact-bg" aria-hidden="true">
        <div className="contact-orb contact-orb-1" />
        <div className="contact-orb contact-orb-2" />
        <div className="contact-orb contact-orb-3" />
        <div className="contact-grid" />
        <div className="contact-vignette" />
      </div>

      <GlobalNav />

      {/* ── Hero ── */}
      <section className="contact-hero">
        <motion.div
          className="contact-hero-content"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div className="contact-hero-badge" variants={fadeUp} custom={0}>
            <span className="contact-badge-dot" />
            Reach Out
          </motion.div>

          <motion.h1 className="contact-hero-title" variants={fadeUp} custom={1}>
            Contact <span className="gradient-text">Us</span>
          </motion.h1>

          <motion.p className="contact-hero-subtitle" variants={fadeUp} custom={2}>
            We'd love to hear from you — questions, feedback, collaboration ideas, or anything else.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Main content ── */}
      <section className="contact-main">
        <div className="contact-container">

          {/* Form column */}
          <motion.div
            className="contact-form-wrap"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="contact-card">
              <div className="contact-card-header">
                <h2 className="contact-card-title">Send a Message</h2>
                <p className="contact-card-sub">We'll get back to you as soon as possible.</p>
              </div>

              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    className="contact-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1,  scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="contact-success-icon">✓</div>
                    <h3 className="contact-success-title">Message sent!</h3>
                    <p className="contact-success-sub">
                      Thanks for reaching out. We'll be in touch soon.
                    </p>
                    <button className="contact-success-btn" onClick={resetForm}>
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="contact-form"
                    noValidate
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Name */}
                    <div className={`contact-field${errors.name && touched.name ? ' contact-field--error' : ''}`}>
                      <label className="contact-label" htmlFor="ct-name">
                        Name <span className="contact-required">*</span>
                      </label>
                      <input
                        id="ct-name"
                        className="contact-input"
                        type="text"
                        placeholder="Your full name"
                        value={fields.name}
                        onChange={e => set('name', e.target.value)}
                        onBlur={() => blur('name')}
                        autoComplete="name"
                      />
                      {errors.name && touched.name && (
                        <motion.span
                          className="contact-error"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {errors.name}
                        </motion.span>
                      )}
                    </div>

                    {/* Email */}
                    <div className={`contact-field${errors.email && touched.email ? ' contact-field--error' : ''}`}>
                      <label className="contact-label" htmlFor="ct-email">
                        Email <span className="contact-required">*</span>
                      </label>
                      <input
                        id="ct-email"
                        className="contact-input"
                        type="email"
                        placeholder="you@example.com"
                        value={fields.email}
                        onChange={e => set('email', e.target.value)}
                        onBlur={() => blur('email')}
                        autoComplete="email"
                      />
                      {errors.email && touched.email && (
                        <motion.span
                          className="contact-error"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {errors.email}
                        </motion.span>
                      )}
                    </div>

                    {/* Message */}
                    <div className={`contact-field${errors.message && touched.message ? ' contact-field--error' : ''}`}>
                      <label className="contact-label" htmlFor="ct-msg">
                        Message <span className="contact-required">*</span>
                      </label>
                      <textarea
                        id="ct-msg"
                        className="contact-textarea"
                        placeholder="Tell us what's on your mind…"
                        rows={5}
                        value={fields.message}
                        onChange={e => set('message', e.target.value)}
                        onBlur={() => blur('message')}
                      />
                      {errors.message && touched.message && (
                        <motion.span
                          className="contact-error"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {errors.message}
                        </motion.span>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="contact-submit"
                      disabled={status === 'sending'}
                    >
                      {status === 'sending' ? (
                        <span className="contact-spinner" />
                      ) : (
                        <>
                          Submit
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Info column */}
          <motion.div
            className="contact-info-wrap"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Contact details */}
            <div className="contact-info-card">
              <h3 className="contact-info-title">Contact Information</h3>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-info-label">Email</div>
                  <a href="mailto:cloudkrida@gmail.com" className="contact-info-value contact-info-link">
                    cloudkrida@gmail.com
                  </a>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-info-label">Website</div>
                  <span className="contact-info-value">cloudkrida.com</span>
                </div>
              </div>
            </div>

            {/* Platform links */}
            <div className="contact-info-card">
              <h3 className="contact-info-title">Explore the Platform</h3>
              <p className="contact-info-body">
                Jump straight into the tournament tools — no account required to explore.
              </p>
              <div className="contact-platform-links">
                {[
                  { icon: '♟', label: 'Chess Tournaments', path: '/chess' },
                  { icon: '🎾', label: 'Tennis',           path: '/tennis' },
                  { icon: '🎯', label: 'Darts',            path: '/darts' },
                  { icon: '📖', label: 'About Us',         path: '/about' },
                ].map(l => (
                  <button
                    key={l.path}
                    className="contact-platform-link"
                    onClick={() => navigate(l.path)}
                  >
                    <span className="contact-platform-icon">{l.icon}</span>
                    <span>{l.label}</span>
                    <svg className="contact-platform-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
