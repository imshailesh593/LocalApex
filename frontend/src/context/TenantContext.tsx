import { createContext, useContext, useState, useEffect } from 'react'
import { tenantApi } from '../api/endpoints'
import { useAuth } from './AuthContext'
import type { Tenant } from '../types/api'

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  refresh: () => void
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await tenantApi.me()
      setTenant(res.data)
    } catch {
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [token])

  return (
    <TenantContext.Provider value={{ tenant, loading, refresh }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be inside TenantProvider')
  return ctx
}
