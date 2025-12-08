'use client'

import { useState, useRef, useCallback } from 'react'
import { Button, Textarea, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@workspace/ui'
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  File,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Plus,
  Hash,
  AtSign,
  Bold,
  Italic,
  Code
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  conversationId: string
  content: string
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video'
  direction: 'outbound'
  status: 'pending'
  timestamp: string
  platformType: 'telegram' | 'whatsapp' | 'email'
  attachments?: Array<{
    id: string
    type: 'image' | 'document' | 'audio' | 'video'
    url: string
    fileName?: string
    fileSize?: number
    mimeType?: string
  }>
}

interface MessageInputProps {
  conversationId: string
  platformType: 'telegram' | 'whatsapp' | 'email'
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export function MessageInput({
  conversationId,
  platformType,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = 'Type a message...',
  maxLength = 4000
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle typing indicator
  const handleTyping = useCallback((value: string) => {
    setMessage(value)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }

    // Typing indicator
    if (value.length > 0) {
      onTypingStart?.()

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop?.()
      }, 1000)
    } else {
      onTypingStop?.()
    }
  }, [onTypingStart, onTypingStop])

  // Send message
  const handleSend = useCallback(async () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled) {
      return
    }

    try {
      const attachments = await Promise.all(
        attachedFiles.map(async (file, index) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('conversationId', conversationId)

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const data = await response.json()
          return {
            id: `attachment_${Date.now()}_${index}`,
            type: getFileType(file.type) as 'image' | 'document' | 'audio' | 'video',
            url: data.url,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }
        })
      )

      onSendMessage({
        conversationId,
        content: message.trim(),
        messageType: attachments.length > 0 ? 'text' : 'text',
        direction: 'outbound',
        platformType,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      // Reset form
      setMessage('')
      setAttachedFiles([])

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      onTypingStop?.()
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  }, [message, attachedFiles, conversationId, platformType, disabled, onSendMessage, onTypingStop])

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files)

    // Check file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024
    const oversizedFiles = newFiles.filter(file => file.size > maxSize)

    if (oversizedFiles.length > 0) {
      toast.error(`Files larger than 10MB are not supported: ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    // Check total number of files (max 10)
    const totalFiles = attachedFiles.length + newFiles.length
    if (totalFiles > 10) {
      toast.error('Maximum 10 files allowed per message')
      return
    }

    setAttachedFiles(prev => [...prev, ...newFiles])
  }, [attachedFiles])

  // Remove attached file
  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Get file type category
  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  // Get file icon
  const getFileIcon = (file: File) => {
    const type = getFileType(file.type)
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'audio':
        return <Music className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Insert emoji
  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newMessage = message.substring(0, start) + emoji + message.substring(end)

    setMessage(newMessage)
    handleTyping(newMessage)

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      textarea.focus()
    }, 0)
  }, [message, handleTyping])

  // Common emojis
  const commonEmojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💑', '👩‍❤️‍👨', '👨‍❤️‍👨', '👩‍❤️‍👩', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💋', '💌', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '✍️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '🧔‍♂️', '🧔‍♀️', '👩', '👱‍♀️', '👱‍♂️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙏', '🙏‍♂️', '🙏‍♀️', '💃', '🕺', '🕴️', '👯', '👯‍♂️', '👯‍♀️', '🚶', '🚶‍♂️', '🚶‍♀️']

  return (
    <div className="border-t bg-background p-4">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              {getFileIcon(file)}
              <div className="max-w-32">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => removeFile(index)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2 items-end">
        {/* Left side actions */}
        <div className="flex gap-1">
          {/* File attachment */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Emoji picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={disabled}>
                <Smile className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <div className="grid grid-cols-8 gap-1 p-2 max-h-64 overflow-y-auto">
                {commonEmojis.slice(0, 64).map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    className="p-1 h-8 w-8 flex items-center justify-center text-lg"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={disabled}>
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => insertEmoji('#')}>
                <Hash className="h-3 w-3 mr-2" />
                Add hashtag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertEmoji('@')}>
                <AtSign className="h-3 w-3 mr-2" />
                Mention user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertEmoji('**bold**')}>
                <Bold className="h-3 w-3 mr-2" />
                Bold text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertEmoji('*italic*')}>
                <Italic className="h-3 w-3 mr-2" />
                Italic text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertEmoji('`code`')}>
                <Code className="h-3 w-3 mr-2" />
                Code block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none pr-12"
          />

          {/* Character count */}
          {maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Voice record / Send button */}
        {message.trim() || attachedFiles.length > 0 ? (
          <Button
            size="sm"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && attachedFiles.length === 0)}
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onMouseDown={() => setIsRecording(true)}
            onMouseUp={() => setIsRecording(false)}
            onMouseLeave={() => setIsRecording(false)}
          >
            <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  )
}