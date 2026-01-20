import { NextRequest, NextResponse } from 'next/server'
import { seedDatabase } from '@/db/seed'

/**
 * POST /api/admin/seed - Seed database with test data
 *
 * This endpoint triggers the database seeding script which creates:
 * - Operators (admin & operator)
 * - Test users with different platforms
 * - Conversations
 * - Sample messages
 * - Message templates
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting database seeding from API...')

    await seedDatabase()

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        operators: 2,
        users: 3,
        conversations: 3,
        messages: 4,
        templates: 3,
      },
    })
  } catch (error) {
    console.error('❌ Failed to seed database:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed database with test data',
    willCreate: {
      operators: '2 (admin & operator)',
      users: '3 test users (2 WhatsApp, 1 Telegram)',
      conversations: '3 active conversations',
      messages: '4 sample messages',
      templates: '3 message templates',
    },
    warning: 'This will CLEAR existing data before seeding!',
  })
}
