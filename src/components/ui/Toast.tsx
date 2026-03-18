import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

let toastFn = null
export function showToast(message, type = 'info') {
  if (toastFn) toastFn({ message, type })
}

export function ToastProvider() {
  const [toast, setToast] = useState(null)
  useEffect(() => { toastFn = setToast }, [])
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) }
  }, [toast])

  if (!toast) return null
  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info }
  const colors = { success: 'text-green', error: 'text-red', warning: 'text-amber', info: 'text-blue' }
  const Icon = icons[toast.type]
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[390px] w-[calc(100%-32px)] bg-surface2 border border-border rounded-[8px] px-4 py-3 flex items-center gap-3 shadow-xl animate-[fadeup_200ms_ease]">
      <Icon size={16} className={colors[toast.type]} />
      <p className="text-text1 text-sm flex-1">{toast.message}</p>
    </div>
  )
}
