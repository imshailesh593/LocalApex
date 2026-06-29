import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewsApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import type { Review } from '../types/api'

interface ReviewFilters {
  location_id?: string
  is_routed?: boolean
  status?: string
  min_rating?: number
  max_rating?: number
  page?: number
  per_page?: number
}

interface ReviewStats {
  total: number
  suppressed: number
  pending: number
  unread: number
  avg_rating: number | null
}

export function useReviews(filters?: ReviewFilters) {
  return useQuery<Review[]>({
    queryKey: ['reviews', filters],
    queryFn: () => reviewsApi.list(filters).then(r => r.data),
  })
}

export function useReviewStats() {
  return useQuery<ReviewStats>({
    queryKey: ['review-stats'],
    queryFn: () => reviewsApi.stats().then(r => r.data),
    refetchInterval: 60000,
  })
}

export function useGenerateReviewResponse() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => reviewsApi.generateResponse(id).then(r => r.data as { ai_response: string }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews'] }); toast.success('AI response generated') },
    onError: () => toast.error('Failed to generate response — check your AI API key'),
  })
}
