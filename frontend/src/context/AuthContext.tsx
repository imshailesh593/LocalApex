import { createContext, useContext, useState, useCallback } from 'react'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  tenant_id: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function decodeJwtRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? null
  } catch {
    return null
  }
}

function hydrateUser(stored: AuthUser | null, token: string | null): AuthUser | null {
  if (!stored || !token) return stored
  const role = decodeJwtRole(token)
  return role ? { ...stored, role } : stored
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user')
    const parsed = stored ? JSON.parse(stored) : null
    const tok = localStorage.getItem('token')
    return hydrateUser(parsed, tok)
  })
  const [tokenState, setTokenState] = useState<string | null>(token)

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    const role = decodeJwtRole(newToken) ?? newUser.role
    const hydrated = { ...newUser, role }
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(hydrated))
    setTokenState(newToken)
    setUser(hydrated)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setTokenState(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token: tokenState, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
