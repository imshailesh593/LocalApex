import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { competitorsApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import type { Competitor } from '../types/api'

export function useCompetitors(locationId?: string) {
  return useQuery<Competitor[]>({
    queryKey: ['competitors', locationId],
    queryFn: () => competitorsApi.list(locationId).then(r => r.data),
  })
}

export function useAddCompetitor() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (data: object) => competitorsApi.add(data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); toast.success('Competitor added') },
    onError: () => toast.error('Failed to add competitor'),
  })
}

export function useDeleteCompetitor() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => competitorsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); toast.success('Competitor removed') },
    onError: () => toast.error('Failed to remove competitor'),
  })
}
