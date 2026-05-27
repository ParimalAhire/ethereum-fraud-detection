import { Loader2 } from 'lucide-react'

const STEPS = [
  'Waking up model...',
  'Fetching transactions (Hop 1/2)...',
  'Fetching transactions (Hop 2/2)...',
  'Building transaction graph...',
  'Running XGBoost inference...',
  'Running GraphSAGE inference...',
  'Computing ensemble scores...',
  'Generating results...',
]

export default function LoadingSteps({ step }) {
  const idx = STEPS.findIndex(s => s === step)

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      <div className="w-full max-w-sm space-y-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i < idx ? 'text-green-400' :
              i === idx ? 'text-white' :
                'text-gray-600'
            }`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i < idx ? 'bg-green-400' :
                i === idx ? 'bg-blue-400 animate-pulse' :
                  'bg-gray-700'
              }`} />
            {s}
          </div>
        ))}
      </div>
      <p className="text-gray-500 text-xs">This may take 30–60 seconds (2-hop graph traversal)</p>
    </div>
  )
}