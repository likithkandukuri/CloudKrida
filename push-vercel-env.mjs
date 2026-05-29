#!/usr/bin/env node
/**
 * push-vercel-env.mjs
 *
 * Reads the three VITE_EMAILJS_* variables from .env.local and pushes them
 * to Vercel for all three environments (production, preview, development).
 *
 * Prerequisites:
 *   1. vercel login       — authenticate (browser opens once)
 *   2. vercel link        — link this folder to your Vercel project
 *   3. node push-vercel-env.mjs
 */

import { execSync }  from 'child_process'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Read .env.local ──────────────────────────────────────────────────────────
const envPath = join(__dir, '.env.local')
let raw
try {
  raw = readFileSync(envPath, 'utf8')
} catch {
  console.error('❌  .env.local not found. Run this script from the project root.')
  process.exit(1)
}

const parsed = {}
for (const line of raw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  parsed[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
}

// ── Validate the three EmailJS vars ─────────────────────────────────────────
const REQUIRED = [
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_EMAILJS_TEMPLATE_ID',
  'VITE_EMAILJS_PUBLIC_KEY',
]

const PLACEHOLDERS = [
  'your_service_id_here',
  'your_template_id_here',
  'your_public_key_here',
]

let allGood = true
for (const name of REQUIRED) {
  const val = parsed[name]
  if (!val || PLACEHOLDERS.includes(val)) {
    console.error(`❌  ${name} is missing or still a placeholder in .env.local`)
    allGood = false
  }
}
if (!allGood) {
  console.error('\nFill in the real EmailJS values in .env.local first, then re-run this script.')
  process.exit(1)
}

// ── Push to Vercel ───────────────────────────────────────────────────────────
const ENVS = ['production', 'preview', 'development']

console.log('\n🚀  Pushing EmailJS environment variables to Vercel...\n')

for (const name of REQUIRED) {
  const value = parsed[name]

  // Check if already set — vercel env add will error on duplicates
  let existing = ''
  try {
    existing = execSync(`vercel env ls`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  } catch { /* ignore */ }

  for (const env of ENVS) {
    try {
      // vercel env add NAME ENV < value (pipe the value non-interactively)
      execSync(`vercel env add ${name} ${env}`, {
        input: value + '\n',
        stdio: ['pipe', 'inherit', 'pipe'],
        encoding: 'utf8',
      })
      console.log(`  ✓  ${name}  →  ${env}`)
    } catch (err) {
      const msg = (err.stderr || err.message || '').trim()
      if (msg.includes('already exists')) {
        // Overwrite: remove then re-add
        try {
          execSync(`vercel env rm ${name} ${env} --yes`, { stdio: 'pipe' })
          execSync(`vercel env add ${name} ${env}`, {
            input: value + '\n',
            stdio: ['pipe', 'inherit', 'pipe'],
            encoding: 'utf8',
          })
          console.log(`  ♻  ${name}  →  ${env}  (overwritten)`)
        } catch (e2) {
          console.warn(`  ⚠  ${name}  →  ${env}  failed: ${(e2.stderr || e2.message || '').trim()}`)
        }
      } else {
        console.warn(`  ⚠  ${name}  →  ${env}  failed: ${msg}`)
      }
    }
  }
}

console.log('\n✅  Done. Now run:  vercel --prod\n   (or push to your main branch if auto-deploy is on)\n')
