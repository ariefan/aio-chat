import { Badge } from '@workspace/ui/components/badge';
import type { BadgeProps } from '@workspace/ui/components/badge';
import { cn } from '@workspace/ui/lib/utils';

/**
 * Unified status badge component
 * Replaces all hardcoded badge color implementations with a consistent API
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MemberStatus = 'active' | 'inactive' | 'suspended';
export type DebtStatus = 'active' | 'partial' | 'paid' | 'overdue' | 'written_off';
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read' | 'cancelled';
export type UserStatus = 'pending' | 'verified' | 'active' | 'inactive';
export type PlatformType = 'whatsapp' | 'telegram';
export type ConversationStatus = 'active' | 'closed' | 'archived';

export type StatusBadgeType = 'member' | 'debt' | 'message' | 'user' | 'platform' | 'conversation';

// Type-safe status mapping per badge type
type StatusMap = {
  member: MemberStatus;
  debt: DebtStatus;
  message: MessageStatus;
  user: UserStatus;
  platform: PlatformType;
  conversation: ConversationStatus;
};

// Props with proper type inference - accepts string for flexibility with API responses
interface StatusBadgeProps<T extends StatusBadgeType = StatusBadgeType> extends Omit<BadgeProps, 'variant'> {
  status: StatusMap[T] | string | null | undefined;
  type: T;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

const statusConfig: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  // Member statuses
  'member-active': {
    label: 'Aktif',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'member-inactive': {
    label: 'Tidak Aktif',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  'member-suspended': {
    label: 'Ditangguhkan',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },

  // Debt statuses
  'debt-active': {
    label: 'Aktif',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  'debt-partial': {
    label: 'Sebagian',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  'debt-paid': {
    label: 'Lunas',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'debt-overdue': {
    label: 'Jatuh Tempo',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  'debt-written_off': {
    label: 'Dihapusbukukan',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },

  // Message statuses
  'message-pending': {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  'message-sent': {
    label: 'Terkirim',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'message-failed': {
    label: 'Gagal',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  'message-delivered': {
    label: 'Tersampaikan',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  'message-read': {
    label: 'Dibaca',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'message-cancelled': {
    label: 'Dibatalkan',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },

  // User statuses
  'user-pending': {
    label: 'Menunggu',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  'user-verified': {
    label: 'Terverifikasi',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  'user-active': {
    label: 'Aktif',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'user-inactive': {
    label: 'Tidak Aktif',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },

  // Platform types
  'platform-whatsapp': {
    label: 'WA',
    className: 'bg-green-500 text-white border-green-600',
  },
  'platform-telegram': {
    label: 'TG',
    className: 'bg-blue-500 text-white border-blue-600',
  },

  // Conversation statuses
  'conversation-active': {
    label: 'Aktif',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  'conversation-closed': {
    label: 'Ditutup',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  'conversation-archived': {
    label: 'Diarsipkan',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0 h-4',
  md: 'text-xs px-2 py-0.5 h-5',
  lg: 'text-sm px-2.5 py-1 h-6',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StatusBadge - Unified badge component for all status displays
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" type="member" />
 * <StatusBadge status="paid" type="debt" size="sm" />
 * <StatusBadge status="whatsapp" type="platform" />
 * ```
 */
export function StatusBadge<T extends StatusBadgeType>({
  status,
  type,
  size = 'md',
  className,
  ...props
}: StatusBadgeProps<T>) {
  // Handle null/undefined gracefully
  if (status === null || status === undefined || status === '') {
    return (
      <Badge
        className={cn('bg-gray-100 text-gray-600', sizeClasses[size], className)}
        {...props}
      >
        -
      </Badge>
    );
  }

  const configKey = `${type}-${status}`;
  const config = statusConfig[configKey];

  if (!config) {
    // Don't spam console in production, just render gracefully
    if (process.env.NODE_ENV === 'development') {
      console.warn(`StatusBadge: Unknown status "${status}" for type "${type}"`);
    }
    return (
      <Badge
        className={cn('bg-gray-100 text-gray-800', sizeClasses[size], className)}
        {...props}
      >
        {String(status)}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        config.className,
        sizeClasses[size],
        'font-medium border',
        className
      )}
      {...props}
    >
      {config.label}
    </Badge>
  );
}

// ============================================================================
// HELPER FUNCTIONS FOR LEGACY SUPPORT
// ============================================================================

/**
 * Get status badge for member - maintains backward compatibility
 * @deprecated Use <StatusBadge status={status} type="member" /> instead
 */
export function getMemberStatusBadge(status: MemberStatus) {
  return <StatusBadge status={status} type="member" />;
}

/**
 * Get status badge for debt - maintains backward compatibility
 * @deprecated Use <StatusBadge status={status} type="debt" /> instead
 */
export function getDebtStatusBadge(status: DebtStatus) {
  return <StatusBadge status={status} type="debt" />;
}

/**
 * Get status badge for message - maintains backward compatibility
 * @deprecated Use <StatusBadge status={status} type="message" /> instead
 */
export function getMessageStatusBadge(status: MessageStatus) {
  return <StatusBadge status={status} type="message" />;
}

/**
 * Get platform badge - maintains backward compatibility
 * @deprecated Use <StatusBadge status={platform} type="platform" /> instead
 */
export function getPlatformBadge(platform: PlatformType) {
  return <StatusBadge status={platform} type="platform" size="sm" />;
}
