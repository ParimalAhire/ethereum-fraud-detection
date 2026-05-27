import { Link, useLocation } from 'react-router-dom'
import { Shield, History, GitCompare, Search } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { to: '/',        label: 'Analyze',  icon: Search },
  { to: '/compare', label: 'Compare',  icon: GitCompare },
  { to: '/history', label: 'History',  icon: History },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="border-b border-dark-500 bg-dark-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Shield className="text-blue-400 w-6 h-6" />
          <span className="font-bold text-white tracking-tight">
            ETH<span className="text-blue-400">Fraud</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === to
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-dark-500'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
