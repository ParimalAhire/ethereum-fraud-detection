import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

function buildHistogram(values, bins = 20) {
  if (!values?.length) return []
  const min = 0, max = 1, step = (max - min) / bins
  const counts = Array(bins).fill(0)
  values.forEach(v => {
    const i = Math.min(Math.floor((v - min) / step), bins - 1)
    counts[i]++
  })
  return counts.map((count, i) => ({
    range: `${(min + i * step).toFixed(2)}`,
    count,
    mid:   min + (i + 0.5) * step,
  }))
}

const TooltipStyle = {
  contentStyle:  { backgroundColor: '#1a1a2e', border: '1px solid #1f2a4a', borderRadius: 8 },
  labelStyle:    { color: '#9ca3af' },
  itemStyle:     { color: '#e5e7eb' },
}

export default function ScoreCharts({ walletScores, edgeScores, targetScore }) {
  const walletValues = walletScores?.map(w => w.ensemble) || []
  const edgeValues   = edgeScores?.map(e => e.score) || []

  const walletHist = buildHistogram(walletValues)
  const edgeHist   = buildHistogram(edgeValues)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Wallet score distribution */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Wallet Score Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={walletHist} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2a4a" />
            <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip {...TooltipStyle} formatter={(v) => [v, 'Count']} />
            <ReferenceLine x="0.50" stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Threshold', fill: '#f59e0b', fontSize: 10 }} />
            {targetScore !== undefined && (
              <ReferenceLine x={targetScore.toFixed(2)} stroke="#fff" strokeDasharray="4 2" label={{ value: 'Target', fill: '#fff', fontSize: 10 }} />
            )}
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {walletHist.map((entry, i) => (
                <Cell key={i} fill={entry.mid > 0.5 ? '#ef4444' : entry.mid > 0.3 ? '#eab308' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Edge score distribution */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Transaction Edge Score Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={edgeHist} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2a4a" />
            <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip {...TooltipStyle} formatter={(v) => [v, 'Count']} />
            <ReferenceLine x="0.50" stroke="#f59e0b" strokeDasharray="4 2" />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {edgeHist.map((entry, i) => (
                <Cell key={i} fill={entry.mid > 0.5 ? '#ef4444' : '#9333ea'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
