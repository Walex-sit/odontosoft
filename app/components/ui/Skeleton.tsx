'use client'

import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-xl ${className}`}
      {...props}
    />
  )
}

export function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="w-full divide-y divide-slate-100 dark:divide-slate-800/80">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 bg-slate-200/80 dark:bg-slate-800/80 rounded-md"
              style={{
                width: c === 0 ? '25%' : c === 1 ? '20%' : c === cols - 1 ? '12%' : '15%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 shadow-2xs animate-pulse"
        >
          <div className="h-10 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="h-10 w-12 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  )
}
