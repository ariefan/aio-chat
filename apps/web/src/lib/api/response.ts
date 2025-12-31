/**
 * Standardized API Response Utility
 *
 * Provides consistent response format across all API endpoints
 */

import { NextResponse } from 'next/server'

// =============================================================================
// TYPES
// =============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: string
    field?: string
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

export type ErrorCode = keyof typeof ERROR_CODES

// =============================================================================
// ERROR MESSAGES (Indonesian)
// =============================================================================

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'Permintaan tidak valid',
  UNAUTHORIZED: 'Autentikasi diperlukan',
  FORBIDDEN: 'Anda tidak memiliki akses ke resource ini',
  NOT_FOUND: 'Resource tidak ditemukan',
  CONFLICT: 'Data sudah ada',
  VALIDATION_ERROR: 'Data tidak valid',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan, silakan coba lagi nanti',
  UNPROCESSABLE_ENTITY: 'Data tidak dapat diproses',
  INTERNAL_ERROR: 'Terjadi kesalahan pada server',
  SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia',
  DATABASE_ERROR: 'Kesalahan database',
  EXTERNAL_SERVICE_ERROR: 'Kesalahan layanan eksternal',
}

const HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  RATE_LIMIT_EXCEEDED: 429,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
}

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

/**
 * Return a successful response with data
 */
export function apiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse['meta']
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return NextResponse.json(response)
}

/**
 * Return a successful response with pagination
 */
export function apiPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiSuccessResponse<T[]>> {
  return apiSuccess(data, {
    page,
    limit,
    total,
    hasMore: page * limit < total,
  })
}

/**
 * Return a successful created response (201)
 */
export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>, { status: 201 })
}

/**
 * Return a successful no-content response (204)
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

/**
 * Return a standardized error response
 */
export function apiError(
  code: ErrorCode,
  customMessage?: string,
  details?: string,
  field?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ERROR_CODES[code],
      message: customMessage || ERROR_MESSAGES[code],
    },
  }

  if (details && process.env.NODE_ENV !== 'production') {
    response.error.details = details
  }

  if (field) {
    response.error.field = field
  }

  return NextResponse.json(response, { status: HTTP_STATUS[code] })
}

// Convenience error functions
export const badRequest = (message?: string, field?: string) =>
  apiError('BAD_REQUEST', message, undefined, field)

export const unauthorized = (message?: string) =>
  apiError('UNAUTHORIZED', message)

export const forbidden = (message?: string) =>
  apiError('FORBIDDEN', message)

export const notFound = (resource = 'Resource') =>
  apiError('NOT_FOUND', `${resource} tidak ditemukan`)

export const conflict = (message?: string) =>
  apiError('CONFLICT', message)

export const validationError = (message: string, field?: string) =>
  apiError('VALIDATION_ERROR', message, undefined, field)

export const internalError = (error?: Error) =>
  apiError('INTERNAL_ERROR', undefined, error?.message)

export const databaseError = (error?: Error) =>
  apiError('DATABASE_ERROR', undefined, error?.message)

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Wrap API handler with standardized error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error: unknown) => {
    console.error('API Error:', error)

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('not found')) {
        return notFound()
      }
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return conflict('Data sudah ada')
      }
      if (error.message.includes('foreign key')) {
        return badRequest('Data terkait tidak valid')
      }
    }

    return internalError(error instanceof Error ? error : undefined)
  })
}

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validate required fields and return error if missing
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse<ApiErrorResponse> | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return validationError(`Field '${field}' wajib diisi`, field)
    }
  }
  return null
}

/**
 * Parse and validate request body
 */
export async function parseBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ data: T | null; error: NextResponse<ApiErrorResponse> | null }> {
  try {
    const data = await request.json() as T
    return { data, error: null }
  } catch {
    return {
      data: null,
      error: badRequest('Invalid JSON body'),
    }
  }
}
