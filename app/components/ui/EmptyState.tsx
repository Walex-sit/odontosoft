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
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-[var(--bg-surface)] border border-[var(--border)]/80  rounded-3xl shadow-xs ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/40  flex items-center justify-center mb-4 shadow-2xs">
        {icon || <FolderOpen size={28} />}
      </div>
      <h3 className="text-base sm:text-lg font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-2xl transition-all active:scale-95"
        >
          {actionIcon}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
