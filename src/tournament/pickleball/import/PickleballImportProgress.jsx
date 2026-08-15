const STEPS = [
  { key: 'upload', label: 'Upload', icon: '📄' },
  { key: 'analyze', label: 'Analyze', icon: '🔎' },
  { key: 'review', label: 'Review', icon: '📋' },
  { key: 'validate', label: 'Validate', icon: '✓' },
  { key: 'create', label: 'Create', icon: '🏓' },
]

// The wizard's five-stage indicator (spec: Upload -> Analyze -> Review ->
// Validate -> Create). "Validate" isn't a separate wizard step the user
// clicks through — it's continuous, re-run on every edit within Review — so
// it's shown as active for the whole time the reviewer is on the review
// screen, distinct from "create" which only lights up once they've actually
// pressed the final confirm button.
export default function PickleballImportProgress({ currentStep }) {
  const order = ['upload', 'analyze', 'review', 'validate', 'create']
  const currentIndex = order.indexOf(currentStep)

  return (
    <div className="pb-import-progress">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming'
        return (
          <div key={step.key} className={`pb-import-progress-step pb-import-progress-step--${state}`}>
            <div className="pb-import-progress-dot">{state === 'done' ? '✓' : step.icon}</div>
            <div className="pb-import-progress-label">{step.label}</div>
            {i < STEPS.length - 1 && <div className="pb-import-progress-line" />}
          </div>
        )
      })}
    </div>
  )
}
