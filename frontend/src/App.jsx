import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/ui/Navbar'
import Home from './pages/Home'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import ComparePage from './pages/ComparePage'
import { warmup } from './utils/api'

export default function App() {
  // Warm up backend silently on page load
  useEffect(() => { warmup() }, [])

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/result"  element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </div>
  )
}
