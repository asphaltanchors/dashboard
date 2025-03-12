'use client'

import * as React from "react"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

const ToastContext = React.createContext<{
  toast: (props: ToastProps) => void
}>({
  toast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    setToasts((prev) => [...prev, props])
    setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center items-center">
        <div className="flex flex-col gap-2 max-w-md">
          {toasts.map((toast, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 shadow-lg ${
                toast.variant === "destructive"
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-900"
              }`}
            >
              {toast.title && (
                <div className="font-semibold">{toast.title}</div>
              )}
              {toast.description && <div>{toast.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => React.useContext(ToastContext)
