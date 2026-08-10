'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { Search, Send, MoreVertical, Phone, Video, Info, Paperclip, Smile, Mic, CheckCircle2, MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<number | null>(1)
  const [inputText, setInputText] = useState('')

  const chats = [
    { id: 1, name: 'João Silva', avatar: 'JS', lastMsg: 'Tudo bem, nos vemos às 15h.', time: '10:45', unread: 0, online: true },
    { id: 2, name: 'Maria Fernanda', avatar: 'MF', lastMsg: 'Obrigada pelo retorno doutor!', time: 'Ontem', unread: 2, online: false },
    { id: 3, name: 'Roberto Almeida', avatar: 'RA', lastMsg: 'Gostaria de reagendar minha consulta.', time: 'Ontem', unread: 0, online: false },
    { id: 4, name: 'Ana Souza', avatar: 'AS', lastMsg: 'Bom dia. Vocês aceitam plano OdontoPrev?', time: 'Segunda', unread: 0, online: true },
  ]

  const [allMessages, setAllMessages] = useState<Record<number, any[]>>({
    1: [
      { id: 1, text: 'Olá João, lembrando da sua consulta hoje às 15:30.', sender: 'me', time: '10:30', status: 'read' },
      { id: 2, text: 'Tudo bem, nos vemos às 15h. Chegarei um pouco mais cedo.', sender: 'them', time: '10:45', status: '' },
    ],
    2: [
      { id: 1, text: 'Maria, os resultados dos seus exames chegaram.', sender: 'me', time: '14:20', status: 'read' },
      { id: 2, text: 'Obrigada pelo retorno doutor!', sender: 'them', time: 'Ontem', status: '' },
    ],
    3: [
      { id: 1, text: 'Gostaria de reagendar minha consulta.', sender: 'them', time: 'Ontem', status: '' },
    ],
    4: [
      { id: 1, text: 'Bom dia. Vocês aceitam plano OdontoPrev?', sender: 'them', time: 'Segunda', status: '' },
    ]
  })

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
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      
      {/* Coluna Esquerda: Lista de Conversas */}
      <aside className="w-full md:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 z-10">
        
        {/* Header Esquerdo */}
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Mensagens</h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => toast.success('Tela de Nova Conversa iniciada')}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" 
              title="Nova Conversa"
            >
              <MessagePlusIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => toast.info('Menu de Opções Gerais aberto')}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Pesquisar ou começar uma nova conversa" 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Filtros rápidos (Campanhas, Lidas) */}
        <div className="flex gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
          <button className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Todas</button>
          <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors">Não Lidas</button>
          <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors">Campanhas Automáticas</button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => {
            const msgs = allMessages[chat.id] || []
            const lastMsgObj = msgs[msgs.length - 1]
            const displayLastMsg = lastMsgObj ? lastMsgObj.text : chat.lastMsg
            const displayTime = lastMsgObj ? lastMsgObj.time : chat.time

            return (
              <div 
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-none ${activeChat === chat.id ? 'bg-blue-50/80 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                    {chat.avatar}
                  </div>
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{chat.name}</h3>
                    <span className={`text-xs font-semibold ${chat.unread > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{displayTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                      {displayLastMsg}
                    </p>
                    {chat.unread > 0 && (
                      <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ml-2">
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
      <main className="flex-1 flex flex-col h-full bg-[#EFEAE2] dark:bg-slate-950 relative hidden md:flex">
        
        {activeChat && activeChatDetails ? (
          <>
            {/* Header Direito */}
            <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                  {activeChatDetails.avatar}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{activeChatDetails.name}</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {activeChatDetails.online ? 'online' : 'visto por último recentemente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toast.info(`Iniciando chamada de vídeo com ${activeChatDetails.name}...`)}
                  className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => toast.info(`Ligando para ${activeChatDetails.name}...`)}
                  className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                <button 
                  onClick={() => toast.info('Barra de pesquisa do chat aberta')}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => toast.info('Opções do contato abertas')}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2 relative">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-light-pattern-soft-whatsapp-logo-white.jpg")', backgroundSize: 'cover' }}></div>
              
              <div className="text-center my-4 z-10">
                <span className="bg-white dark:bg-slate-800 backdrop-blur text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-lg shadow-sm">HOJE</span>
              </div>

              {currentMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} mb-2 z-10`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative ${msg.sender === 'me' ? 'bg-[#D9FDD3] dark:bg-emerald-900/80 rounded-tr-none text-slate-900 dark:text-slate-100' : 'bg-white dark:bg-slate-800 rounded-tl-none text-slate-900 dark:text-slate-100'}`}>
                    <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] font-semibold text-slate-400">{msg.time}</span>
                      {msg.sender === 'me' && (
                        <CheckCircle2 className={`h-3.5 w-3.5 ${msg.status === 'read' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Footer */}
            <footer className="h-16 px-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <button 
                onClick={() => toast.info('Menu de Emojis')}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
              >
                <Smile className="h-6 w-6" />
              </button>
              <button 
                onClick={() => toast.info('Anexar Arquivo ou Foto')}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus-within:border-blue-400 transition-colors">
                <input 
                  type="text" 
                  placeholder="Digite uma mensagem" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
                />
              </div>

              {inputText.trim() ? (
                <button 
                  onClick={handleSend}
                  className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors shrink-0 shadow-sm"
                >
                  <Send className="h-5 w-5 ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => toast.info('Gravando áudio...')}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
            <div className="h-32 w-32 bg-blue-50 dark:bg-blue-950/50 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="h-12 w-12 text-blue-200 dark:text-blue-500/40" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">Central de Mensagens</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-center max-w-sm">
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