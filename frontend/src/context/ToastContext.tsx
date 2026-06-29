import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = (id: number) => setToasts(t => t.filter(x => x.id !== id))

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++counter
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => remove(id), 3500)
  }, [])

  const ctx: ToastContextType = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg),
    info: (msg) => push('info', msg),
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm shadow-lg pointer-events-auto
              min-w-[240px] max-w-sm animate-slide-up ${colors[t.type]}`}
          >
            <span className="font-bold text-base leading-none">{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 text-xs ml-1">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
