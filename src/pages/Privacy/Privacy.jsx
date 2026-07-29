import { motion } from 'framer-motion'
import GlobalNav from '../../shared/components/GlobalNav.jsx'
import GlobalFooter from '../../shared/components/GlobalFooter.jsx'
import Breadcrumb from '../../shared/components/Breadcrumb.jsx'
import { usePageMeta } from '../../shared/utilities/usePageMeta.js'

const SECTIONS = [
  {
    title: 'What We Collect',
    body: [
      'When you submit an enrollment inquiry for Learning Programs, we collect: parent/guardian name, email, and phone (optional); student name and grade; subject of interest; preferred format (online or in-person) and class type (one-on-one or group); and any message you choose to add.',
      'We also store a light/dark theme preference in your browser’s local storage so the site remembers your choice on your next visit. This is a display setting only — it isn’t personal information and isn’t sent to us.',
    ],
  },
  {
    title: 'How We Use It',
    body: [
      'Enrollment information is used only to respond to your inquiry, arrange a free demo class, and run the tutoring sessions you’ve asked about. We don’t use it for advertising, and we don’t send marketing email beyond replying to what you submitted.',
    ],
  },
  {
    title: 'How It’s Stored',
    body: [
      'Enrollment inquiries are stored in a hosted database (Supabase) protected by row-level security. Only the site administrator can read submitted inquiries — the data isn’t publicly accessible, and it isn’t sold, rented, or shared with third parties.',
    ],
  },
  {
    title: 'Children’s Privacy',
    body: [
      'Learning Programs is used by parents and guardians on behalf of a student, not by children directly. All student information (name, grade) is submitted by a parent or guardian through the enrollment form — we do not knowingly collect information directly from a child.',
    ],
  },
  {
    title: 'Your Choices',
    body: [
      'You can ask us for a copy of the information we have on file, ask us to correct it, or ask us to delete it entirely, at any time. Email cloudkrida@gmail.com and we’ll respond promptly.',
    ],
  },
  {
    title: 'Changes to This Policy',
    body: [
      'If this policy changes, the “last updated” date below will change with it. We won’t make a material change to how existing data is used without notice.',
    ],
  },
]

export default function Privacy() {
  usePageMeta({
    title: 'Privacy Policy — Cloud Krida',
    description: 'How Cloud Krida collects, uses, and protects the information submitted through its enrollment and contact forms.',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <GlobalNav />
      <Breadcrumb trail={[{ label: 'Privacy Policy' }]} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '146px 24px 56px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 640, margin: '0 auto' }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--brand-home)', marginBottom: 14, textTransform: 'uppercase' }}>
            Privacy Policy
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 5.5vw, 46px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            How We Handle Your Information
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Last updated: July 13, 2026. This page explains what Cloud Krida collects through its
            forms, why, and how you can control it.
          </p>
        </motion.div>
      </div>

      {/* Sections */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              style={{ padding: '24px 26px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.01em' }}>{s.title}</h2>
              {s.body.map((p, pi) => (
                <p key={pi} style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: pi < s.body.length - 1 ? 10 : 0 }}>
                  {p}
                </p>
              ))}
            </motion.div>
          ))}

          <div style={{ padding: '20px 26px', borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Questions?</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Reach out any time at{' '}
              <a href="mailto:cloudkrida@gmail.com" style={{ color: 'var(--brand-home)', fontWeight: 700 }}>cloudkrida@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>

      <GlobalFooter />
    </div>
  )
}
