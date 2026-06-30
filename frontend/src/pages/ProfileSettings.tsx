import { useTenant } from '../context/TenantContext'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantApi, authApi, templatesApi, webhooksApi, notificationPrefsApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import type { AuthUser, ResponseTemplate } from '../types/api'

interface Webhook { id: string; url: string; secret: string; events: string; is_active: boolean }

interface NotifPrefs {
  email_review_new: boolean
  email_review_negative: boolean
  email_weekly_digest: boolean
  push_review_new: boolean
  push_review_negative: boolean
}

function NotificationPrefsSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: prefs } = useQuery<NotifPrefs>({
    queryKey: ['notif-prefs'],
    queryFn: () => notificationPrefsApi.get().then(r => r.data),
  })
  const update = useMutation({
    mutationFn: (data: Partial<NotifPrefs>) => notificationPrefsApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-prefs'] }); toast.success('Preferences saved') },
  })

  if (!prefs) return null

  const toggle = (key: keyof NotifPrefs) => update.mutate({ ...prefs, [key]: !prefs[key] })

  const rows: { key: keyof NotifPrefs; label: string; channel: 'Email' | 'Push' }[] = [
    { key: 'email_review_new', label: 'New review received', channel: 'Email' },
    { key: 'email_review_negative', label: 'Negative review (< 3 stars)', channel: 'Email' },
    { key: 'email_weekly_digest', label: 'Weekly digest', channel: 'Email' },
    { key: 'push_review_new', label: 'New review received', channel: 'Push' },
    { key: 'push_review_negative', label: 'Negative review (< 3 stars)', channel: 'Push' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Notification Preferences</h2>
        <p className="text-xs text-gray-400 mt-0.5">Choose which events trigger email and push notifications.</p>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(({ key, label, channel }) => (
          <div key={key} className="flex items-center justify-between py-2.5">
            <div>
              <span className="text-sm text-gray-700">{label}</span>
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                channel === 'Email' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
              }`}>{channel}</span>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefs[key] ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${prefs[key] ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfileSettings() {
  const { tenant, refresh } = useTenant()
  const toast = useToast()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [notifEmail, setNotifEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [brandColor, setBrandColor] = useState('#1d4ed8')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'admin' })
  const [showInvite, setShowInvite] = useState(false)

  const [whForm, setWhForm] = useState({ url: '', events: ['review.new'] })
  const [showWhForm, setShowWhForm] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [localApiKey, setLocalApiKey] = useState<string | null>(null)

  const regenerateApiKey = useMutation({
    mutationFn: () => tenantApi.regenerateApiKey().then(r => r.data as { api_key: string }),
    onSuccess: (data) => {
      setLocalApiKey(data.api_key)
      setApiKeyVisible(true)
      toast.success('API key regenerated')
      refresh()
    },
    onError: () => toast.error('Failed to regenerate key'),
  })

  const { data: hooks = [] } = useQuery<Webhook[]>({
    queryKey: ['webhooks'],
    queryFn: () => webhooksApi.list().then(r => r.data),
  })

  const createHook = useMutation({
    mutationFn: (d: { url: string; events: string[] }) => webhooksApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setShowWhForm(false); setWhForm({ url: '', events: ['review.new'] }); toast.success('Webhook added') },
    onError: () => toast.error('Invalid URL'),
  })
  const deleteHook = useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook removed') },
  })
  const toggleHook = useMutation({
    mutationFn: (id: string) => webhooksApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  })
  const testHook = useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => toast.success('Test payload sent'),
    onError: () => toast.error('Test failed — check the URL'),
  })

  const [tplForm, setTplForm] = useState({ name: '', body: '', tone: 'professional' })
  const [showTplForm, setShowTplForm] = useState(false)
  const [editingTpl, setEditingTpl] = useState<ResponseTemplate | null>(null)

  const { data: users = [] } = useQuery<AuthUser[]>({
    queryKey: ['team-users'],
    queryFn: () => authApi.listUsers().then(r => r.data),
  })

  const { data: templates = [] } = useQuery<ResponseTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then(r => r.data),
  })

  const createTemplate = useMutation({
    mutationFn: (d: { name: string; body: string; tone: string }) => templatesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setShowTplForm(false); setTplForm({ name: '', body: '', tone: 'professional' }); toast.success('Template saved') },
  })

  const updateTemplate = useMutation({
    mutationFn: ({ id, d }: { id: string; d: object }) => templatesApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditingTpl(null); toast.success('Template updated') },
  })

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Template deleted') },
  })

  const inviteUser = useMutation({
    mutationFn: (data: object) => authApi.inviteUser(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-users'] })
      setInviteForm({ name: '', email: '', password: '', role: 'admin' })
      setShowInvite(false)
      toast.success('Team member added')
    },
  })

  const removeUser = useMutation({
    mutationFn: (id: string) => authApi.removeUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-users'] }); toast.success('Member removed') },
  })

  useEffect(() => {
    if (tenant) {
      setName(tenant.business_name)
      setNotifEmail(tenant.notification_email ?? '')
      setLogoUrl(tenant.logo_url ?? '')
      setBrandColor((tenant as { brand_color?: string }).brand_color ?? '#1d4ed8')
    }
  }, [tenant])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await tenantApi.update({ business_name: name, notification_email: notifEmail || null, logo_url: logoUrl || null, brand_color: brandColor })
      await refresh()
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyKey = () => {
    if (tenant?.api_key) {
      navigator.clipboard.writeText(tenant.api_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.new_password !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    if (pwForm.new_password.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwSaving(true)
    try {
      await authApi.changePassword(pwForm.current_password, pwForm.new_password)
      setPwSaved(true)
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      toast.success('Password updated')
      setTimeout(() => setPwSaved(false), 3000)
    } catch {
      setPwError('Current password is incorrect')
    } finally {
      setPwSaving(false)
    }
  }

  const roleColor = (role: string) =>
    role === 'owner' ? 'bg-purple-100 text-purple-700' : role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* Business info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Business Info</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt="Logo" className="h-10 rounded object-contain" />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://yourdomain.com/logo.png" className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Shown in the sidebar header.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                className="h-9 w-16 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
              <input value={brandColor} onChange={e => setBrandColor(e.target.value)}
                placeholder="#1d4ed8" className={`${inputCls} w-36`} />
              <span className="text-xs text-gray-400">Used in review request emails and widgets.</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Notification Email</label>
            <input type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)}
              placeholder="you@business.com" className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Get emailed when a new review is submitted via your funnel.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <div className="flex items-center gap-3">
              <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full capitalize
                ${tenant?.plan_type === 'pro' ? 'bg-purple-100 text-purple-700' : tenant?.plan_type === 'starter' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {tenant?.plan_type ?? '—'}
              </span>
              <a href="/plan" className="text-xs text-brand-600 hover:underline font-medium">
                {tenant?.plan_type === 'free' ? 'Upgrade →' : 'Manage billing →'}
              </a>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-600 truncate">
                {tenant?.api_key}
              </code>
              <button type="button" onClick={handleCopyKey}
                className="text-xs border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Response Templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Response Templates</h2>
          <button onClick={() => { setShowTplForm(true); setEditingTpl(null) }}
            className="text-xs text-brand-600 hover:underline font-medium">
            + New Template
          </button>
        </div>

        {(showTplForm || editingTpl) && (
          <form
            onSubmit={e => {
              e.preventDefault()
              if (editingTpl) {
                updateTemplate.mutate({ id: editingTpl.id, d: tplForm })
              } else {
                createTemplate.mutate(tplForm)
              }
            }}
            className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                <input value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })}
                  placeholder="Positive response" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tone</label>
                <select value={tplForm.tone} onChange={e => setTplForm({ ...tplForm, tone: e.target.value })} className={inputCls}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Response Body</label>
              <textarea value={tplForm.body} onChange={e => setTplForm({ ...tplForm, body: e.target.value })}
                rows={4} required placeholder="Thank you for your wonderful feedback! We're so glad you had a great experience…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowTplForm(false); setEditingTpl(null) }}
                className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
                {editingTpl ? 'Update' : 'Save Template'}
              </button>
            </div>
          </form>
        )}

        {templates.length === 0 && !showTplForm && (
          <p className="text-sm text-gray-400">No templates yet. Create reusable review responses.</p>
        )}

        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{t.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize">{t.tone}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setEditingTpl(t); setTplForm({ name: t.name, body: t.body, tone: t.tone }); setShowTplForm(false) }}
                    className="text-xs text-gray-500 hover:text-brand-600">Edit</button>
                  <button onClick={() => { if (confirm('Delete this template?')) deleteTemplate.mutate(t.id) }}
                    className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Team Members</h2>
          <button onClick={() => setShowInvite(!showInvite)}
            className="text-xs text-brand-600 hover:underline font-medium">
            + Invite Member
          </button>
        </div>

        {showInvite && (
          <form onSubmit={e => { e.preventDefault(); inviteUser.mutate(inviteForm) }}
            className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="John Doe" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="john@example.com" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password</label>
                <input type="password" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="Min 8 chars" className={inputCls} required minLength={8} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className={inputCls}>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowInvite(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={inviteUser.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
                {inviteUser.isPending ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-100">
          {users.map(u => (
            <div key={u.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColor(u.role)}`}>
                  {u.role}
                </span>
                <button
                  onClick={() => { if (confirm(`Remove ${u.name}?`)) removeUser.mutate(u.id) }}
                  className="text-xs text-red-400 hover:text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" value={pwForm.current_password}
              onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
              className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={pwForm.new_password}
              onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
              className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" value={pwForm.confirm}
              onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
              className={inputCls} required />
          </div>
          {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
          {pwSaved && <p className="text-green-600 text-sm">Password updated successfully.</p>}
          <button type="submit" disabled={pwSaving}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-60">
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Webhooks */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Webhooks</h2>
            <p className="text-xs text-gray-400 mt-0.5">POST to external URLs when events happen in LocalApex.</p>
          </div>
          <button onClick={() => setShowWhForm(!showWhForm)}
            className="text-xs text-brand-600 hover:underline font-medium">
            + Add Webhook
          </button>
        </div>

        {showWhForm && (
          <form onSubmit={e => { e.preventDefault(); createHook.mutate(whForm) }}
            className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint URL</label>
              <input type="url" value={whForm.url} onChange={e => setWhForm({ ...whForm, url: e.target.value })}
                placeholder="https://hooks.zapier.com/hooks/catch/…" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Events</label>
              <div className="flex flex-wrap gap-2">
                {['review.new', 'review.responded', 'citation.inconsistent', 'qa.new'].map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whForm.events.includes(ev)}
                      onChange={e => setWhForm(f => ({
                        ...f,
                        events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev)
                      }))}
                      className="rounded border-gray-300"
                    />
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowWhForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={createHook.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
                {createHook.isPending ? 'Adding…' : 'Add Webhook'}
              </button>
            </div>
          </form>
        )}

        {hooks.length === 0 && !showWhForm && (
          <p className="text-sm text-gray-400">No webhooks yet. Connect to Zapier, Slack, or any HTTP endpoint.</p>
        )}

        <div className="space-y-3">
          {hooks.map(h => (
            <div key={h.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono text-gray-700 truncate flex-1">{h.url}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {h.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {h.events.split(',').map(ev => (
                  <code key={ev} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ev.trim()}</code>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => {
                  navigator.clipboard.writeText(h.secret)
                  setCopiedSecret(h.id)
                  setTimeout(() => setCopiedSecret(null), 2000)
                }} className="text-xs text-gray-400 hover:text-gray-600">
                  {copiedSecret === h.id ? 'Secret copied!' : 'Copy secret'}
                </button>
                <button onClick={() => testHook.mutate(h.id)} className="text-xs text-brand-600 hover:underline">Test</button>
                <button onClick={() => toggleHook.mutate(h.id)} className="text-xs text-gray-500 hover:underline">
                  {h.is_active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => { if (confirm('Delete webhook?')) deleteHook.mutate(h.id) }}
                  className="text-xs text-red-400 hover:text-red-600 ml-auto">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">API Key</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Use this key to authenticate requests to the LocalApex REST API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 truncate">
            {apiKeyVisible
              ? (localApiKey ?? tenant?.api_key ?? '—')
              : '••••••••-••••-••••-••••-••••••••••••'}
          </code>
          <button
            onClick={() => setApiKeyVisible(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 border border-gray-200 rounded-lg"
          >
            {apiKeyVisible ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => {
              const key = localApiKey ?? tenant?.api_key ?? ''
              navigator.clipboard.writeText(key)
              setApiKeyCopied(true)
              setTimeout(() => setApiKeyCopied(false), 2000)
            }}
            className="text-xs text-brand-600 hover:underline px-2 py-1.5 border border-brand-200 rounded-lg"
          >
            {apiKeyCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={() => {
            if (confirm('Regenerate the API key? The existing key will stop working immediately.')) {
              regenerateApiKey.mutate()
            }
          }}
          disabled={regenerateApiKey.isPending}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {regenerateApiKey.isPending ? 'Regenerating…' : 'Regenerate key'}
        </button>
      </div>

      {/* Notification Preferences */}
      <NotificationPrefsSection />

      {/* Data & Privacy */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Data & Privacy</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Download a copy of all your account data — locations, reviews, citations, users.
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await tenantApi.exportData()
              const blob = new Blob([res.data as BlobPart], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `localapex-export-${new Date().toISOString().slice(0, 10)}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              toast.success('Export downloaded')
            } catch {
              toast.error('Export failed')
            }
          }}
          className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          Download my data (JSON)
        </button>
      </div>
    </div>
  )
}
