import { useRef, useState } from 'react'
import { useMedia, useUploadMedia, useDeleteMedia } from '../hooks/useMedia'
import { useLocations } from '../hooks/useLocations'
import Badge from '../components/ui/Badge'

const CATEGORIES = [
  'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK',
  'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'ROOMS', 'TEAMS', 'ADDITIONAL',
]

const categoryLabel = (c: string) => c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

export default function MediaManager() {
  const { data: locations = [] } = useLocations()
  const [selectedLocation, setSelectedLocation] = useState('')
  const { data: media = [], isLoading } = useMedia(selectedLocation || undefined)
  const upload = useUploadMedia()
  const deleteMedia = useDeleteMedia()

  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('ADDITIONAL')
  const [filterCategory, setFilterCategory] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selectedLocation) return
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('location_id', selectedLocation)
      fd.append('category', category)
      await upload.mutateAsync(fd)
    }
  }

  const filtered = filterCategory ? media.filter(m => m.category === filterCategory) : media
  const totalSize = media.reduce((s, m) => s + (m.file_size ?? 0), 0)
  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Media Manager</h1>
        {media.length > 0 && (
          <span className="text-sm text-gray-500">{media.length} files · {formatSize(totalSize)}</span>
        )}
      </div>

      <div className="flex gap-3 items-center">
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select location…</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
        </select>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
        {media.length > 0 && (
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!selectedLocation || upload.isPending}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {upload.isPending ? 'Uploading…' : '+ Upload Files'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      {selectedLocation && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-sm text-gray-400">Drag & drop images or videos here, or use the button above</p>
        </div>
      )}

      {!selectedLocation && (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          Select a location to view and upload media
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8 text-gray-400">Loading…</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {item.mime_type?.startsWith('image/') ? (
                  <img
                    src={`/api/v1/media/file/${item.id}`}
                    alt={item.file_name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <span className="text-4xl">🎬</span>
                )}
                <button
                  onClick={() => deleteMedia.mutate(item.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>
                {item.is_synced && (
                  <span className="absolute bottom-2 right-2">
                    <Badge label="Synced" variant="green" />
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-700 truncate font-medium">{item.file_name}</p>
                <p className="text-xs text-gray-400">{categoryLabel(item.category)}</p>
                {item.file_size && <p className="text-xs text-gray-400">{formatSize(item.file_size)}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : media.length > 0 && filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No files in this category
        </div>
      ) : selectedLocation ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No media uploaded yet for this location
        </div>
      ) : null}
    </div>
  )
}
