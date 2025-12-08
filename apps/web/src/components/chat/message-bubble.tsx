'use client'

import { Avatar, AvatarFallback, AvatarImage, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@workspace/ui'
import {
  User,
  Bot,
  Check,
  CheckCheck,
  Clock,
  MoreHorizontal,
  Reply,
  Forward,
  Trash2,
  Copy,
  Download,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MessageAttachment {
  id: string
  type: 'image' | 'document' | 'audio' | 'video'
  url: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  thumbnailUrl?: string
  duration?: number
  caption?: string
}

interface Message {
  id: string
  conversationId: string
  content: string
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video'
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  platformMessageId?: string
  platformType: 'telegram' | 'whatsapp' | 'email'
  userId?: string
  operatorId?: string
  attachments?: MessageAttachment[]
  metadata?: Record<string, any>
  isDeleted?: boolean
  editedAt?: string
  replyToMessageId?: string
  replyToMessage?: {
    id: string
    content: string
    messageType: string
  }
  reactions?: Array<{
    emoji: string
    count: number
    userId?: string
  }>
}

interface MessageBubbleProps {
  message: Message
  isGrouped?: boolean
  showTimestamp?: boolean
  showAvatar?: boolean
  onReply?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onCopy?: (content: string) => void
  onDownload?: (attachment: MessageAttachment) => void
  onReact?: (messageId: string, emoji: string) => void
}

export function MessageBubble({
  message,
  isGrouped = false,
  showTimestamp = true,
  showAvatar = true,
  onReply,
  onForward,
  onDelete,
  onCopy,
  onDownload,
  onReact
}: MessageBubbleProps) {
  const isInbound = message.direction === 'inbound'
  const isFailed = message.status === 'failed'
  const isEdited = !!message.editedAt

  // Get status icon for outbound messages
  const getStatusIcon = () => {
    if (!isInbound) {
      switch (message.status) {
        case 'pending':
          return <Clock className="h-3 w-3 text-gray-400" />
        case 'sent':
          return <Check className="h-3 w-3 text-gray-400" />
        case 'delivered':
          return <CheckCheck className="h-3 w-3 text-gray-400" />
        case 'read':
          return <CheckCheck className="h-3 w-3 text-blue-500" />
        case 'failed':
          return <AlertCircle className="h-3 w-3 text-red-500" />
        default:
          return null
      }
    }
    return null
  }

  // Get platform icon
  const getPlatformIcon = () => {
    switch (message.platformType) {
      case 'telegram':
        return <div className="w-3 h-3 bg-blue-500 rounded-full" />
      case 'whatsapp':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />
      case 'email':
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />
      default:
        return null
    }
  }

  // Get attachment icon
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'audio':
        return <Music className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Common emojis for reactions
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡']

  if (message.isDeleted) {
    return (
      <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-2`}>
        <div className="max-w-[70%]">
          <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm italic">
            This message was deleted
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-2 group`}>
      <div className={`flex gap-2 max-w-[70%] ${isInbound ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        {showAvatar && !isGrouped && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src="" />
            <AvatarFallback>
              {isInbound ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message content */}
        <div className="flex flex-col gap-1">
          {/* Reply to message */}
          {message.replyToMessage && (
            <div className="bg-gray-50 border-l-2 border-gray-300 pl-2 py-1 rounded text-sm">
              <p className="text-gray-500 text-xs mb-1">Replying to</p>
              <p className="text-gray-700 truncate">
                {message.replyToMessage.content}
              </p>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`
              relative px-4 py-2 rounded-2xl shadow-sm
              ${isInbound
                ? 'bg-white border border-gray-200 text-gray-900'
                : isFailed
                  ? 'bg-red-50 border border-red-200 text-red-900'
                  : 'bg-blue-500 text-white'
              }
            `}
          >
            {/* Text content */}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg border
                      ${isInbound
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-400 border-blue-300'
                      }
                    `}
                  >
                    {getAttachmentIcon(attachment.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.fileName || attachment.type}
                      </p>
                      {attachment.fileSize && (
                        <p className="text-xs opacity-70">
                          {formatFileSize(attachment.fileSize)}
                        </p>
                      )}
                      {attachment.caption && (
                        <p className="text-sm mt-1">{attachment.caption}</p>
                      )}
                    </div>
                    {onDownload && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownload(attachment)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timestamp and status */}
            {showTimestamp && (
              <div className={`
                flex items-center gap-1 text-xs mt-1
                ${isInbound ? 'text-gray-500' : 'text-blue-100'}
              `}>
                <span>
                  {formatDistanceToNow(new Date(message.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                {getPlatformIcon()}
                {getStatusIcon()}
                {isEdited && <span>(edited)</span>}
              </div>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {message.reactions.map((reaction, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-gray-50"
                  onClick={() => onReact?.(message.id, reaction.emoji)}
                >
                  {reaction.emoji} {reaction.count}
                </Badge>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isInbound ? 'start' : 'end'}>
                {onReply && (
                  <DropdownMenuItem onClick={() => onReply(message.id)}>
                    <Reply className="h-3 w-3 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {onForward && (
                  <DropdownMenuItem onClick={() => onForward(message.id)}>
                    <Forward className="h-3 w-3 mr-2" />
                    Forward
                  </DropdownMenuItem>
                )}
                {onCopy && (
                  <DropdownMenuItem onClick={() => onCopy(message.content)}>
                    <Copy className="h-3 w-3 mr-2" />
                    Copy
                  </DropdownMenuItem>
                )}
                {/* Reactions */}
                <div className="border-t px-2 py-1">
                  <div className="flex gap-1">
                    {commonEmojis.map((emoji) => (
                      <Button
                        key={emoji}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-sm"
                        onClick={() => onReact?.(message.id, emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}