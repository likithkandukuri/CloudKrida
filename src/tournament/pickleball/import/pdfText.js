// Client-side PDF -> structured text extraction (pdfjs-dist). This is the
// only place pdfjs-dist is touched, and the only "AI" here is none at all —
// pickleballPdfParser.js reads the output of this file with plain
// deterministic pattern matching, no external API of any kind.
//
// pdfjs-dist reports text as individual positioned runs, not rows/columns.
// A tournament plan is fundamentally a set of tables (a team roster grid, a
// court x time schedule grid), and a naive left-to-right join loses exactly
// the information that makes those tables readable — which cell is blank,
// which value belongs to which court. So this keeps each run's x-position
// alongside its text, grouped into lines by y-position, rather than
// collapsing everything into a single string too early. The parser uses
// those x-positions to reconstruct actual table columns (see
// pickleballPdfParser.js's `bucketByColumns`).

let workerConfigured = false

async function configureWorker() {
  if (workerConfigured) return
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
  workerConfigured = true
}

// Bucket raw text runs into lines by rounded y-position (small tolerance for
// sub-pixel baseline jitter within what is visually one printed row), then
// sort each line's runs left-to-right by x. Returns
// [{ text, tokens: [{ x, text }] }, ...] per page — `text` is the plain
// space-joined line (for prose/keyword matching: totals, notes, headings);
// `tokens` keeps each run's x-position (for column/table reconstruction).
function linesFromTextContent(content) {
  const buckets = new Map()
  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue
    const y = Math.round(item.transform[5] / 2) * 2
    const x = item.transform[4]
    if (!buckets.has(y)) buckets.set(y, [])
    buckets.get(y).push({ x, text: item.str.trim() })
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0]) // PDF y grows upward -> descending = top-to-bottom reading order
    .map(([, tokens]) => {
      const sorted = tokens.slice().sort((a, b) => a.x - b.x)
      return { text: sorted.map(t => t.text).join('  '), tokens: sorted }
    })
    .filter(line => line.text)
}

// Returns one array of lines per page (see shape above). Callers that only
// need plain text (nothing table-shaped) can `.map(l => l.text).join('\n')`.
export async function extractPdfPages(file) {
  await configureWorker()
  const pdfjsLib = await import('pdfjs-dist')
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(linesFromTextContent(content))
  }
  return pages
}
