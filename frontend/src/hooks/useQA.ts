import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'
import type { QAEntry } from '../types/api'

export function useQA(locationId?: string) {
  return useQuery<QAEntry[]>({
    queryKey: ['qa', locationId],
    queryFn: () => api.get('/qa', { params: locationId ? { location_id: locationId } : {} }).then(r => r.data),
  })
}

export function useCreateQA() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: object) => api.post('/qa', data).then(r => r.data as QAEntry),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qa'] }); toast.success('Q&A entry added') },
    onError: () => toast.error('Failed to add Q&A entry'),
  })
}

export function useUpdateQA() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.patch(`/qa/${id}`, data).then(r => r.data as QAEntry),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qa'] }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteQA() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/qa/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qa'] }); toast.success('Entry deleted') },
    onError: () => toast.error('Failed to delete entry'),
  })
}
