import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

interface GBPPhoto {
  name: string
  media_format: string
  category: string
  google_url: string
  thumbnail_url: string
  create_time: string
  view_count: number | null
}

const CATEGORIES = [
  { value: 'COVER', label: 'Cover' },
  { value: 'PROFILE', label: 'Profile' },
  { value: 'LOGO', label: 'Logo' },
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'FOOD_AND_DRINK', label: 'Food & Drink' },
  { value: 'MENU', label: 'Menu' },
  { value: 'ADDITIONAL', label: 'Additional' },
]

export default function GBPPhotos() {
  const { id: locationId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const toast = useToast()
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('ADDITIONAL')
  const [uploading, setUploading] = useState(false)

  const { data: photos = [], isLoading } = useQuery<GBPPhoto[]>({
    queryKey: ['gbp-photos', locationId],
    queryFn: () => api.get(`/gbp/locations/${locationId}/photos`).then(r => r.data),
  })

  const deletePhoto = useMutation({
    mutationFn: (mediaName: string) =>
      api.delete(`/gbp/locations/${locationId}/photos/${encodeURIComponent(mediaName)}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gbp-photos', locationId] }); toast.success('Photo deleted from Google') },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Delete failed'),
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      // 1. Upload file to LocalApex media endpoint to get a public URL
      const fd = new FormData()
      fd.append('file', file)
      const mediaRes = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const publicUrl = `${window.location.origin}/api/v1/media/file/${mediaRes.data.id}`

      // 2. Push that URL to GBP
      await api.post(`/gbp/locations/${locationId}/photos`, {
        source_url: publicUrl,
        category,
        media_format: 'PHOTO',
      })
      qc.invalidateQueries({ queryKey: ['gbp-photos', locationId] })
      toast.success('Photo uploaded to Google Business Profile ✓')
      setShowUpload(false)
      setFile(null)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Google Photos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Photos on your Google Business Profile listing</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/locations/${locationId}`} className="text-sm text-gray-400 hover:text-gray-600 self-center">← Location</Link>
          <button onClick={() => setShowUpload(!showUpload)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
            + Upload Photo
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Upload to Google Business Profile</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Photo</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpload} disabled={!file || uploading}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Upload to Google'}
            </button>
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : photos.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="font-medium text-gray-600">No photos on your GBP listing</p>
          <p className="text-sm mt-1">Upload photos to make your listing more attractive to customers.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{photos.length} photos on Google</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(photo => (
              <div key={photo.name} className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                <img src={photo.thumbnail_url || photo.google_url} alt=""
                  className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex flex-col items-center justify-center gap-2">
                  <a href={photo.google_url} target="_blank" rel="noopener noreferrer"
                    className="bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg">View on Google</a>
                  <button onClick={() => { if (confirm('Delete from Google?')) deletePhoto.mutate(photo.name) }}
                    className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg">Delete</button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium">{photo.category?.replace('_', ' ')}</p>
                  {photo.view_count && <p className="text-white/70 text-xs">{photo.view_count} views</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
