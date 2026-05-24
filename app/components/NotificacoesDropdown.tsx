'use client'

import { useEffect, useRef } from 'react'
import { Calendar, UserPlus, DollarSign, AlertCircle, X, Bell } from 'lucide-react'

interface Notification {
  id: string
  type: 'appointment' | 'patient' | 'financial'
  title: string
  description: string
  time: string
  unread: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
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

  return (
    <div
      ref={containerRef}
      className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{
        background: '#131c2e',
        border: '1px solid rgba(148,163,184,0.14)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        top: '100%',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-blue-500" />
          <h3 className="text-sm font-bold" style={{ color: '#f0f4ff' }}>
            Notificações
          </h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
              {unreadCount} novas
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] font-semibold hover:underline"
              style={{ color: '#64748b' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0f4ff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              Marcar todas como lidas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            style={{ color: '#64748b' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800 scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Bell className="h-8 w-8 mb-2 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">Nenhuma notificação por aqui.</p>
            <p className="text-[10px] text-slate-500 mt-1">Tudo limpo e atualizado!</p>
          </div>
        ) : (
          notifications.map(item => {
            const Icon = {
              appointment: Calendar,
              patient: UserPlus,
              financial: DollarSign,
            }[item.type]

            const iconBg = {
              appointment: 'rgba(37,99,235,0.1)',
              patient: 'rgba(16,185,129,0.1)',
              financial: 'rgba(245,158,11,0.1)',
            }[item.type]

            const iconColor = {
              appointment: '#2563eb',
              patient: '#10b981',
              financial: '#f59e0b',
            }[item.type]

            return (
              <div
                key={item.id}
                onClick={() => onMarkAsRead(item.id)}
                className="p-4 flex gap-3 hover:bg-slate-800/40 transition-colors cursor-pointer relative"
                style={{
                  background: item.unread ? 'rgba(37,99,235,0.02)' : 'transparent',
                }}
              >
                {/* Unread Indicator */}
                {item.unread && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}

                {/* Icon Wrapper */}
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: iconBg }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-0.5">
                    <p
                      className="text-xs font-bold truncate"
                      style={{ color: item.unread ? '#f0f4ff' : '#94a3b8' }}
                    >
                      {item.title}
                    </p>
                    <span className="text-[9px] text-slate-500 font-medium shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400 font-medium line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="p-3 text-center border-t"
        style={{ borderColor: 'rgba(148,163,184,0.08)', background: '#101726' }}
      >
        <p className="text-[10px] font-semibold text-slate-500">
          Última atualização: hoje às 14:00
        </p>
      </div>
    </div>
  )
}
