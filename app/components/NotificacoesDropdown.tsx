'use client'

import { useEffect, useRef } from 'react'
import { 
  Calendar, 
  UserPlus, 
  DollarSign, 
  AlertTriangle, 
  X, 
  Bell, 
  ShieldAlert, 
  Package, 
  CheckCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export interface NotificationItem {
  id: string
  type: 'appointment' | 'patient' | 'financial' | 'lgpd' | 'stock' | 'system'
  title: string
  description: string
  time: string
  unread: boolean
  link?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationItem[]
  onMarkAsRead: (id: string) => void
  onClearAll: () => void
}

export default function NotificacoesDropdown({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => n.unread).length

  const getIconConfig = (type: NotificationItem['type']) => {
    switch (type) {
      case 'lgpd':
        return {
          icon: ShieldAlert,
          bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
        }
      case 'stock':
        return {
          icon: Package,
          bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20',
        }
      case 'appointment':
        return {
          icon: Calendar,
          bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
        }
      case 'financial':
        return {
          icon: DollarSign,
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        }
      case 'patient':
        return {
          icon: UserPlus,
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        }
      default:
        return {
          icon: Bell,
          bg: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20',
        }
    }
  }

  return (
    <>
      {/* Backdrop transparente para fechamento em mobile */}
      <div 
        className="fixed inset-0 z-40 sm:hidden"
        onClick={onClose}
      />

      <div
        ref={containerRef}
        className="absolute right-[-70px] sm:right-0 mt-3 w-[320px] sm:w-[400px] rounded-2xl shadow-2xl z-50 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Notificações
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                  </span>
                )}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Marcar como lidas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma notificação</p>
              <p className="text-xs text-slate-400 mt-1">Tudo em dia com a sua clínica!</p>
            </div>
          ) : (
            notifications.map(item => {
              const { icon: Icon, bg } = getIconConfig(item.type)

              const content = (
                <div
                  key={item.id}
                  onClick={() => {
                    onMarkAsRead(item.id)
                    if (item.link) onClose()
                  }}
                  className={`p-4 flex gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer relative ${
                    item.unread ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Unread Indicator */}
                  {item.unread && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600" />
                  )}

                  {/* Icon Wrapper */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          item.unread
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.description}
                    </p>

                    {item.link && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        <span>Ver detalhes</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              )

              if (item.link) {
                return (
                  <Link key={item.id} href={item.link} className="block">
                    {content}
                  </Link>
                )
              }

              return content
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Sistema Operacional
          </span>
          <button 
            onClick={onClearAll}
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar todas
          </button>
        </div>
      </div>
    </>
  )
}
