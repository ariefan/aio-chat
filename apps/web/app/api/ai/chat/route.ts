import { NextRequest, NextResponse } from 'next/server'
import { performRAGSearch, addSearchFeedback } from '@/lib/ai/rag-service'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      message,
      platformType = 'telegram',
      options = {},
      feedback
    } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Get or create user for this platform
    // For demo purposes, we'll use the session user's ID
    // In a real implementation, you'd identify the user by their platform ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Perform RAG search and generate response
    const result = await performRAGSearch(
      message,
      user.id,
      platformType,
      {
        maxResults: options.maxResults || 5,
        minRelevanceScore: options.minRelevanceScore || 0.7,
        documentTypes: options.documentTypes || [],
        categories: options.categories || [],
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      }
    )

    // Add feedback if provided
    if (feedback && typeof feedback === 'number' && feedback >= 1 && feedback <= 5) {
      await addSearchFeedback(result.sessionId, feedback)
    }

    return NextResponse.json({
      success: true,
      response: result.answer,
      sessionId: result.sessionId,
      retrievedDocuments: result.retrievedDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        relevanceScore: doc.relevanceScore,
        // Don't return full content in API response, just metadata
      })),
      tokenUsage: result.tokenUsage,
      processingTime: result.processingTime,
      model: result.model,
    })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, feedback } = body

    if (!sessionId || !feedback) {
      return NextResponse.json(
        { error: 'sessionId and feedback are required' },
        { status: 400 }
      )
    }

    if (typeof feedback !== 'number' || feedback < 1 || feedback > 5) {
      return NextResponse.json(
        { error: 'Feedback must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    await addSearchFeedback(sessionId, feedback)

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully'
    })

  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      {
        error: 'Failed to record feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}