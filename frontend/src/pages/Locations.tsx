import { useLocations, useCreateLocation, useDeleteLocation } from '../hooks/useLocations'
import DataTable, { Column } from '../components/ui/DataTable'
import NAPEditor from '../components/NAPEditor'
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'
import type { Location } from '../types/api'

export default function Locations() {
  const { data: locations = [], isLoading } = useLocations()
  const createLocation = useCreateLocation()
  const deleteLocation = useDeleteLocation()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState({ store_name: '', address: '', city: '', phone: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/locations/import-csv', fd).then(r => r.data)
    },
    onSuccess: (data: { imported: number; errors: string[] }) => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(`Imported ${data.imported} location${data.imported !== 1 ? 's' : ''}`)
      if (data.errors.length) toast.error(`${data.errors.length} rows skipped`)
    },
    onError: () => toast.error('Import failed'),
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createLocation.mutateAsync(form)
    setShowForm(false)
    setForm({ store_name: '', address: '', city: '', phone: '' })
  }

  const columns: Column<Location>[] = [
    {
      key: 'store_name',
      label: 'Store Name',
      render: (val) => <span className="font-medium text-gray-900">{String(val)}</span>,
    },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'funnel_slug',
      label: 'Funnel',
      render: (val) => val
        ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono">/r/{String(val)}</span>
        : <span className="text-gray-400 text-xs">not set</span>,
    },
    {
      key: 'id',
      label: '',
      render: (_, row) => (
        <div className="flex gap-3">
          <button onClick={() => setEditing(row)} className="text-xs text-brand-600 hover:underline font-medium">
            Edit NAP
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${row.store_name}"?`)) deleteLocation.mutate(row.id) }}
            className="text-xs text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Locations</h1>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && importCsv.mutate(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importCsv.isPending}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {importCsv.isPending ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            + Add Location
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
            {(['store_name', 'address', 'city', 'phone'] as const).map((f) => (
              <input
                key={f}
                placeholder={f.replace('_', ' ')}
                value={form[f]}
                onChange={e => setForm({ ...form, [f]: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required={f === 'store_name' || f === 'address'}
              />
            ))}
            <button type="submit" className="col-span-2 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium">
              Save Location
            </button>
          </form>
        )}

        <DataTable<Location> data={locations} columns={columns} loading={isLoading} />
      </div>

      <NAPEditor location={editing} onClose={() => setEditing(null)} />
    </>
  )
}
