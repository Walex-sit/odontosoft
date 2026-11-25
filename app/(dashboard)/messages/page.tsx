'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { Search, Send, MoreVertical, Phone, Video, Info, Paperclip, Smile, Mic, CheckCircle2, MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  // Conversas serão carregadas do Supabase (tabela mensagens) em iteração futura.
  const chats: { id: number; name: string; avatar: string; lastMsg: string; time: string; unread: number; online: boolean }[] = []

  const [activeChat, setActiveChat] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  // Mensagens serão carregadas do Supabase em iteração futura.
  const [allMessages, setAllMessages] = useState<Record<number, { id: number; text: string; sender: string; time: string; status: string }[]>>({})

  const currentMessages = activeChat ? (allMessages[activeChat] || []) : []
  const activeChatDetails = chats.find(c => c.id === activeChat)

  const handleSend = () => {
    if (!inputText.trim() || !activeChat) return

    const newMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    }

    setAllMessages(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMessage]
    }))
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] overflow-hidden relative">
      
      {/* Coluna Esquerda: Lista de Conversas */}
      <aside className="w-full md:w-96 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col h-full shrink-0 z-10">
        
        {/* Header Esquerdo */}
        <div className="h-16 px-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-base)] dark:bg-[var(--bg-surface)]">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Mensagens</h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => toast.success('Tela de Nova Conversa iniciada')}
              className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors" 
              title="Nova Conversa"
            >
              <MessagePlusIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => toast.info('Menu de Opções Gerais aberto')}
              className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="p-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-xl px-4 py-2 border border-[var(--border)]  focus-within:border-[var(--primary)]/40 focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all">
            <Search className="h-4 w-4 text-[var(--text-muted)] mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Pesquisar ou começar uma nova conversa" 
              className="bg-transparent border-none outline-none text-sm w-full text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium"
            />
          </div>
        </div>

        {/* Filtros rápidos (Campanhas, Lidas) */}
        <div className="flex gap-2 px-4 py-2 border-b border-[var(--border)] shrink-0 overflow-x-auto no-scrollbar">
          <button className="bg-[var(--primary-subtle)] text-[var(--primary)] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Todas</button>
          <button className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] hover:bg-[var(--border)] dark:hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors">Não Lidas</button>
          <button className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] hover:bg-[var(--border)] dark:hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors">Campanhas Automáticas</button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <MessageSquare className="h-10 w-10 text-[var(--text-secondary)] mb-3" />
              <p className="text-sm font-bold text-[var(--text-muted)]">Nenhuma conversa ainda</p>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-1">As mensagens dos pacientes aparecerão aqui após integração com WhatsApp/SMS.</p>
            </div>
          ) : chats.map(chat => {
            const msgs = allMessages[chat.id] || []
            const lastMsgObj = msgs[msgs.length - 1]
            const displayLastMsg = lastMsgObj ? lastMsgObj.text : chat.lastMsg
            const displayTime = lastMsgObj ? lastMsgObj.time : chat.time

            return (
              <div 
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[var(--border)]/60 last:border-none ${activeChat === chat.id ? 'bg-[var(--primary-subtle)]' : 'hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)]'}`}
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-[var(--primary-subtle)]  flex items-center justify-center text-[var(--primary)] font-bold shrink-0">
                    {chat.avatar}
                  </div>
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-[var(--bg-surface)] dark:border-[var(--border)] rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">{chat.name}</h3>
                    <span className={`text-xs font-semibold ${chat.unread > 0 ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>{displayTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)] font-medium'}`}>
                      {displayLastMsg}
                    </p>
                    {chat.unread > 0 && (
                      <div className="h-5 w-5 bg-[var(--primary)] rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--on-primary)] shrink-0 ml-2">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Coluna Direita: Chat Ativo */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] relative hidden md:flex">
        
        {activeChat && activeChatDetails ? (
          <>
            {/* Header Direito */}
            <header className="h-16 px-6 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-[var(--primary-subtle)]  flex items-center justify-center text-[var(--primary)] font-bold shrink-0">
                  {activeChatDetails.avatar}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">{activeChatDetails.name}</h2>
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {activeChatDetails.online ? 'online' : 'visto por último recentemente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toast.info(`Iniciando chamada de vídeo com ${activeChatDetails.name}...`)}
                  className="text-[var(--text-muted)] hover:text-[var(--primary)]  transition-colors"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => toast.info(`Ligando para ${activeChatDetails.name}...`)}
                  className="text-[var(--text-muted)] hover:text-[var(--primary)]  transition-colors"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-[var(--border)] dark:bg-[var(--bg-surface)]"></div>
                <button 
                  onClick={() => toast.info('Barra de pesquisa do chat aberta')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => toast.info('Opções do contato abertas')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2 relative">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-light-pattern-soft-whatsapp-logo-white.jpg")', backgroundSize: 'cover' }}></div>
              
              <div className="text-center my-4 z-10">
                <span className="bg-[var(--bg-surface)]  text-[var(--text-secondary)] text-xs font-bold px-3 py-1 rounded-lg shadow-sm">HOJE</span>
              </div>

              {currentMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} mb-2 z-10`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm dark:shadow-none relative ${msg.sender === 'me' ? 'bg-[var(--success-bg)] border border-[var(--success)]/30 rounded-tr-none text-[var(--text-primary)]' : 'bg-[var(--bg-surface)] border border-[var(--border)] rounded-tl-none text-[var(--text-primary)]'}`}>
                    <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] font-semibold text-[var(--text-muted)]">{msg.time}</span>
                      {msg.sender === 'me' && (
                        <CheckCircle2 className={`h-3.5 w-3.5 ${msg.status === 'read' ? 'text-[var(--primary)] ' : 'text-[var(--text-muted)]'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Footer */}
            <footer className="h-16 px-4 bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border-t border-[var(--border)] flex items-center gap-3 shrink-0">
              <button 
                onClick={() => toast.info('Menu de Emojis')}
                className="p-2 text-[var(--text-muted)] hover:bg-[var(--border)] dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors shrink-0"
              >
                <Smile className="h-6 w-6" />
              </button>
              <button 
                onClick={() => toast.info('Anexar Arquivo ou Foto')}
                className="p-2 text-[var(--text-muted)] hover:bg-[var(--border)] dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors shrink-0"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl px-4 py-2.5 focus-within:border-[var(--primary)]/40 transition-colors">
                <input 
                  type="text" 
                  placeholder="Digite uma mensagem" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none outline-none text-sm w-full text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium"
                />
              </div>

              {inputText.trim() ? (
                <button 
                  onClick={handleSend}
                  className="p-2 bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors shrink-0 shadow-sm"
                >
                  <Send className="h-5 w-5 ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => toast.info('Gravando áudio...')}
                  className="p-2 text-[var(--text-muted)] hover:bg-[var(--border)] dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors shrink-0"
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-l border-[var(--border)]">
            <div className="h-32 w-32 bg-[var(--primary-subtle)] rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="h-12 w-12 text-[var(--primary)] /40" />
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">Central de Mensagens</h2>
            <p className="text-[var(--text-muted)] font-medium text-center max-w-sm">
              Selecione uma conversa ao lado ou inicie um novo chat para interagir com seus pacientes.
            </p>
          </div>
        )}
      </main>

    </div>
  )
}

function MessagePlusIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <line x1="9" y1="10" x2="15" y2="10"></line>
      <line x1="12" y1="7" x2="12" y2="13"></line>
    </svg>
  )
}