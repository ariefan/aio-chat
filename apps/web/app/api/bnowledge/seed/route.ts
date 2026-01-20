import { NextRequest, NextResponse } from 'next/server'
import { seedBPJSKnowledgeBase } from '@/db/seed-bpjs-knowledge'

/**
 * POST /api/knowledge/seed - Seed BPJS knowledge base
 *
 * This endpoint seeds the database with BPJS-specific knowledge base entries
 * migrated from the downloaded constants.ts file
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting BPJS knowledge base seeding from API...')

    await seedBPJSKnowledgeBase()

    return NextResponse.json({
      success: true,
      message: 'BPJS Knowledge Base seeded successfully',
      data: {
        totalEntries: 10,
        categories: ['Pembayaran', 'Autodebet', 'Kepesertaan', 'Program Khusus', 'Teknis Aplikasi', 'Kebijakan'],
      },
    })
  } catch (error) {
    console.error('❌ Failed to seed BPJS knowledge base:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed BPJS knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed BPJS knowledge base',
    willSeed: {
      entries: '10 BPJS-specific knowledge base entries',
      categories: ['Pembayaran (3)', 'Autodebet (2)', 'Kepesertaan (1)', 'Program Khusus/REHAB (1)', 'Teknis Aplikasi (1)', 'Kebijakan (1)'],
    },
    warning: 'This will CLEAR existing knowledge base entries before seeding!',
  })
}
