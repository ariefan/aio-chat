"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Phone, Video, MoreVertical } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (text: string) => void
  isLoading: boolean
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText)
      setInputText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-[#efe7dd] relative font-sans">
      {/* WhatsApp-like Header */}
      <div className="h-14 bg-[#008069] flex items-center px-4 shrink-0 z-10 shadow-md text-white">
        <div className="flex items-center flex-1 gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#008069] overflow-hidden border border-white/20">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Logo_BPJS_Kesehatan.png"
              alt="RICH"
              className="w-full h-full object-cover p-1"
            />
          </div>
          <div className="flex flex-col">
            <h2 className="font-semibold text-[15px] leading-tight">RICH BPJS</h2>
            <span className="text-[11px] opacity-90 text-white/80">Official Business Account</span>
          </div>
        </div>
        <div className="flex items-center gap-4 opacity-90">
          <Video size={20} />
          <Phone size={20} />
          <MoreVertical size={20} />
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundRepeat: 'repeat',
        }}
      >
        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
          <div
            key={idx}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[14px] leading-relaxed shadow-sm relative ${
                msg.role === 'user'
                  ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                  : 'bg-white text-slate-900 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              <div
                className={`text-[10px] mt-1 text-right flex justify-end items-center gap-1 opacity-60 ${
                  msg.role === 'user' ? 'text-slate-600' : 'text-slate-500'
                }`}
              >
                {formatTime()}
                {msg.role === 'user' && (
                  <span className="text-blue-500 font-bold">&#10003;&#10003;</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 bg-[#f0f2f5] flex items-center gap-2 shrink-0">
        <div className="flex-1 bg-white rounded-full border-none px-4 py-2 flex items-center shadow-sm">
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-[15px] text-slate-800 placeholder:text-slate-500"
            placeholder="Ketik pesan"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#008069] text-white hover:bg-[#006d59] disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  )
}
