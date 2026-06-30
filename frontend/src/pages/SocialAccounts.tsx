import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zernioApi } from '../api/endpoints'
import { useLocations } from '../hooks/useLocations'
import { useToast } from '../context/ToastContext'

interface ZernioAccount {
  id: string
  platform: string
  label: string
  username: string | null
  display_name: string | null
  zernio_account_id: string
}

interface GbpPost {
  id: string
  platform: string
  label: string
  content: string
  post_type: string
  status: 'scheduled' | 'published' | 'failed'
  scheduled_at: string | null
  created_at: string
  location_id: string | null
}

const PLATFORM_ICONS: Record<string, string> = {
  googlebusiness: '🏢',
  instagram: '📸',
  facebook: '📘',
  linkedin: '💼',
  twitter: '🐦',
  tiktok: '🎵',
  youtube: '▶️',
  pinterest: '📌',
  reddit: '🤖',
  bluesky: '🦋',
  threads: '🧵',
  telegram: '✈️',
  whatsapp: '💬',
  discord: '🎮',
  snapchat: '👻',
}

const statusColor = (s: string) =>
  s === 'published' ? 'text-green-600 bg-green-50' :
  s === 'scheduled' ? 'text-blue-600 bg-blue-50' :
  'text-red-500 bg-red-50'

export default function SocialAccounts() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data: locations = [] } = useLocations()
  const [showComposer, setShowComposer] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('')
  const [form, setForm] = useState({
    zernio_account_id: '',
    content: '',
    platform: 'googlebusiness',
    post_type: 'whats_new',
    scheduled_at: '',
    location_id: '',
  })

  const { data: platforms = [] } = useQuery<{ platform: string; label: string }[]>({
    queryKey: ['zernio-platforms'],
    queryFn: () => zernioApi.platforms().then(r => r.data),
    staleTime: Infinity,
  })

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<ZernioAccount[]>({
    queryKey: ['zernio-accounts'],
    queryFn: () => zernioApi.accounts().then(r => r.data),
  })

  const { data: posts = [] } = useQuery<GbpPost[]>({
    queryKey: ['zernio-posts', platformFilter],
    queryFn: () => zernioApi.posts(platformFilter || undefined).then(r => r.data),
  })

  const getConnectUrl = useMutation({
    mutationFn: (platform: string) => zernioApi.connectUrl(platform).then(r => r.data),
    onSuccess: (data: { connect_url: string }) => {
      window.open(data.connect_url, '_blank', 'width=600,height=700,noopener')
      toast.success('Complete the connection in the popup, then click Sync Accounts.')
    },
    onError: (err: { response?: { data?: { detail?: string } } }) =>
      toast.error(err?.response?.data?.detail ?? 'Failed to get connect URL'),
  })

  const syncAccounts = useMutation({
    mutationFn: () => zernioApi.syncAccounts().then(r => r.data),
    onSuccess: (data: { synced: number; accounts: ZernioAccount[] }) => {
      qc.invalidateQueries({ queryKey: ['zernio-accounts'] })
      toast.success(`Synced ${data.accounts.length} account${data.accounts.length !== 1 ? 's' : ''}`)
    },
    onError: () => toast.error('Sync failed'),
  })

  const disconnectAccount = useMutation({
    mutationFn: (id: string) => zernioApi.disconnect(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zernio-accounts'] }); toast.success('Disconnected') },
  })

  const createPost = useMutation({
    mutationFn: (data: object) => zernioApi.createPost(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zernio-posts'] })
      toast.success('Post scheduled!')
      setShowComposer(false)
      setForm({ zernio_account_id: '', content: '', platform: 'googlebusiness', post_type: 'whats_new', scheduled_at: '', location_id: '' })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) =>
      toast.error(err?.response?.data?.detail ?? 'Failed to create post'),
  })

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.zernio_account_id) { toast.error('Select an account'); return }
    createPost.mutate({
      ...form,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      location_id: form.location_id || null,
    })
  }

  // Filter accounts to ones matching selected platform
  const selectedAccount = accounts.find(a => a.zernio_account_id === form.zernio_account_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Social Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect business profiles and schedule posts across 15 platforms.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncAccounts.mutate()}
            disabled={syncAccounts.isPending}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {syncAccounts.isPending ? 'Syncing…' : '↻ Sync Accounts'}
          </button>
          {accounts.length > 0 && (
            <button
              onClick={() => setShowComposer(!showComposer)}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              + New Post
            </button>
          )}
        </div>
      </div>

      {/* Connect platforms grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Connect Platforms</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {platforms.map(({ platform, label }) => {
            const connected = accounts.filter(a => a.platform === platform)
            return (
              <button
                key={platform}
                onClick={() => getConnectUrl.mutate(platform)}
                disabled={getConnectUrl.isPending}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors relative group"
              >
                <span className="text-2xl">{PLATFORM_ICONS[platform] ?? '🔗'}</span>
                <span className="text-xs text-gray-600 font-medium text-center leading-tight">{label}</span>
                {connected.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                    {connected.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Click a platform to connect via OAuth. After connecting, click "Sync Accounts" to import.</p>
      </div>

      {/* Connected accounts */}
      {accountsLoading ? (
        <div className="py-8 text-center text-gray-400">Loading accounts…</div>
      ) : accounts.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Connected Accounts ({accounts.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-2xl">{PLATFORM_ICONS[a.platform] ?? '🔗'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{a.display_name || a.username || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{a.label} {a.username ? `· @${a.username}` : ''}</p>
                </div>
                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Connected</span>
                <button
                  onClick={() => { if (confirm('Disconnect this account?')) disconnectAccount.mutate(a.id) }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-10 text-center text-gray-400">
          <p className="text-4xl mb-2">🔗</p>
          <p className="font-medium text-gray-600">No accounts connected yet</p>
          <p className="text-sm mt-1">Click a platform above to connect your first account.</p>
        </div>
      )}

      {/* Post composer */}
      {showComposer && (
        <form onSubmit={handlePost} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Compose Post</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
              <select
                value={form.zernio_account_id}
                onChange={e => {
                  const acct = accounts.find(a => a.zernio_account_id === e.target.value)
                  setForm({ ...form, zernio_account_id: e.target.value, platform: acct?.platform ?? form.platform })
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required
              >
                <option value="">Select account…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.zernio_account_id}>
                    {PLATFORM_ICONS[a.platform]} {a.display_name || a.username} ({a.label})
                  </option>
                ))}
              </select>
            </div>
            {selectedAccount?.platform === 'googlebusiness' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Post Type</label>
                <select
                  value={form.post_type}
                  onChange={e => setForm({ ...form, post_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="whats_new">What's New</option>
                  <option value="event">Event</option>
                  <option value="offer">Offer</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule (leave blank to post now)</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Link to Location (optional)</label>
              <select
                value={form.location_id}
                onChange={e => setForm({ ...form, location_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Content
              <span className="text-gray-400 ml-1">({form.content.length}/1500)</span>
            </label>
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={5}
              maxLength={1500}
              placeholder="Share an update, offer, or news about your business…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowComposer(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
            <button type="submit" disabled={createPost.isPending}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {createPost.isPending ? 'Posting…' : form.scheduled_at ? 'Schedule Post' : 'Post Now'}
            </button>
          </div>
        </form>
      )}

      {/* Posts history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Post History</h2>
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
          >
            <option value="">All platforms</option>
            {platforms.map(p => <option key={p.platform} value={p.platform}>{p.label}</option>)}
          </select>
        </div>
        {posts.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No posts yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {posts.map(p => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg shrink-0">{PLATFORM_ICONS[p.platform] ?? '🔗'}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{p.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{p.label}</span>
                        {p.post_type && <span className="text-xs text-gray-400 capitalize">{p.post_type.replace('_', ' ')}</span>}
                        <span className="text-xs text-gray-400">
                          {p.scheduled_at
                            ? `Scheduled ${new Date(p.scheduled_at).toLocaleString()}`
                            : new Date(p.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
