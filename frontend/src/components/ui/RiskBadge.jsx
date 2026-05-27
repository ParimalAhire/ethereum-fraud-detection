import clsx from 'clsx'

const config = {
  LOW:    { bg: 'bg-green-500/20',  border: 'border-green-500/50',  text: 'text-green-400',  dot: 'bg-green-400'  },
  MEDIUM: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  HIGH:   { bg: 'bg-red-500/20',    border: 'border-red-500/50',    text: 'text-red-400',    dot: 'bg-red-400'    },
}

export default function RiskBadge({ rating, score, size = 'md' }) {
  const c = config[rating] || config.MEDIUM

  if (size === 'lg') {
    return (
      <div className={clsx('inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl border', c.bg, c.border)}>
        <div className="flex items-center gap-2">
          <span className={clsx('w-3 h-3 rounded-full animate-pulse', c.dot)} />
          <span className={clsx('text-2xl font-bold tracking-wider', c.text)}>{rating}</span>
        </div>
        <span className={clsx('text-4xl font-mono font-bold', c.text)}>{(score * 100).toFixed(1)}%</span>
        <span className="text-gray-400 text-xs">Combined Risk Score</span>
      </div>
    )
  }

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold', c.bg, c.border, c.text)}>
      <span className={clsx('w-2 h-2 rounded-full', c.dot)} />
      {rating}
    </span>
  )
}
