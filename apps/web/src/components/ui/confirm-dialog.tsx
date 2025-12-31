'use client'

import { useState, createContext, useContext, useCallback, ReactNode } from 'react'
import { Button } from '@workspace/ui/src/components/button'
import { AlertTriangle, Trash2, Info } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

type DialogVariant = 'danger' | 'warning' | 'info'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

// =============================================================================
// CONTEXT
// =============================================================================

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    resolvePromise?.(true)
    setResolvePromise(null)
    setOptions(null)
  }, [resolvePromise])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    resolvePromise?.(false)
    setResolvePromise(null)
    setOptions(null)
  }, [resolvePromise])

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50',
      buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-yellow-500',
      bgClass: 'bg-yellow-50',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      icon: Info,
      iconClass: 'text-blue-500',
      bgClass: 'bg-blue-50',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }

  const config = options?.variant ? variantConfig[options.variant] : variantConfig.danger
  const Icon = config.icon

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Confirm Dialog Overlay */}
      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-full ${config.bgClass} flex items-center justify-center mx-auto mb-4`}>
                <Icon className={`h-6 w-6 ${config.iconClass}`} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
                {options.title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-600 text-center mb-6">
                {options.message}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  {options.cancelText || 'Batal'}
                </Button>
                <Button
                  className={`flex-1 ${config.buttonClass}`}
                  onClick={handleConfirm}
                >
                  {options.confirmText || 'Konfirmasi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (context === undefined) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

// =============================================================================
// STANDALONE COMPONENT (for pages without provider)
// =============================================================================

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50',
      buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-yellow-500',
      bgClass: 'bg-yellow-50',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      icon: Info,
      iconClass: 'text-blue-500',
      bgClass: 'bg-blue-50',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full ${config.bgClass} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`h-6 w-6 ${config.iconClass}`} />
          </div>
          <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            {message}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button className={`flex-1 ${config.buttonClass}`} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
