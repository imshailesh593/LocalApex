import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'
import type { Media } from '../types/api'

export function useMedia(locationId?: string) {
  return useQuery<Media[]>({
    queryKey: ['media', locationId],
    queryFn: () => api.get('/media', { params: locationId ? { location_id: locationId } : {} }).then(r => r.data),
  })
}

export function useUploadMedia() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data as Media),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media'] }); toast.success('File uploaded') },
    onError: () => toast.error('Upload failed'),
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/media/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media'] }); toast.success('File deleted') },
    onError: () => toast.error('Failed to delete file'),
  })
}
