import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield, Zap, Database } from 'lucide-react'
import { analyzeWallet } from '../utils/api'
import { useStore } from '../store/useStore'
import LoadingSteps from '../components/ui/LoadingSteps'

const EXAMPLE_WALLETS = [
  { label: 'Known Fraud',      addr: '0xD882cFc20F52f2599D84b8e8D58C7FB62cfE344b', risk: 'HIGH' },
  { label: 'Tornado Cash',     addr: '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a', risk: 'HIGH' },
  { label: 'ETH Foundation',   addr: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe', risk: 'LOW'  },
  { label: 'Binance Cold',     addr: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', risk: 'LOW'  },
]

export default function Home() {
  const [wallet, setWallet] = useState('')
  const navigate = useNavigate()
  const { loading, error, loadingStep, setLoading, setError, setResult } = useStore()

  const handleAnalyze = async (addr) => {
    const target = addr || wallet
    if (!target.trim()) return

    setLoading(true, 'Waking up model...')

    try {
      const steps = [
        'Fetching transactions (Hop 1/3)...',
        'Fetching transactions (Hop 2/3)...',
        'Fetching transactions (Hop 3/3)...',
        'Building transaction graph...',
        'Running XGBoost inference...',
        'Running GraphSAGE inference...',
        'Computing ensemble scores...',
        'Generating results...',
      ]

      // Simulate progress steps while waiting for API
      let stepIdx = 0
      const interval = setInterval(() => {
        if (stepIdx < steps.length) {
          setLoading(true, steps[stepIdx++])
        }
      }, 6000)

      const res = await analyzeWallet(target.trim())
      clearInterval(interval)
      setResult(res.data)
      navigate('/result')
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Check the wallet address and try again.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <LoadingSteps step={loadingStep} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-6">
          <Shield className="w-4 h-4" />
          XGBoost + GraphSAGE Ensemble
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Ethereum Fraud<br />
          <span className="text-blue-400">Detection</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Analyze any Ethereum wallet using a 3-hop transaction graph and ML ensemble to detect fraudulent activity.
        </p>
      </div>

      {/* Search box */}
      <div className="bg-dark-700 border border-dark-500 rounded-2xl p-6 mb-8">
        <label className="block text-sm text-gray-400 mb-2">Ethereum Wallet Address</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={wallet}
            onChange={e => setWallet(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="0x..."
            className="flex-1 bg-dark-800 border border-dark-500 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={!wallet.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            Analyze
          </button>
        </div>
        {error && (
          <p className="mt-3 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Example wallets */}
      <div className="mb-12">
        <p className="text-gray-500 text-sm mb-3">Try example wallets:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXAMPLE_WALLETS.map(({ label, addr, risk }) => (
            <button
              key={addr}
              onClick={() => handleAnalyze(addr)}
              className="bg-dark-700 hover:bg-dark-600 border border-dark-500 rounded-xl p-3 text-left transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium">{label}</span>
                <span className={`text-xs font-bold ${risk === 'HIGH' ? 'text-red-400' : 'text-green-400'}`}>
                  {risk}
                </span>
              </div>
              <p className="text-gray-500 font-mono text-xs truncate group-hover:text-gray-400">
                {addr}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap,      title: '3-Hop Graph Analysis',  desc: 'Traces transactions across 3 network hops to detect money laundering patterns' },
          { icon: Shield,   title: 'Ensemble ML Model',     desc: 'Combines XGBoost (60%) + GraphSAGE (40%) for high-accuracy fraud detection' },
          { icon: Database, title: 'Cached Results',        desc: 'Previously analyzed wallets return instantly from database cache' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-dark-700 border border-dark-500 rounded-xl p-5">
            <Icon className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
