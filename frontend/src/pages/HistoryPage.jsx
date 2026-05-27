import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ExternalLink, Clock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getHistory, deleteHistory, analyzeWallet } from '../utils/api'
import RiskBadge from '../components/ui/RiskBadge'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { history, historyLoading, setHistory, setResult } = useStore()

  useEffect(() => {
    getHistory(50).then(res => setHistory(res.data)).catch(console.error)
  }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await deleteHistory(id)
    setHistory(history.filter(h => h.id !== id))
  }

  const handleClick = async (wallet) => {
    try {
      const res = await analyzeWallet(wallet)
      setResult(res.data)
      navigate('/result')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Analysis History</h1>
        <span className="text-gray-400 text-sm">{history.length} records</span>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No analyses yet. Start by analyzing a wallet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map(h => (
            <div
              key={h.id}
              onClick={() => handleClick(h.wallet)}
              className="bg-dark-700 hover:bg-dark-600 border border-dark-500 rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-4"
            >
              <RiskBadge rating={h.risk_rating} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-blue-300 text-sm truncate">{h.wallet}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(h.analyzed_at).toLocaleString()} · {h.total_wallets} wallets · {h.flagged_wallets} flagged
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-sm ${h.combined_risk > 0.6 ? 'text-red-400' : h.combined_risk > 0.3 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {(h.combined_risk * 100).toFixed(1)}%
                </span>
                <button
                  onClick={(e) => handleDelete(h.id, e)}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
