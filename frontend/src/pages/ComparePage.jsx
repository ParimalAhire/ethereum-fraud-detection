import { useState } from 'react'
import { compareWallets } from '../utils/api'
import { useStore } from '../store/useStore'
import RiskBadge from '../components/ui/RiskBadge'
import ScoreCharts from '../components/charts/ScoreCharts'
import TransactionGraph from '../components/graph/TransactionGraph'
import { Loader2, ArrowLeftRight } from 'lucide-react'

function WalletInput({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0x..."
        className="w-full bg-dark-800 border border-dark-500 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  )
}

function CompareColumn({ result, label }) {
  if (!result) return null
  const fmt = n => (n * 100).toFixed(1) + '%'
  return (
    <div className="flex-1 space-y-4">
      <div className="bg-dark-700 border border-dark-500 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="font-mono text-blue-300 text-xs break-all mb-3">{result.wallet}</p>
        <div className="flex justify-center mb-4">
          <RiskBadge rating={result.risk_rating} score={result.combined_risk} size="lg" />
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['Own Score',          fmt(result.own_score),      result.own_score > 0.5 ? 'text-red-400' : 'text-green-400'],
            ['XGBoost',            fmt(result.xgb_score),      'text-blue-400'],
            ['GraphSAGE',          fmt(result.sage_score),     'text-purple-400'],
            ['Flagged Neighbors',  fmt(result.frac_flagged),   result.frac_flagged > 0.5 ? 'text-red-400' : 'text-yellow-400'],
            ['Total Wallets',      result.total_wallets,       'text-white'],
            ['Flagged Wallets',    result.flagged_wallets,     'text-red-400'],
          ].map(([label, value, color]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className={`font-mono font-semibold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <TransactionGraph graphData={result.graph_data} wallet={result.wallet} />
      <ScoreCharts walletScores={result.wallet_scores} edgeScores={result.edge_scores} targetScore={result.own_score} />
    </div>
  )
}

export default function ComparePage() {
  const [walletA, setWalletA] = useState('')
  const [walletB, setWalletB] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const { compareResult, setCompare } = useStore()

  const handleCompare = async () => {
    if (!walletA.trim() || !walletB.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await compareWallets(walletA.trim(), walletB.trim())
      setCompare(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Compare Wallets</h1>

      {/* Input row */}
      <div className="bg-dark-700 border border-dark-500 rounded-2xl p-6 mb-8">
        <div className="flex items-end gap-4 flex-wrap">
          <WalletInput label="Wallet A" value={walletA} onChange={setWalletA} />
          <ArrowLeftRight className="w-5 h-5 text-gray-500 mb-3 flex-shrink-0" />
          <WalletInput label="Wallet B" value={walletB} onChange={setWalletB} />
          <button
            onClick={handleCompare}
            disabled={loading || !walletA.trim() || !walletB.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            Compare
          </button>
        </div>
        {error && <p className="mt-3 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
      </div>

      {/* Results side by side */}
      {compareResult && (
        <div className="flex gap-6 flex-wrap md:flex-nowrap">
          <CompareColumn result={compareResult.wallet_a} label="Wallet A" />
          <CompareColumn result={compareResult.wallet_b} label="Wallet B" />
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-16 text-gray-400 gap-4">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p>Analyzing both wallets — this may take up to 2 minutes...</p>
        </div>
      )}
    </div>
  )
}
