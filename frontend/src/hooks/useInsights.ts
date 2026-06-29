import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi } from '../api/endpoints'
import type { InsightSummary } from '../types/api'

export interface TimeseriesPoint {
  date: string
  value: number
}

export function useInsights(locationId?: string) {
  return useQuery<InsightSummary[]>({
    queryKey: ['insights', locationId],
    queryFn: () => insightsApi.summary(locationId).then(r => r.data),
  })
}

export function useInsightTimeseries(metric: string, locationId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery<TimeseriesPoint[]>({
    queryKey: ['insights-ts', metric, locationId, dateFrom, dateTo],
    queryFn: () => insightsApi.timeseries(metric, locationId, dateFrom, dateTo).then(r => r.data),
    enabled: !!metric,
  })
}

export function useRecordInsight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => insightsApi.record(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  })
}

export function useImportInsightCsv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, file }: { locationId: string; file: File }) =>
      insightsApi.importCsv(locationId, file).then(r => r.data as { imported: number; errors: string[] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights'] })
      qc.invalidateQueries({ queryKey: ['insights-ts'] })
    },
  })
}
