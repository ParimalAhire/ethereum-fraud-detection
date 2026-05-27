import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Clock, Wifi } from 'lucide-react'
import { useStore } from '../store/useStore'
import RiskBadge from '../components/ui/RiskBadge'
import StatCard from '../components/ui/StatCard'
import TransactionGraph from '../components/graph/TransactionGraph'
import ScoreCharts from '../components/charts/ScoreCharts'
import { clearCache } from '../utils/api'

export default function ResultPage() {
  const navigate = useNavigate()
  const { currentResult: r, setResult, setLoading } = useStore()

  if (!r) {
    navigate('/')
    return null
  }

  const handleReanalyze = async () => {
    await clearCache(r.wallet)
    navigate('/')
  }

  const fmt = (n) => typeof n === 'number' ? (n * 100).toFixed(1) + '%' : '—'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-bold text-white font-mono break-all">{r.wallet}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(r.analyzed_at).toLocaleString()}
            </span>
            {r.cached && (
              <span className="flex items-center gap-1 text-blue-400">
                <Wifi className="w-3 h-3" /> Cached result
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge rating={r.risk_rating} score={r.combined_risk} size="lg" />
          <button
            onClick={handleReanalyze}
            className="flex items-center gap-2 bg-dark-600 hover:bg-dark-500 border border-dark-500 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Re-analyze
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="col-span-2"><StatCard label="Own Fraud Score"    value={fmt(r.own_score)}      color={r.own_score > 0.5 ? 'text-red-400' : 'text-green-400'} /></div>
        <div className="col-span-2"><StatCard label="XGBoost Score"      value={fmt(r.xgb_score)}      color="text-blue-400" /></div>
        <div className="col-span-2"><StatCard label="GraphSAGE Score"    value={fmt(r.sage_score)}     color="text-purple-400" /></div>
        <div className="col-span-2"><StatCard label="Flagged Neighbors"  value={fmt(r.frac_flagged)}   color={r.frac_flagged > 0.5 ? 'text-red-400' : 'text-yellow-400'} /></div>
        <div className="col-span-2"><StatCard label="Total Wallets"      value={r.total_wallets.toLocaleString()}  sub="in 3-hop graph" /></div>
        <div className="col-span-2"><StatCard label="Flagged Wallets"    value={r.flagged_wallets.toLocaleString()} color="text-red-400" /></div>
        <div className="col-span-2"><StatCard label="Total Edges"        value={r.total_edges.toLocaleString()} /></div>
        <div className="col-span-2"><StatCard label="Flagged Edges"      value={r.flagged_edges.toLocaleString()} color="text-red-400" /></div>
      </div>

      {/* Transaction Graph */}
      <div>
        <h2 className="text-white font-semibold mb-3">Transaction Graph</h2>
        <TransactionGraph graphData={r.graph_data} wallet={r.wallet} />
      </div>

      {/* Score Charts */}
      <div>
        <h2 className="text-white font-semibold mb-3">Score Distribution</h2>
        <ScoreCharts
          walletScores={r.wallet_scores}
          edgeScores={r.edge_scores}
          targetScore={r.own_score}
        />
      </div>

      {/* Top flagged wallets table */}
      <div>
        <h2 className="text-white font-semibold mb-3">Top Flagged Wallets</h2>
        <div className="bg-dark-700 border border-dark-500 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-500 text-gray-400 text-xs">
                  <th className="text-left px-4 py-3">Address</th>
                  <th className="text-right px-4 py-3">XGBoost</th>
                  <th className="text-right px-4 py-3">GraphSAGE</th>
                  <th className="text-right px-4 py-3">Ensemble</th>
                  <th className="text-right px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {r.wallet_scores?.filter(w => w.ensemble > 0.5).slice(0, 15).map((w, i) => (
                  <tr key={w.address} className={`border-b border-dark-600 hover:bg-dark-600 transition-colors ${w.address.toLowerCase() === r.wallet.toLowerCase() ? 'bg-blue-500/10' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-300">
                      {w.address.toLowerCase() === r.wallet.toLowerCase() && <span className="text-yellow-400 mr-1">⭐</span>}
                      {w.address}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-400">{fmt(w.xgb)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-purple-400">{fmt(w.sage)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: w.ensemble > 0.7 ? '#ef4444' : '#eab308' }}>{fmt(w.ensemble)}</td>
                    <td className="px-4 py-2.5 text-right"><RiskBadge rating={w.ensemble > 0.6 ? 'HIGH' : 'MEDIUM'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
