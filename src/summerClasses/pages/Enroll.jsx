import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'
import { supabase } from '../../shared/utilities/supabase.js'

const STEPS = [
  { icon: '✉️', title: 'Reach Out', desc: 'Submit an inquiry with your child\'s grade level and what you\'re looking for help with. We respond within 1 business day.' },
  { icon: '🧑‍🏫', title: 'Free Demo Class', desc: 'We\'ll arrange a free demo lesson so your student can experience the teaching style and class format firsthand before enrolling.' },
  { icon: '📚', title: 'Enrollment & Start Learning', desc: 'We\'ll go over goals, scheduling, and program recommendations, then complete enrollment and get regular classes on the calendar.' },
]

const RECAP = ['💻 Online sessions available', '🏠 In-person sessions by arrangement', '🧑‍🏫 One-on-one tutoring', '👥 Small group classes']

const POST_ENROLLMENT = [
  { icon: '🏫', title: 'Google Classroom', desc: 'Your student is added to a Google Classroom for assignments, announcements, and materials specific to their course.' },
  { icon: '🎥', title: 'Google Meet', desc: 'Online sessions run over Google Meet — a link is shared before each class, with no new app or account to set up.' },
  { icon: '📁', title: 'Google Drive', desc: 'Worksheets, session notes, and reference materials are shared through a Google Drive folder set up for your student.' },
]

const GRADES = ['Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)]
const SUBJECTS = ['Elementary Math', 'Middle School Math', 'Algebra I / II', 'Geometry', 'Pre-Calculus / Calculus', 'SAT / ACT Math Prep', 'Other']

const initialFields = {
  parentName: '', parentEmail: '', parentPhone: '',
  studentName: '', studentGrade: '',
  subject: '', format: 'online', classType: 'one_on_one',
  message: '',
}

// Order matters — this is also the focus order used after a failed submit.
const REQUIRED_FIELDS = ['parentName', 'parentEmail', 'studentName', 'studentGrade', 'subject']

function validate(f) {
  const errors = {}
  if (!f.parentName.trim())  errors.parentName  = 'Parent name is required.'
  if (!f.parentEmail.trim()) errors.parentEmail = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.parentEmail)) errors.parentEmail = 'Please enter a valid email.'
  if (!f.studentName.trim()) errors.studentName = 'Student name is required.'
  if (!f.studentGrade)       errors.studentGrade = 'Please select a grade.'
  if (!f.subject)            errors.subject      = 'Please select a subject.'
  return errors
}

// `group` renders the label as a group heading (aria-labelledby) instead of htmlFor,
// for fields like Format/Class Type where the control is a set of pill buttons, not one input.
function Field({ label, error, id, group = false, children }) {
  const errorId = `${id}-error`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        id={group ? `${id}-label` : undefined}
        htmlFor={group ? undefined : id}
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        {label}
      </label>
      {children}
      {error && <span id={errorId} role="alert" style={{ fontSize: 12, color: '#f87171' }}>{error}</span>}
    </div>
  )
}

const inputStyle = (hasError) => ({
  padding: '11px 13px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${hasError ? 'rgba(248,113,113,0.5)' : 'var(--border-subtle)'}`,
  color: 'var(--text-primary)', outline: 'none', width: '100%',
})

function PillGroup({ options, value, onChange, ariaLabelledby }) {
  return (
    <div role="radiogroup" aria-labelledby={ariaLabelledby} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '9px 16px', borderRadius: 100, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600,
              background: active ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'var(--border-subtle)'}`,
              color: active ? 'var(--summer-accent)' : 'var(--text-secondary)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Enroll() {
  const navigate = useNavigate()

  usePageMeta({
    title: 'Contact & Enrollment — Learning Programs — Cloud Krida',
    description: 'Submit an enrollment inquiry for Cloud Krida\'s Learning Programs mathematics tutoring — online or in-person, one-on-one or group.',
  })

  const [fields,  setFields]  = useState(initialFields)
  const [errors,  setErrors]  = useState({})
  const [touched, setTouched] = useState({})
  const [status,  setStatus]  = useState('idle') // idle | sending | success

  const fieldRefs = {
    parentName:   useRef(null),
    parentEmail:  useRef(null),
    studentName:  useRef(null),
    studentGrade: useRef(null),
    subject:      useRef(null),
  }

  const set = (key, val) => {
    setFields(prev => ({ ...prev, [key]: val }))
    if (touched[key]) setErrors(validate({ ...fields, [key]: val }))
  }
  const blur = (key) => {
    setTouched(prev => ({ ...prev, [key]: true }))
    setErrors(validate(fields))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ parentName: true, parentEmail: true, studentName: true, studentGrade: true, subject: true })
    const errs = validate(fields)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const firstInvalid = REQUIRED_FIELDS.find(key => errs[key])
      fieldRefs[firstInvalid]?.current?.focus()
      return
    }

    setStatus('sending')
    const { error } = await supabase.from('enrollment_inquiries').insert({
      parent_name:   fields.parentName.trim(),
      parent_email:  fields.parentEmail.trim(),
      parent_phone:  fields.parentPhone.trim() || null,
      student_name:  fields.studentName.trim(),
      student_grade: fields.studentGrade,
      subject:       fields.subject,
      format:        fields.format,
      class_type:    fields.classType,
      message:       fields.message.trim() || null,
    })

    if (error) {
      console.error('[Enroll] Supabase insert error:', error)
      setErrors({ _form: 'Something went wrong submitting your inquiry. Please try again or email cloudkrida@gmail.com directly.' })
      setStatus('idle')
      return
    }

    setStatus('success')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Learning Programs', path: '/summerclasses' }, { label: 'Contact & Enrollment' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>✉️</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--summer-accent)', marginBottom: 14, textTransform: 'uppercase' }}>
            Contact & Enrollment
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            Let's Get Started
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Enrolling is simple — submit an inquiry, attend a free demo class, and enroll once
            you're ready to start.
          </p>
        </motion.div>
      </div>

      {/* How it works */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: '0 24px 72px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em' }}>How Enrollment Works</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {STEPS.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.55 }}
              style={{ textAlign: 'center', padding: '26px 20px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto 14px',
                background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: 'var(--summer-accent)',
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</div>
            </motion.div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          The free demo class is provided with no obligation to enroll. It allows students and
          parents to experience the teaching approach before making a decision.
        </p>
      </div>

      {/* What happens after enrollment */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '0 24px 56px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em' }}>What Happens After You Enroll</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 520, margin: '10px auto 0' }}>
            Classes run on tools your family probably already uses — no new app or account to figure out.
          </p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {POST_ENROLLMENT.map((t, i) => (
            <motion.div key={t.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              style={{ padding: '20px 18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{t.icon}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t.desc}</div>
            </motion.div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
          See the full{' '}
          <button
            onClick={() => navigate('/summerclasses/tools')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: 'var(--summer-accent)', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}
          >
            How Classes Work
          </button>
          {' '}breakdown, or browse{' '}
          <button
            onClick={() => navigate('/summerclasses/materials')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: 'var(--summer-accent)', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}
          >
            Learning Materials
          </button>
          .
        </p>
      </div>

      {/* Format recap */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {RECAP.map(r => (
            <span key={r} style={{
              padding: '8px 16px', borderRadius: 100,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
            }}>
              {r}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 18, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Program recommendations, scheduling, and pricing details are discussed during the
          enrollment process — submit an inquiry below to get started.
        </p>
      </div>

      {/* Enrollment inquiry form */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '0 24px 96px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ padding: '32px 28px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#10b981',
                }}>
                  ✓
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Inquiry submitted!</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Thanks for reaching out — we'll respond within 1 business day to arrange a free
                  demo class for your student.
                </p>
                <button
                  onClick={() => { setStatus('idle'); setFields(initialFields); setTouched({}); setErrors({}) }}
                  style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--summer-accent)' }}
                >
                  Submit another inquiry
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--summer-accent)', marginBottom: 12 }}>
                    Parent Information
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Name *" id="parentName" error={touched.parentName && errors.parentName}>
                      <input
                        id="parentName" ref={fieldRefs.parentName}
                        style={inputStyle(touched.parentName && errors.parentName)} value={fields.parentName}
                        aria-invalid={!!(touched.parentName && errors.parentName)}
                        aria-describedby={touched.parentName && errors.parentName ? 'parentName-error' : undefined}
                        onChange={e => set('parentName', e.target.value)} onBlur={() => blur('parentName')} placeholder="Your full name" />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Field label="Email *" id="parentEmail" error={touched.parentEmail && errors.parentEmail}>
                        <input
                          id="parentEmail" ref={fieldRefs.parentEmail}
                          style={inputStyle(touched.parentEmail && errors.parentEmail)} type="email" value={fields.parentEmail}
                          aria-invalid={!!(touched.parentEmail && errors.parentEmail)}
                          aria-describedby={touched.parentEmail && errors.parentEmail ? 'parentEmail-error' : undefined}
                          onChange={e => set('parentEmail', e.target.value)} onBlur={() => blur('parentEmail')} placeholder="you@example.com" />
                      </Field>
                      <Field label="Phone" id="parentPhone">
                        <input id="parentPhone" style={inputStyle(false)} type="tel" value={fields.parentPhone}
                          onChange={e => set('parentPhone', e.target.value)} placeholder="(optional)" />
                      </Field>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--summer-accent)', marginBottom: 12 }}>
                    Student Information
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Name *" id="studentName" error={touched.studentName && errors.studentName}>
                      <input
                        id="studentName" ref={fieldRefs.studentName}
                        style={inputStyle(touched.studentName && errors.studentName)} value={fields.studentName}
                        aria-invalid={!!(touched.studentName && errors.studentName)}
                        aria-describedby={touched.studentName && errors.studentName ? 'studentName-error' : undefined}
                        onChange={e => set('studentName', e.target.value)} onBlur={() => blur('studentName')} placeholder="Student's name" />
                    </Field>
                    <Field label="Grade *" id="studentGrade" error={touched.studentGrade && errors.studentGrade}>
                      <select
                        id="studentGrade" ref={fieldRefs.studentGrade}
                        style={inputStyle(touched.studentGrade && errors.studentGrade)} value={fields.studentGrade}
                        aria-invalid={!!(touched.studentGrade && errors.studentGrade)}
                        aria-describedby={touched.studentGrade && errors.studentGrade ? 'studentGrade-error' : undefined}
                        onChange={e => set('studentGrade', e.target.value)} onBlur={() => blur('studentGrade')}>
                        <option value="">Select grade</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--summer-accent)', marginBottom: 12 }}>
                    Interest
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Subject *" id="subject" error={touched.subject && errors.subject}>
                      <select
                        id="subject" ref={fieldRefs.subject}
                        style={inputStyle(touched.subject && errors.subject)} value={fields.subject}
                        aria-invalid={!!(touched.subject && errors.subject)}
                        aria-describedby={touched.subject && errors.subject ? 'subject-error' : undefined}
                        onChange={e => set('subject', e.target.value)} onBlur={() => blur('subject')}>
                        <option value="">Select subject</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Format" id="format" group>
                      <PillGroup ariaLabelledby="format-label" value={fields.format} onChange={v => set('format', v)} options={[
                        { value: 'online', label: '💻 Online' },
                        { value: 'in_person', label: '🏠 In-Person' },
                      ]} />
                    </Field>
                    <Field label="Class Type" id="classType" group>
                      <PillGroup ariaLabelledby="classType-label" value={fields.classType} onChange={v => set('classType', v)} options={[
                        { value: 'one_on_one', label: '🧑‍🏫 One-on-One' },
                        { value: 'group', label: '👥 Group' },
                      ]} />
                    </Field>
                    <Field label="Anything else? (optional)" id="message">
                      <textarea id="message" style={{ ...inputStyle(false), resize: 'vertical' }} rows={3} value={fields.message}
                        onChange={e => set('message', e.target.value)} placeholder="Goals, availability, questions…" />
                    </Field>
                  </div>
                </div>

                {errors._form && (
                  <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, color: '#f87171' }}>
                    {errors._form}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: status === 'sending' ? 'default' : 'pointer', fontFamily: 'inherit',
                    padding: '14px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#241a00',
                    fontSize: 15, fontWeight: 700, opacity: status === 'sending' ? 0.7 : 1,
                    boxShadow: '0 0 26px rgba(251,191,36,0.35)',
                  }}
                >
                  {status === 'sending' ? 'Submitting…' : 'Submit Enrollment Inquiry'}
                </button>

                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                  By submitting, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/privacy')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontSize: 12, color: 'var(--summer-accent)', textDecoration: 'underline' }}
                  >
                    Privacy Policy
                  </button>
                  .
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <GlobalFooter />
    </div>
  )
}
