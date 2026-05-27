export default function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-dark-700 border border-dark-500 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
