import { useState } from 'react'
import { useQA, useCreateQA, useUpdateQA, useDeleteQA } from '../hooks/useQA'
import { useLocations } from '../hooks/useLocations'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { qaApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import Badge from '../components/ui/Badge'
import type { QAEntry } from '../types/api'

export default function QAManager() {
  const { data: locations = [] } = useLocations()
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const { data: entries = [], isLoading } = useQA(selectedLocation || undefined)
  const createQA = useCreateQA()
  const updateQA = useUpdateQA()
  const deleteQA = useDeleteQA()
  const qc = useQueryClient()
  const toast = useToast()
  const [suggestingId, setSuggestingId] = useState<string | null>(null)

  const suggestAnswer = useMutation({
    mutationFn: (id: string) => qaApi.suggestAnswer(id).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['qa'] })
      setEditingId(data.id)
      setEditAnswer(data.answer ?? '')
      toast.success('AI answer generated')
    },
    onError: () => toast.error('Failed to generate answer'),
    onSettled: () => setSuggestingId(null),
  })

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ question: '', answer: '', location_id: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAnswer, setEditAnswer] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createQA.mutateAsync({ ...form, location_id: form.location_id || selectedLocation })
    setShowForm(false)
    setForm({ question: '', answer: '', location_id: '' })
  }

  const handlePublish = async (entry: QAEntry) => {
    await updateQA.mutateAsync({ id: entry.id, data: { is_published: !entry.is_published } })
  }

  const handleSaveAnswer = async (id: string) => {
    await updateQA.mutateAsync({ id, data: { answer: editAnswer } })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Q&A Manager</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            + Add Q&A
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <select
              value={form.location_id}
              onChange={e => setForm({ ...form, location_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select location…</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
            <input
              value={form.question}
              onChange={e => setForm({ ...form, question: e.target.value })}
              placeholder="What are your opening hours?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Answer</label>
            <textarea
              value={form.answer}
              onChange={e => setForm({ ...form, answer: e.target.value })}
              placeholder="We're open Mon–Sat, 9am–8pm."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={createQA.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {createQA.isPending ? 'Saving…' : 'Save Q&A'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12 text-gray-400">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No Q&A entries yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{entry.question}</p>
                  {editingId === entry.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editAnswer}
                        onChange={e => setEditAnswer(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveAnswer(entry.id)}
                          className="bg-brand-600 text-white px-3 py-1 rounded text-xs font-medium"
                        >Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">{entry.answer ?? <span className="italic text-gray-400">No answer yet</span>}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.is_auto_answered && <Badge label="AI" variant="blue" />}
                  <Badge label={entry.is_published ? 'Published' : 'Draft'} variant={entry.is_published ? 'green' : 'gray'} />
                  <button
                    onClick={() => {
                      setSuggestingId(entry.id)
                      suggestAnswer.mutate(entry.id)
                    }}
                    disabled={suggestingId === entry.id}
                    className="text-xs text-purple-600 hover:underline disabled:opacity-50"
                  >
                    {suggestingId === entry.id ? 'Generating…' : 'AI Suggest'}
                  </button>
                  <button
                    onClick={() => { setEditingId(entry.id); setEditAnswer(entry.answer ?? '') }}
                    className="text-xs text-gray-500 hover:text-brand-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePublish(entry)}
                    className="text-xs text-gray-500 hover:text-brand-600"
                  >
                    {entry.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this Q&A entry?')) deleteQA.mutate(entry.id) }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
