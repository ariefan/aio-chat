/**
 * Centralized Enum Mappings
 *
 * This utility provides consistent Indonesian labels and styling for all database enums.
 * Use this instead of hardcoded mappings throughout the UI.
 *
 * @example
 * ```tsx
 * import { getStatusLabel, getStatusColor } from '@/lib/utils/enum-mappings'
 *
 * <span className={getStatusColor('member', status)}>
 *   {getStatusLabel('member', status)}
 * </span>
 * ```
 */

// ============================================================================
// BPJS MEMBER STATUS
// ============================================================================

export const BPJS_MEMBER_STATUS = {
  active: { label: 'Aktif', color: 'green', description: 'Keanggotaan aktif' },
  inactive: { label: 'Tidak Aktif', color: 'gray', description: 'Keanggotaan tidak aktif' },
  suspended: { label: 'Ditangguhkan', color: 'yellow', description: 'Keanggotaan ditangguhkan' },
} as const

export type BpjsMemberStatus = keyof typeof BPJS_MEMBER_STATUS

// ============================================================================
// BPJS DEBT STATUS
// ============================================================================

export const BPJS_DEBT_STATUS = {
  active: { label: 'Aktif', color: 'blue', description: 'Tunggakan aktif' },
  partial: { label: 'Sebagian', color: 'yellow', description: 'Dibayar sebagian' },
  paid: { label: 'Lunas', color: 'green', description: 'Sudah lunas' },
  overdue: { label: 'Jatuh Tempo', color: 'red', description: 'Telah melewati jatuh tempo' },
  written_off: { label: 'Dihapusbukukan', color: 'gray', description: 'Dihapus dari pembukuan' },
} as const

export type BpjsDebtStatus = keyof typeof BPJS_DEBT_STATUS

// ============================================================================
// USER STATUS
// ============================================================================

export const USER_STATUS = {
  pending: { label: 'Menunggu', color: 'yellow', description: 'Menunggu verifikasi' },
  verified: { label: 'Terverifikasi', color: 'blue', description: 'Akun sudah diverifikasi' },
  active: { label: 'Aktif', color: 'green', description: 'Akun aktif' },
  inactive: { label: 'Tidak Aktif', color: 'gray', description: 'Akun tidak aktif' },
} as const

export type UserStatus = keyof typeof USER_STATUS

// ============================================================================
// CONVERSATION STATUS
// ============================================================================

export const CONVERSATION_STATUS = {
  pending: { label: 'Menunggu', color: 'yellow', description: 'Menunggu penugasan' },
  active: { label: 'Aktif', color: 'green', description: 'Percakapan aktif' },
  closed: { label: 'Ditutup', color: 'gray', description: 'Percakapan ditutup' },
  archived: { label: 'Diarsipkan', color: 'blue', description: 'Percakapan diarsipkan' },
} as const

export type ConversationStatus = keyof typeof CONVERSATION_STATUS

// ============================================================================
// MESSAGE STATUS
// ============================================================================

export const MESSAGE_STATUS = {
  pending: { label: 'Pending', color: 'yellow', description: 'Menunggu dikirim' },
  sent: { label: 'Terkirim', color: 'green', description: 'Berhasil terkirim' },
  delivered: { label: 'Tersampaikan', color: 'blue', description: 'Tersampaikan ke penerima' },
  read: { label: 'Dibaca', color: 'green', description: 'Sudah dibaca' },
  failed: { label: 'Gagal', color: 'red', description: 'Gagal terkirim' },
  cancelled: { label: 'Dibatalkan', color: 'gray', description: 'Pesan dibatalkan' },
} as const

export type MessageStatus = keyof typeof MESSAGE_STATUS

// ============================================================================
// PLATFORM TYPE
// ============================================================================

export const PLATFORM_TYPE = {
  whatsapp: { label: 'WhatsApp', shortLabel: 'WA', color: 'green', description: 'Platform WhatsApp' },
  telegram: { label: 'Telegram', shortLabel: 'TG', color: 'blue', description: 'Platform Telegram' },
  email: { label: 'Email', shortLabel: 'Email', color: 'gray', description: 'Platform Email' },
} as const

export type PlatformType = keyof typeof PLATFORM_TYPE

// ============================================================================
// OPERATOR ROLE
// ============================================================================

export const OPERATOR_ROLE = {
  admin: { label: 'Admin', color: 'purple', description: 'Administrator sistem' },
  operator: { label: 'Operator', color: 'blue', description: 'Operator chat' },
} as const

export type OperatorRole = keyof typeof OPERATOR_ROLE

// ============================================================================
// AUTOMATION STATUS
// ============================================================================

export const AUTOMATION_STATUS = {
  draft: { label: 'Draft', color: 'gray', description: 'Belum aktif' },
  active: { label: 'Aktif', color: 'green', description: 'Sedang berjalan' },
  paused: { label: 'Jeda', color: 'yellow', description: 'Dijeda sementara' },
  disabled: { label: 'Nonaktif', color: 'red', description: 'Dinonaktifkan' },
} as const

export type AutomationStatus = keyof typeof AUTOMATION_STATUS

// ============================================================================
// DOCUMENT STATUS
// ============================================================================

export const DOCUMENT_STATUS = {
  draft: { label: 'Draft', color: 'gray', description: 'Dokumen draft' },
  published: { label: 'Terbit', color: 'green', description: 'Sudah diterbitkan' },
  archived: { label: 'Diarsipkan', color: 'blue', description: 'Dokumen diarsipkan' },
} as const

export type DocumentStatus = keyof typeof DOCUMENT_STATUS

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export const DOCUMENT_TYPE = {
  faq: { label: 'FAQ', color: 'blue', description: 'Frequently Asked Questions' },
  policy: { label: 'Kebijakan', color: 'purple', description: 'Dokumen kebijakan' },
  manual: { label: 'Panduan', color: 'green', description: 'Dokumen panduan' },
  procedure: { label: 'Prosedur', color: 'yellow', description: 'Dokumen prosedur' },
  general: { label: 'Umum', color: 'gray', description: 'Dokumen umum' },
} as const

export type DocumentType = keyof typeof DOCUMENT_TYPE

// ============================================================================
// BEHAVIORAL PERSONA (PANDAWA)
// ============================================================================

export const PERSONA_CODE = {
  FORGETFUL_PAYER: {
    label: 'Lupa Bayar',
    color: 'yellow',
    description: 'Sering lupa tanggal pembayaran',
    approach: 'Gentle Reminder'
  },
  RELIABLE_PAYER: {
    label: 'Pembayar Terpercaya',
    color: 'green',
    description: 'Selalu bayar tepat waktu',
    approach: 'Maintain Trust'
  },
  FINANCIAL_STRUGGLE: {
    label: 'Kesulitan Finansial',
    color: 'red',
    description: 'Memiliki masalah keuangan',
    approach: 'Rehabilitation Offer'
  },
  HARD_COMPLAINER: {
    label: 'Sering Komplain',
    color: 'orange',
    description: 'Sering mengajukan komplain',
    approach: 'Firm but Professional'
  },
  NEW_MEMBER: {
    label: 'Member Baru',
    color: 'blue',
    description: 'Baru bergabung',
    approach: 'Education First'
  },
  UNKNOWN: {
    label: 'Belum Diketahui',
    color: 'gray',
    description: 'Belum tersegmentasi',
    approach: 'Data Collection'
  },
} as const

export type PersonaCode = keyof typeof PERSONA_CODE

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Indonesian label for a status value
 * @param category - Enum category (e.g., 'member', 'debt', 'user')
 * @param status - Status value
 * @returns Indonesian label
 */
export function getStatusLabel(category: keyof typeof StatusMappings, status: string): string {
  const mapping = StatusMappings[category]?.[status as keyof typeof StatusMappings[typeof category]]
  return mapping?.label || status
}

/**
 * Get color name for a status value
 * @param category - Enum category (e.g., 'member', 'debt', 'user')
 * @param status - Status value
 * @returns Color name (e.g., 'green', 'red', 'yellow')
 */
export function getStatusColor(category: keyof typeof StatusMappings, status: string): string {
  const mapping = StatusMappings[category]?.[status as keyof typeof StatusMappings[typeof category]]
  return mapping?.color || 'gray'
}

/**
 * Get full status configuration
 * @param category - Enum category (e.g., 'member', 'debt', 'user')
 * @param status - Status value
 * @returns Full status configuration object
 */
export function getStatusConfig(
  category: keyof typeof StatusMappings,
  status: string
): { label: string; color: string; description: string } | undefined {
  return StatusMappings[category]?.[status as keyof typeof StatusMappings[typeof category]]
}

/**
 * Get all status values for a category
 * @param category - Enum category (e.g., 'member', 'debt', 'user')
 * @returns Array of all possible status values
 */
export function getStatusValues(category: keyof typeof StatusMappings): string[] {
  const mapping = StatusMappings[category]
  return mapping ? Object.keys(mapping) : []
}

/**
 * Format status with proper label and color className
 * @param category - Enum category (e.g., 'member', 'debt', 'user')
 * @param status - Status value
 * @returns Object with label and className for styling
 */
export function formatStatus(
  category: keyof typeof StatusMappings,
  status: string
): { label: string; className: string } {
  const config = getStatusConfig(category, status)

  if (!config) {
    return {
      label: status,
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const colorClassMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
  }

  return {
    label: config.label,
    className: colorClassMap[config.color] || colorClassMap.gray
  }
}

// ============================================================================
// MASTER MAPPING OBJECT
// ============================================================================

const StatusMappings = {
  member: BPJS_MEMBER_STATUS,
  debt: BPJS_DEBT_STATUS,
  user: USER_STATUS,
  conversation: CONVERSATION_STATUS,
  message: MESSAGE_STATUS,
  platform: PLATFORM_TYPE,
  operatorRole: OPERATOR_ROLE,
  automation: AUTOMATION_STATUS,
  documentStatus: DOCUMENT_STATUS,
  documentType: DOCUMENT_TYPE,
  persona: PERSONA_CODE,
} as const

export default StatusMappings
