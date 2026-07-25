'use client'

import { useCallback, useRef, useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  strictDelete?: boolean
  entityType?: string
  entityName?: string
  confirmationPhrase?: string
}

export function useConfirmDialog() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    setOptions(nextOptions)
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
    })
  }, [])

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const dialog = options ? (
    <ConfirmDialog
      open
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      tone={options.tone}
      strictDelete={options.strictDelete}
      entityType={options.entityType}
      entityName={options.entityName}
      confirmationPhrase={options.confirmationPhrase}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, confirmDialog: dialog }
}
