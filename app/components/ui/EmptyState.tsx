'use client'

import React from 'react'
import { FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  actionIcon?: React.ReactNode
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mb-4 shadow-2xs">
        {icon || <FolderOpen size={28} />}
      </div>
      <h3 className="text-base sm:text-lg font-heading font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-2xl shadow-sm shadow-blue-500/25 transition-all active:scale-95"
        >
          {actionIcon}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
