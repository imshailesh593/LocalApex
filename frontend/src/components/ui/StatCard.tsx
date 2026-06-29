interface StatCardProps {
  label: string
  value: string | number
  icon?: string
  trend?: string
}

export default function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
    </div>
  )
}
