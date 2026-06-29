import { useQuery } from '@tanstack/react-query'
import { activityApi } from '../api/endpoints'

interface ActivityItem {
  id: string
  action: string
  entity_type: string | null
  entity_label: string | null
  user_name: string | null
  created_at: string
}

const ENTITY_ICON: Record<string, string> = {
  review: '⭐',
  location: '📍',
  citation: '📋',
  competitor: '🏆',
  qa: '💬',
  media: '🖼️',
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

export default function ActivityLog() {
  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: () => activityApi.list(100).then(r => r.data),
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No activity yet. Actions across your account appear here.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className="text-lg mt-0.5 shrink-0">
                {ENTITY_ICON[item.entity_type ?? ''] ?? '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{item.action}</p>
                {item.user_name && (
                  <p className="text-xs text-gray-400 mt-0.5">by {item.user_name}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
