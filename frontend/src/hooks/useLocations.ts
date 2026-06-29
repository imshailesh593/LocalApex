import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import type { Location } from '../types/api'

export function useLocations() {
  return useQuery<Location[]>({ queryKey: ['locations'], queryFn: () => locationsApi.list().then(r => r.data) })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: object) => locationsApi.create(data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Location created') },
    onError: () => toast.error('Failed to create location'),
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => locationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Location deleted') },
    onError: () => toast.error('Failed to delete location'),
  })
}
